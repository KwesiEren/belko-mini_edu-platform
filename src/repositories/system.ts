import { BaseRepository } from './base';
import { BackupRecord, BackupSchedule, AuditLog, Setting, DeviceSession, SyncQueue, ConflictLog } from '../types/database';
import { getDatabase, runInTransaction } from '../db/connection';
import pino from 'pino';

const logger = pino({ name: 'repository:system' });

export class BackupRecordRepository extends BaseRepository<BackupRecord> {
  protected tableName = 'backup_records';
  protected primaryKey = 'id';
  protected columns = ['filename', 'file_path', 'file_size', 'checksum', 'type', 'status', 'error_message', 'completed_at', 'created_at', 'updated_at'];

  findRecent(limit = 50): BackupRecord[] {
    return this.findAll({ orderBy: 'created_at', orderDir: 'DESC', limit });
  }

  findByType(type: BackupRecord['type']): BackupRecord[] {
    return this.findAll({ where: { type }, orderBy: 'created_at', orderDir: 'DESC' });
  }

  getLastSuccessful(): BackupRecord | null {
    return this.findAll({ where: { status: 'completed' }, orderBy: 'completed_at', orderDir: 'DESC', limit: 1 })[0] || null;
  }

  markCompleted(id: string, checksum: string, fileSize: number): BackupRecord | null {
    return this.update(id, {
      status: 'completed',
      checksum,
      file_size: fileSize,
      completed_at: this.getNow(),
    });
  }

  markFailed(id: string, error: string): BackupRecord | null {
    return this.update(id, {
      status: 'failed',
      error_message: error,
    });
  }

  getTotalSize(): number {
    const row = this.db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM backup_records WHERE status = "completed"').get() as { total: number };
    return row.total;
  }

  cleanupOld(retentionDaily: number, retentionMonthly: number): number {
    const now = new Date();
    const dailyCutoff = new Date(now.getTime() - retentionDaily * 24 * 60 * 60 * 1000).toISOString();
    const monthlyCutoff = new Date(now.getTime() - retentionMonthly * 30 * 24 * 60 * 60 * 1000).toISOString();

    const toDelete = this.db.prepare(`
      SELECT id FROM backup_records
      WHERE status = "completed"
      AND created_at < ?
      AND (
        (type = "auto" AND created_at < ?)
        OR type IN ("manual", "pre_migration", "pre_import")
      )
    `).all(dailyCutoff, monthlyCutoff) as { id: string }[];

    if (toDelete.length === 0) return 0;

    const ids = toDelete.map(t => t.id);
    const placeholders = ids.map(() => '?').join(',');

    const result = runInTransaction(() => {
      return this.db.prepare(`DELETE FROM backup_records WHERE id IN (${placeholders})`).run(...ids);
    });

    return result.changes;
  }
}

export class BackupScheduleRepository extends BaseRepository<BackupSchedule> {
  protected tableName = 'backup_schedules';
  protected primaryKey = 'id';
  protected columns = ['frequency', 'time', 'retention_daily', 'retention_monthly', 'is_enabled', 'last_run_at', 'next_run_at'];

  getActive(): BackupSchedule | null {
    return this.findAll({ where: { is_enabled: 1 }, limit: 1 })[0] || null;
  }

  updateNextRun(id: string, nextRunAt: string): BackupSchedule | null {
    return this.update(id, { next_run_at: nextRunAt });
  }

  recordRun(id: string): void {
    const now = this.getNow();
    runInTransaction(() => {
      this.db.prepare('UPDATE backup_schedules SET last_run_at = ?, next_run_at = ? WHERE id = ?').run(now, now, id);
    });
  }
}

export class AuditLogRepository extends BaseRepository<AuditLog> {
  protected tableName = 'audit_logs';
  protected primaryKey = 'id';
  protected columns = ['user_id', 'action', 'entity_type', 'entity_id', 'old_values', 'new_values', 'ip_address', 'user_agent', 'created_at', 'updated_at'];

  log(data: {
    user_id?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
  }): AuditLog {
    return this.create({
      ...data,
      user_id: data.user_id || null,
      old_values: data.old_values ? JSON.stringify(data.old_values) : undefined,
      new_values: data.new_values ? JSON.stringify(data.new_values) : undefined,
    });
  }

  findByEntity(entityType: string, entityId: string): AuditLog[] {
    return this.findAll({ where: { entity_type: entityType, entity_id: entityId }, orderBy: 'created_at', orderDir: 'DESC' });
  }

  findByUser(userId: string, limit = 100): AuditLog[] {
    return this.findAll({ where: { user_id: userId }, orderBy: 'created_at', orderDir: 'DESC', limit });
  }

  findByAction(action: string, limit = 100): AuditLog[] {
    return this.findAll({ where: { action }, orderBy: 'created_at', orderDir: 'DESC', limit });
  }

  exportAll(): AuditLog[] {
    return this.findAll({ orderBy: 'created_at', orderDir: 'DESC' });
  }
}

export class SettingRepository extends BaseRepository<Setting> {
  protected tableName = 'settings';
  protected primaryKey = 'key';
  protected columns = ['value', 'description', 'is_public'];

  get(key: string): Setting | null {
    return this.findById(key);
  }

  set(key: string, value: string, description?: string, isPublic = false): Setting {
    const existing = this.findById(key);
    if (existing) {
      return this.update(key, { value, description, is_public: isPublic })!;
    }
    return this.create({ key, value, description, is_public: isPublic });
  }

  getPublic(): Setting[] {
    return this.findAll({ where: { is_public: 1 } });
  }

  getAll(): Setting[] {
    return this.findAll({});
  }

  delete(key: string): boolean {
    return this.hardDelete(key);
  }
}

export class DeviceSessionRepository extends BaseRepository<DeviceSession> {
  protected tableName = 'device_sessions';
  protected primaryKey = 'id';
  protected columns = ['user_id', 'device_id', 'device_name', 'platform', 'last_sync_at', 'is_active'];

  findByDeviceId(deviceId: string): DeviceSession | null {
    return this.findAll({ where: { device_id: deviceId }, limit: 1 })[0] || null;
  }

  findByUser(userId: string): DeviceSession[] {
    return this.findAll({ where: { user_id: userId }, orderBy: 'last_sync_at', orderDir: 'DESC' });
  }

  register(data: { user_id: string; device_id: string; device_name: string; platform: string }): DeviceSession {
    const existing = this.findByDeviceId(data.device_id);
    if (existing) {
      return this.update(existing.id, {
        device_name: data.device_name,
        platform: data.platform,
        is_active: true,
      })!;
    }
    return this.create({ ...data, is_active: true });
  }

  updateSync(deviceId: string): void {
    runInTransaction(() => {
      this.db.prepare('UPDATE device_sessions SET last_sync_at = ? WHERE device_id = ?').run(this.getNow(), deviceId);
    });
  }

  deactivate(deviceId: string): boolean {
    const result = runInTransaction(() => {
      return this.db.prepare('UPDATE device_sessions SET is_active = 0 WHERE device_id = ?').run(deviceId);
    });
    return result.changes > 0;
  }
}

export class SyncQueueRepository extends BaseRepository<SyncQueue> {
  protected tableName = 'sync_queue';
  protected primaryKey = 'id';
  protected columns = ['device_session_id', 'operation', 'entity_type', 'entity_id', 'payload', 'status', 'conflict_resolution', 'synced_at', 'created_at', 'updated_at'];

  findPending(deviceSessionId: string): SyncQueue[] {
    return this.findAll({ where: { device_session_id: deviceSessionId, status: 'pending' }, orderBy: 'created_at' });
  }

  findConflicts(deviceSessionId: string): SyncQueue[] {
    return this.findAll({ where: { device_session_id: deviceSessionId, status: 'conflict' } });
  }

  addToQueue(data: {
    device_session_id: string;
    operation: SyncQueue['operation'];
    entity_type: string;
    entity_id: string;
    payload: Record<string, unknown>;
  }): SyncQueue {
    return this.create({
      ...data,
      payload: JSON.stringify(data.payload),
      status: 'pending',
    });
  }

  markSynced(id: string): SyncQueue | null {
    return this.update(id, { status: 'synced', synced_at: this.getNow() });
  }

  markConflict(id: string): SyncQueue | null {
    return this.update(id, { status: 'conflict' });
  }

  resolveConflict(id: string, resolution: 'server_wins' | 'client_wins' | 'manual', resolvedBy?: string): ConflictLog | null {
    const queueItem = this.findById(id);
    if (!queueItem) return null;

    const conflict = new ConflictLogRepository().create({
      sync_queue_id: id,
      server_data: queueItem.payload,
      client_data: '', // Would need to be passed in
      resolution,
      resolved_by: resolvedBy,
      resolved_at: this.getNow(),
    });

    this.update(id, { status: 'synced', synced_at: this.getNow(), conflict_resolution: resolution });
    return conflict;
  }
}

export class ConflictLogRepository extends BaseRepository<ConflictLog> {
  protected tableName = 'conflict_logs';
  protected primaryKey = 'id';
  protected columns = ['sync_queue_id', 'server_data', 'client_data', 'resolution', 'resolved_by', 'resolved_at', 'created_at', 'updated_at'];

  findBySyncQueue(syncQueueId: string): ConflictLog[] {
    return this.findAll({ where: { sync_queue_id: syncQueueId } });
  }
}