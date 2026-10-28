import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, screen, session } from 'electron';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { initializeDatabase, closeDatabase, getDatabasePath } from '../db/connection';
import { runMigrations } from '../db/migrations';
import { AuthService } from '../services/auth';
import { BackupService, type BackupOptions } from '../services/backup';
import { NetworkService } from '../services/network';
import { ExportImportService } from '../services/export-import';
import { AuditLogService } from '../services/export-import';
import { SetupService } from '../services/setup';
import { SettingRepository } from '../repositories/system';
import { DomainIpc } from './domains';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { CSP_POLICY } from '../utils/security';

const logger = pino({ name: 'main' }, pinoPretty({ colorize: true }));

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const authService = new AuthService();
const backupService = new BackupService();
const networkService = new NetworkService();
const exportImportService = new ExportImportService();
const auditService = new AuditLogService();
const setupService = new SetupService();

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const appIconPath = join(__dirname, '../../src/assets/icon.png');

  const ses = session.fromPartition('persist:main');
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP_POLICY],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'X-XSS-Protection': ['1; mode=block'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
        'Permissions-Policy': ['camera=(), microphone=(), geolocation=()'],
      },
    });
  });

  mainWindow = new BrowserWindow({
    width: Math.min(1400, width),
    height: Math.min(900, height),
    minWidth: 1024,
    minHeight: 768,
    show: false,
    title: 'Belko Edu-Platform',
    icon: existsSync(appIconPath) ? appIconPath : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8443');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (process.env.NODE_ENV === 'development') {
      mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      if (process.platform === 'darwin') {
        app.dock?.hide();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray(): void {
  const iconPath = join(__dirname, '../../src/assets/icon.png');
  if (!existsSync(iconPath)) {
    logger.warn({ iconPath }, 'Tray icon not found; continuing without a system tray icon');
    return;
  }

  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    logger.warn({ iconPath }, 'Tray icon could not be loaded; continuing without a system tray icon');
    return;
  }

  try {
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
  } catch (error) {
    logger.error({ error }, 'Failed to create tray icon; continuing without a system tray icon');
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Belko',
      click: () => {
        mainWindow?.show();
        if (process.platform === 'darwin') app.dock?.show();
      },
    },
    {
      label: 'Backup Now',
      click: async () => {
        const result = await backupService.createBackup({ type: 'manual' });
        if (result.success) {
          logger.info('Manual backup completed');
        } else {
          logger.error({ error: result.error }, 'Manual backup failed');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Belko Edu-Platform');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    if (process.platform === 'darwin') app.dock?.show();
  });
}

async function initializeApp(): Promise<void> {
  try {
    logger.info('Initializing Belko Edu-Platform');

    const dbPath = getDatabasePath();
    logger.info({ dbPath }, 'Database path');

    initializeDatabase();
    runMigrations();

    await setupIpcHandlers();

    createWindow();
    createTray();

    try {
      const networkStatus = await networkService.start();
      logger.info({ port: networkStatus.port }, 'Network service started');
    } catch (error) {
      logger.error({ error }, 'Network service unavailable; continuing in offline mode');
      void dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        title: 'Local network unavailable',
        message: 'Belko will continue in offline mode.',
        detail: 'Sharing with devices on your local network is unavailable until network access can be enabled.',
      });
    }

    const backupScheduler = backupService.startScheduler();
    backupScheduler.unref();

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.fatal({ error }, 'Failed to initialize application');
    app.quit();
  }
}

async function setupIpcHandlers(): Promise<void> {
  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('app:get-path', (_, name: string) => app.getPath(name as any));

  // Domain surface: setup, dashboard, students, classes, subjects, staff,
  // users, attendance, grades, fees, schools, academic calendar, settings,
  // backups — with session verification, permission checks and Zod validation.
  new DomainIpc(authService, setupService, backupService).register();

  ipcMain.handle('auth:login', async (_, credentials: { email: string; password: string; deviceInfo?: any }) => {
    try {
      const result = await authService.login(credentials.email, credentials.password, credentials.deviceInfo);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  });

  ipcMain.handle('auth:refresh', async (_, refreshToken: string) => {
    try {
      const result = await authService.refreshAccessToken(refreshToken);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Token refresh failed' };
    }
  });

  ipcMain.handle('auth:logout', async (_, sessionId: string) => {
    await authService.logout(sessionId);
    return { success: true };
  });

  ipcMain.handle('auth:verify', async (_, token: string) => {
    const payload = authService.verifyAccessToken(token);
    return { valid: !!payload, payload };
  });

  ipcMain.handle('auth:change-password', async (_, userId: string, currentPassword: string, newPassword: string) => {
    const success = await authService.changePassword(userId, currentPassword, newPassword);
    return { success };
  });

  ipcMain.handle('auth:reset-password', async (_, userId: string, newPassword: string) => {
    const success = await authService.resetPassword(userId, newPassword);
    return { success };
  });

  ipcMain.handle('db:backup', async (_, options: BackupOptions = { type: 'manual' }) => {
    const result = await backupService.createBackup(options);
    return result;
  });

  ipcMain.handle('db:restore', async (_, backupId: string) => {
    const result = await backupService.restoreBackup(backupId);
    return result;
  });

  ipcMain.handle('db:verify-backup', async (_, backupId: string) => {
    const result = await backupService.verifyBackup(backupId);
    return result;
  });

  ipcMain.handle('db:backup-history', async (_, limit?: number) => {
    return backupService.getBackupHistory(limit);
  });

  ipcMain.handle('db:export-backup', async (_, backupId: string, exportPath: string) => {
    return backupService.exportBackup(backupId, exportPath);
  });

  ipcMain.handle('db:import-backup', async (_, importPath: string) => {
    return backupService.importBackup(importPath);
  });

  ipcMain.handle('backup:schedule-get', async () => {
    return backupService.getSchedules();
  });

  ipcMain.handle('backup:schedule-set', async (_, data: any) => {
    return backupService.updateSchedule(data);
  });

  ipcMain.handle('network:start', async (_, port?: number) => {
    return networkService.start(port);
  });

  ipcMain.handle('network:stop', async () => {
    await networkService.stop();
    return { success: true };
  });

  ipcMain.handle('network:status', async () => {
    return networkService.getStatus();
  });

  ipcMain.handle('network:devices', async () => {
    return networkService.getConnectedDevices();
  });

  ipcMain.handle('export:data', async (_, options: any) => {
    try {
      const blob = await exportImportService.exportData(options);
      const arrayBuffer = await blob.arrayBuffer();
      return { success: true, data: Buffer.from(arrayBuffer).toString('base64') };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  ipcMain.handle('export:template', async (_, entityType: string) => {
    try {
      const blob = exportImportService.generateTemplate(entityType);
      const arrayBuffer = await blob.arrayBuffer();
      return { success: true, data: Buffer.from(arrayBuffer).toString('base64') };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Template generation failed' };
    }
  });

  ipcMain.handle('export:full-backup', async () => {
    try {
      const blob = await exportImportService.exportFullBackup();
      const arrayBuffer = await blob.arrayBuffer();
      return { success: true, data: Buffer.from(arrayBuffer).toString('base64') };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Full backup export failed' };
    }
  });

  ipcMain.handle('import:data', async (_, fileData: string, options: any) => {
    try {
      const buffer = Buffer.from(fileData, 'base64');
      const blob = new Blob([buffer]);
      const file = new File([blob], 'import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = await exportImportService.importFromFile(file, options);
      return { ...result, success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
    }
  });

  ipcMain.handle('import:full-backup', async (_, fileData: string) => {
    try {
      const buffer = Buffer.from(fileData, 'base64');
      const blob = new Blob([buffer]);
      const file = new File([blob], 'full-backup.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = await exportImportService.importFullBackup(file);
      return { ...result, success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Full backup import failed' };
    }
  });

  ipcMain.handle('dialog:show-save', async (_, options: any) => {
    const result = await dialog.showSaveDialog(mainWindow!, options);
    return result;
  });

  ipcMain.handle('dialog:show-open', async (_, options: any) => {
    const result = await dialog.showOpenDialog(mainWindow!, options);
    return result;
  });

  ipcMain.handle('dialog:show-message', async (_, options: any) => {
    const result = await dialog.showMessageBox(mainWindow!, options);
    return result;
  });

  ipcMain.handle('shell:open-external', async (_, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  ipcMain.handle('shell:open-path', async (_, path: string) => {
    await shell.openPath(path);
    return { success: true };
  });

  ipcMain.handle('settings:get', async (_, key: string) => {
    const setting = new SettingRepository().get(key);
    return setting?.value || null;
  });
  // settings:get-all and settings:set are registered by DomainIpc.

  ipcMain.handle('audit:log', async (_, data: any) => {
    auditService.log(data);
    return { success: true };
  });

  ipcMain.handle('audit:trail', async (_, entityType: string, entityId: string) => {
    return auditService.getAuditTrail(entityType, entityId);
  });

  ipcMain.handle('audit:user-activity', async (_, userId: string, limit?: number) => {
    return auditService.getUserActivity(userId, limit);
  });

  ipcMain.handle('audit:export', async () => {
    const blob = auditService.exportAuditLogs();
    const arrayBuffer = await blob.arrayBuffer();
    return { success: true, data: Buffer.from(arrayBuffer).toString('base64') };
  });
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', async () => {
  logger.info('Shutting down...');
  await networkService.stop();
  closeDatabase();
  logger.info('Shutdown complete');
});

if (process.platform === 'win32') {
  app.setAppUserModelId('com.belko.eduplatform');
}

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
});

if (require.main === module) {
  const { runSecurityTests, verifyCSP } = require('../utils/security-tests');
  if (process.argv.includes('--test-security')) {
    runSecurityTests();
    process.exit(0);
  }
  if (process.argv.includes('--verify-csp')) {
    verifyCSP();
    process.exit(0);
  }
}
