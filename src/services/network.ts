import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'node:http';
import { app } from 'electron';
import { v7 as uuidv7 } from 'uuid';
import qrcode from 'qrcode';
import { getDatabase } from '../db/connection';
import { DeviceSessionRepository, SyncQueueRepository, ConflictLogRepository, AuditLogRepository } from '../repositories/system';
import { AuthService, TokenPayload } from './auth';
import pino from 'pino';

const logger = pino({ name: 'service:network' });

interface ConnectedDevice {
  socket: Socket;
  deviceSession: any;
  user: TokenPayload;
  lastPing: number;
}

export class NetworkService {
  private io: SocketIOServer | null = null;
  private httpServer: any = null;
  private deviceRepo = new DeviceSessionRepository();
  private syncRepo = new SyncQueueRepository();
  private conflictRepo = new ConflictLogRepository();
  private auditRepo = new AuditLogRepository();
  private authService = new AuthService();
  private connectedDevices = new Map<string, ConnectedDevice>();
  private port: number = 0;
  private isEnabled = false;

  async start(port: number = 0): Promise<{ port: number; url: string; qrCode: string }> {
    if (this.io) {
      throw new Error('Network service already running');
    }

    this.port = port || await this.findFreePort();
    this.httpServer = createServer();
    this.io = new SocketIOServer(this.httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    this.setupSocketHandlers();
    this.httpServer.listen(this.port, '0.0.0.0');

    const networkInterfaces = require('node:os').networkInterfaces();
    let localIp = '127.0.0.1';
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces as any[]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
    }

    const url = `http://${localIp}:${this.port}`;
    const qrCode = await qrcode.toDataURL(url);

    this.isEnabled = true;
    logger.info({ port: this.port, url }, 'Network service started');

    return { port: this.port, url, qrCode };
  }

  async stop(): Promise<void> {
    if (!this.io) return;

    for (const [deviceId, device] of this.connectedDevices) {
      device.socket.disconnect(true);
    }
    this.connectedDevices.clear();

    await new Promise<void>((resolve) => {
      this.httpServer!.close(() => resolve());
    });

    this.io.close();
    this.io = null;
    this.httpServer = null;
    this.isEnabled = false;
    logger.info('Network service stopped');
  }

  private setupSocketHandlers(): void {
    this.io!.on('connection', (socket: Socket) => {
      logger.debug({ socketId: socket.id }, 'New socket connection');

      socket.on('authenticate', async (data: { token: string; deviceId: string; deviceName: string; platform: string }, callback) => {
        try {
          const payload = this.authService.verifyAccessToken(data.token);
          if (!payload) {
            callback({ success: false, error: 'Invalid or expired token' });
            return;
          }

          const deviceSession = this.deviceRepo.register({
            user_id: payload.userId,
            device_id: data.deviceId,
            device_name: data.deviceName,
            platform: data.platform,
          });

          this.connectedDevices.set(data.deviceId, {
            socket,
            deviceSession,
            user: payload,
            lastPing: Date.now(),
          });

          socket.join(`user:${payload.userId}`);
          socket.join(`device:${data.deviceId}`);

          const pendingSync = this.syncRepo.findPending(deviceSession.id);
          callback({
            success: true,
            deviceSessionId: deviceSession.id,
            pendingSync: pendingSync.length,
          });

          logger.info({ deviceId: data.deviceId, userId: payload.userId }, 'Device authenticated');
        } catch (error) {
          callback({ success: false, error: error instanceof Error ? error.message : 'Authentication failed' });
        }
      });

      socket.on('sync:push', async (data: { operations: Array<{ operation: string; entityType: string; entityId: string; payload: Record<string, unknown> }> }, callback) => {
        const device = this.getDeviceBySocket(socket);
        if (!device) {
          callback({ success: false, error: 'Not authenticated' });
          return;
        }

        const results = [];
        for (const op of data.operations) {
          const syncItem = this.syncRepo.addToQueue({
            device_session_id: device.deviceSession.id,
            operation: op.operation as any,
            entity_type: op.entityType,
            entity_id: op.entityId,
            payload: op.payload,
          });
          results.push({ entityId: op.entityId, syncId: syncItem.id, status: 'queued' });
        }

        this.processSyncQueue(device.deviceSession.id);
        callback({ success: true, results });
      });

      socket.on('sync:pull', async (data: { since?: string }, callback) => {
        const device = this.getDeviceBySocket(socket);
        if (!device) {
          callback({ success: false, error: 'Not authenticated' });
          return;
        }

        const pending = this.syncRepo.findPending(device.deviceSession.id);
        callback({ success: true, operations: pending });
      });

      socket.on('sync:ack', async (data: { syncIds: string[] }, callback) => {
        for (const syncId of data.syncIds) {
          this.syncRepo.markSynced(syncId);
        }
        callback({ success: true });
      });

      socket.on('conflict:resolve', async (data: { syncId: string; resolution: 'server_wins' | 'client_wins' | 'manual' }, callback) => {
        const device = this.getDeviceBySocket(socket);
        if (!device) {
          callback({ success: false, error: 'Not authenticated' });
          return;
        }

        this.conflictRepo.resolveConflict(data.syncId, data.resolution, device.user.userId);
        callback({ success: true });
      });

      socket.on('ping', (callback) => {
        const device = this.getDeviceBySocket(socket);
        if (device) {
          device.lastPing = Date.now();
          this.deviceRepo.updateSync(device.deviceSession.device_id);
        }
        callback({ success: true, timestamp: Date.now() });
      });

      socket.on('disconnect', (reason) => {
        const device = this.getDeviceBySocket(socket);
        if (device) {
          this.connectedDevices.delete(device.deviceSession.device_id);
          logger.info({ deviceId: device.deviceSession.device_id, reason }, 'Device disconnected');
        }
      });
    });
  }

  private getDeviceBySocket(socket: Socket): ConnectedDevice | null {
    for (const device of this.connectedDevices.values()) {
      if (device.socket.id === socket.id) {
        return device;
      }
    }
    return null;
  }

  private async processSyncQueue(deviceSessionId: string): Promise<void> {
    const pending = this.syncRepo.findPending(deviceSessionId);
    const device = Array.from(this.connectedDevices.values()).find(d => d.deviceSession.id === deviceSessionId);
    if (!device) return;

    for (const item of pending) {
      try {
        await this.applyOperation(item);
        this.syncRepo.markSynced(item.id);
        device.socket.emit('sync:applied', { syncId: item.id, entityId: item.entity_id });
      } catch (error) {
        logger.error({ syncId: item.id, error }, 'Failed to apply sync operation');
        this.syncRepo.markConflict(item.id);
        device.socket.emit('sync:conflict', { syncId: item.id, entityId: item.entity_id });
      }
    }
  }

  private async applyOperation(item: any): Promise<void> {
    const payload = JSON.parse(item.payload);
    const db = getDatabase();

    switch (item.operation) {
      case 'create':
        const createCols = Object.keys(payload).join(', ');
        const createPlaceholders = Object.keys(payload).map(() => '?').join(', ');
        const createValues = Object.values(payload);
        db.prepare(`INSERT INTO ${item.entity_type} (${createCols}) VALUES (${createPlaceholders})`).run(...createValues);
        break;
      case 'update':
        const updateSets = Object.keys(payload).map(k => `${k} = ?`).join(', ');
        const updateValues = [...Object.values(payload), item.entity_id];
        db.prepare(`UPDATE ${item.entity_type} SET ${updateSets} WHERE id = ?`).run(...updateValues);
        break;
      case 'delete':
        db.prepare(`UPDATE ${item.entity_type} SET deleted_at = ? WHERE id = ?`).run(new Date().toISOString(), item.entity_id);
        break;
    }
  }

  private async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.listen(0, () => {
        const port = (server.address() as any).port;
        server.close(() => resolve(port));
      });
      server.on('error', reject);
    });
  }

  getStatus(): { enabled: boolean; port: number; connectedDevices: number; url?: string } {
    if (!this.isEnabled) {
      return { enabled: false, port: 0, connectedDevices: 0 };
    }
    return {
      enabled: true,
      port: this.port,
      connectedDevices: this.connectedDevices.size,
    };
  }

  getConnectedDevices(): Array<{ deviceId: string; deviceName: string; platform: string; userId: string; lastSync: number }> {
    return Array.from(this.connectedDevices.values()).map(d => ({
      deviceId: d.deviceSession.device_id,
      deviceName: d.deviceSession.device_name,
      platform: d.deviceSession.platform,
      userId: d.user.userId,
      lastSync: d.lastPing,
    }));
  }

  broadcastToUser(userId: string, event: string, data: any): void {
    this.io?.to(`user:${userId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: any): void {
    this.io?.emit(event, data);
  }

  sendToDevice(deviceId: string, event: string, data: any): boolean {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      device.socket.emit(event, data);
      return true;
    }
    return false;
  }
}

export const networkService = new NetworkService();