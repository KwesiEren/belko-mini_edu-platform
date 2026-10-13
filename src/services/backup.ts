import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDatabase, closeDatabase, initializeDatabase } from '../db/connection';
import { BackupRecordRepository, BackupScheduleRepository, AuditLogRepository, SettingRepository } from '../repositories/system';
import pino from 'pino';

const logger = pino({ name: 'service:backup' });

export interface BackupOptions {
  type: 'auto' | 'manual' | 'pre_migration' | 'pre_import';
  includeUploads?: boolean;
}

export interface BackupResult {
  success: boolean;
  filename?: string;
  filePath?: string;
  fileSize?: number;
  checksum?: string;
  error?: string;
}

export class BackupService {
  private backupRepo = new BackupRecordRepository();
  private scheduleRepo = new BackupScheduleRepository();
  private auditRepo = new AuditLogRepository();
  private settingRepo = new SettingRepository();

  private getBackupDir(): string {
    const setting = this.settingRepo.get('backup_folder');
    if (setting?.value && fs.existsSync(setting.value)) {
      return setting.value;
    }
    const userDataPath = app.getPath('userData');
    const backupDir = path.join(userDataPath, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  private generateFilename(type: BackupOptions['type']): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `belko-backup-${type}-${timestamp}.sqlite`;
  }

  private computeChecksum(filePath: string): string {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async createBackup(options: BackupOptions = { type: 'manual' }): Promise<BackupResult> {
    const db = getDatabase();
    const backupDir = this.getBackupDir();
    const filename = this.generateFilename(options.type);
    const filePath = path.join(backupDir, filename);

    const record = this.backupRepo.create({
      filename,
      file_path: filePath,
      file_size: 0,
      checksum: '',
      type: options.type,
      status: 'completed',
    });

    try {
      logger.info({ filePath, type: options.type }, 'Starting backup');

      await this.performBackup(filePath);

      const stats = fs.statSync(filePath);
      const checksum = await this.computeChecksum(filePath);

      this.backupRepo.markCompleted(record.id, checksum, stats.size);

      this.auditRepo.log({
        user_id: 'system',
        action: 'backup_created',
        entity_type: 'backup',
        entity_id: record.id,
        new_values: { filename, file_size: stats.size, checksum, type: options.type },
      });

      logger.info({ filePath, size: stats.size, checksum }, 'Backup completed');
      return { success: true, filename, filePath, fileSize: stats.size, checksum };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.backupRepo.markFailed(record.id, errorMessage);
      logger.error({ error: errorMessage }, 'Backup failed');
      return { success: false, error: errorMessage };
    }
  }

  private async performBackup(outputPath: string): Promise<void> {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
      db.backup(outputPath, (err) => {
        if (err) {
          logger.error({ err }, 'SQLite backup failed');
          reject(err);
        } else {
          logger.info('SQLite backup completed');
          resolve();
        }
      });
    });
  }

  async restoreBackup(backupId: string, targetPath?: string): Promise<{ success: boolean; error?: string }> {
    const record = this.backupRepo.findById(backupId);
    if (!record) {
      return { success: false, error: 'Backup record not found' };
    }

    if (record.status !== 'completed') {
      return { success: false, error: 'Backup is not completed or is corrupted' };
    }

    if (!fs.existsSync(record.file_path)) {
      return { success: false, error: 'Backup file not found' };
    }

    const currentChecksum = await this.computeChecksum(record.file_path);
    if (currentChecksum !== record.checksum) {
      this.backupRepo.update(record.id, { status: 'corrupted' });
      return { success: false, error: 'Backup file is corrupted (checksum mismatch)' };
    }

    try {
      logger.info({ backupId, filePath: record.file_path }, 'Starting restore');

      const targetDbPath = targetPath || getDatabasePath();
      const backupDir = path.dirname(targetDbPath);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      closeDatabase();

      if (fs.existsSync(targetDbPath)) {
        const preRestoreBackup = `${targetDbPath}.pre-restore-${Date.now()}`;
        fs.copyFileSync(targetDbPath, preRestoreBackup);
        logger.info({ preRestoreBackup }, 'Created pre-restore backup');
      }

      fs.copyFileSync(record.file_path, targetDbPath);

      initializeDatabase();

      const newRecord = this.backupRepo.create({
        filename: `restored-${record.filename}`,
        file_path: targetDbPath,
        file_size: fs.statSync(targetDbPath).size,
        checksum: currentChecksum,
        type: 'manual',
        status: 'completed',
      });

      this.auditRepo.log({
        user_id: 'system',
        action: 'backup_restored',
        entity_type: 'backup',
        entity_id: newRecord.id,
        new_values: { restored_from: record.id, filename: record.filename },
      });

      logger.info('Restore completed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Restore failed');
      initializeDatabase();
      return { success: false, error: errorMessage };
    }
  }

  async verifyBackup(backupId: string): Promise<{ valid: boolean; error?: string }> {
    const record = this.backupRepo.findById(backupId);
    if (!record) {
      return { valid: false, error: 'Backup record not found' };
    }

    if (!fs.existsSync(record.file_path)) {
      return { valid: false, error: 'Backup file not found' };
    }

    try {
      const currentChecksum = await this.computeChecksum(record.file_path);
      if (currentChecksum !== record.checksum) {
        this.backupRepo.update(record.id, { status: 'corrupted' });
        return { valid: false, error: 'Checksum mismatch - file may be corrupted' };
      }

      const testDb = require('better-sqlite3')(record.file_path, { readonly: true });
      testDb.exec('PRAGMA integrity_check');
      testDb.close();

      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.backupRepo.update(record.id, { status: 'corrupted' });
      return { valid: false, error: errorMessage };
    }
  }

  getBackupHistory(limit = 50): BackupRecord[] {
    return this.backupRepo.findRecent(limit);
  }

  getSchedules(): BackupSchedule[] {
    return this.scheduleRepo.findAll({});
  }

  updateSchedule(data: Partial<BackupSchedule> & { id?: string }): BackupSchedule {
    if (data.id) {
      const updated = this.scheduleRepo.update(data.id, data);
      if (!updated) throw new Error('Schedule not found');
      return updated;
    }
    return this.scheduleRepo.create({
      frequency: data.frequency || 'daily',
      time: data.time || '02:00',
      retention_daily: data.retention_daily || 30,
      retention_monthly: data.retention_monthly || 12,
      is_enabled: data.is_enabled ?? 1,
    });
  }

  runScheduledBackups(): void {
    const schedule = this.scheduleRepo.getActive();
    if (!schedule) return;

    const now = new Date();
    const nextRun = schedule.next_run_at ? new Date(schedule.next_run_at) : null;

    if (nextRun && now >= nextRun) {
      logger.info('Running scheduled backup');
      this.createBackup({ type: 'auto' }).then(result => {
        if (result.success) {
          this.scheduleRepo.recordRun(schedule.id);
        }
      });
    }
  }

  startScheduler(): NodeJS.Timeout {
    return setInterval(() => this.runScheduledBackups(), 60000);
  }

  cleanupOldBackups(): number {
    const schedule = this.scheduleRepo.getActive();
    if (!schedule) return 0;

    return this.backupRepo.cleanupOld(schedule.retention_daily, schedule.retention_monthly);
  }

  exportBackup(backupId: string, exportPath: string): { success: boolean; error?: string } {
    const record = this.backupRepo.findById(backupId);
    if (!record) {
      return { success: false, error: 'Backup record not found' };
    }

    if (!fs.existsSync(record.file_path)) {
      return { success: false, error: 'Backup file not found' };
    }

    try {
      fs.copyFileSync(record.file_path, exportPath);
      this.auditRepo.log({
        user_id: 'system',
        action: 'backup_exported',
        entity_type: 'backup',
        entity_id: backupId,
        new_values: { export_path: exportPath },
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  importBackup(importPath: string): { success: boolean; backupId?: string; error?: string } {
    if (!fs.existsSync(importPath)) {
      return { success: false, error: 'Import file not found' };
    }

    try {
      const testDb = require('better-sqlite3')(importPath, { readonly: true });
      testDb.exec('PRAGMA integrity_check');
      testDb.close();

      const checksum = crypto.createHash('sha256');
      const stream = fs.createReadStream(importPath);
      return new Promise((resolve) => {
        stream.on('data', chunk => checksum.update(chunk));
        stream.on('end', async () => {
          const fileChecksum = checksum.digest('hex');
          const stats = fs.statSync(importPath);

          const backupDir = this.getBackupDir();
          const filename = path.basename(importPath);
          const destPath = path.join(backupDir, filename);

          fs.copyFileSync(importPath, destPath);

          const record = this.backupRepo.create({
            filename,
            file_path: destPath,
            file_size: stats.size,
            checksum: fileChecksum,
            type: 'manual',
            status: 'completed',
          });

          resolve({ success: true, backupId: record.id });
        });
        stream.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');
  return path.join(dbDir, 'belko.db');
}

export const backupService = new BackupService();