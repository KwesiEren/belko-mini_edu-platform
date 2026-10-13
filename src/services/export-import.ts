import * as XLSX from 'xlsx';
import { v7 as uuidv7 } from 'uuid';
import { getDatabase } from '../db/connection';
import {
  StudentRepository, GuardianRepository, StudentGuardianRepository,
  StaffRepository, ClassRepository, StreamRepository, SubjectRepository,
  TeachingAssignmentRepository, HomeroomAssignmentRepository,
  AttendanceSessionRepository, AttendanceRecordRepository,
  GradeComponentRepository, GradeScaleRepository, GradeBoundaryRepository,
  GradeSheetRepository, GradeEntryRepository, ReportCardRepository,
  FeeComponentRepository, FeeStructureRepository, FeeBillRepository,
  FeePaymentRepository,
  BackupRecordRepository, AuditLogRepository,
} from '../repositories';
import { AuditLogService } from './audit';
import pino from 'pino';

const logger = pino({ name: 'service:export-import' });

export type ExportFormat = 'xlsx' | 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  filters?: Record<string, unknown>;
  entityTypes?: string[];
}

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; field?: string; message: string; data: Record<string, unknown> }>;
}

export interface ImportOptions {
  mode: 'add' | 'update' | 'upsert';
  entityType: string;
  dryRun?: boolean;
  mapping?: Record<string, string>;
}

interface EntityConfig {
  repository: keyof ExportImportService;
  fields: string[];
  uniqueFields: string[];
  requiredFields: string[];
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  students: {
    repository: 'studentRepo',
    fields: ['admission_number', 'first_name', 'middle_name', 'last_name', 'date_of_birth', 'gender', 'address', 'phone', 'email', 'enrollment_date', 'status', 'class_id', 'stream_id'],
    uniqueFields: ['admission_number'],
    requiredFields: ['admission_number', 'first_name', 'last_name'],
  },
  guardians: {
    repository: 'guardianRepo',
    fields: ['first_name', 'middle_name', 'last_name', 'phone', 'email', 'address', 'relationship', 'is_primary'],
    uniqueFields: [],
    requiredFields: ['first_name', 'last_name'],
  },
  staff: {
    repository: 'staffRepo',
    fields: ['employee_number', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 'role', 'hire_date', 'is_active'],
    uniqueFields: ['employee_number'],
    requiredFields: ['employee_number', 'first_name', 'last_name', 'role'],
  },
  classes: {
    repository: 'classRepo',
    fields: ['name', 'academic_year_id', 'capacity', 'homeroom_teacher_id'],
    uniqueFields: ['name', 'academic_year_id'],
    requiredFields: ['name', 'academic_year_id'],
  },
  subjects: {
    repository: 'subjectRepo',
    fields: ['code', 'name', 'is_core'],
    uniqueFields: ['code'],
    requiredFields: ['code', 'name'],
  },
  fee_components: {
    repository: 'feeComponentRepo',
    fields: ['name', 'amount', 'frequency', 'is_mandatory', 'academic_year_id', 'term_id', 'class_id'],
    uniqueFields: ['name', 'academic_year_id', 'term_id', 'class_id'],
    requiredFields: ['name', 'amount', 'frequency', 'academic_year_id'],
  },
  fee_structures: {
    repository: 'feeStructureRepo',
    fields: ['name', 'academic_year_id', 'term_id', 'class_id'],
    uniqueFields: ['name', 'academic_year_id', 'term_id', 'class_id'],
    requiredFields: ['name', 'academic_year_id'],
  },
};

export class ExportImportService {
  private studentRepo = new StudentRepository();
  private guardianRepo = new GuardianRepository();
  private studentGuardianRepo = new StudentGuardianRepository();
  private staffRepo = new StaffRepository();
  private classRepo = new ClassRepository();
  private streamRepo = new StreamRepository();
  private subjectRepo = new SubjectRepository();
  private teachingAssignmentRepo = new TeachingAssignmentRepository();
  private homeroomAssignmentRepo = new HomeroomAssignmentRepository();
  private attendanceSessionRepo = new AttendanceSessionRepository();
  private attendanceRecordRepo = new AttendanceRecordRepository();
  private gradeComponentRepo = new GradeComponentRepository();
  private gradeScaleRepo = new GradeScaleRepository();
  private gradeBoundaryRepo = new GradeBoundaryRepository();
  private gradeSheetRepo = new GradeSheetRepository();
  private gradeEntryRepo = new GradeEntryRepository();
  private reportCardRepo = new ReportCardRepository();
  private feeComponentRepo = new FeeComponentRepository();
  private feeStructureRepo = new FeeStructureRepository();
  private feeBillRepo = new FeeBillRepository();
  private feePaymentRepo = new FeePaymentRepository();
  private backupRepo = new BackupRecordRepository();
  private auditRepo = new AuditLogRepository();
  private auditService = new AuditLogService();

  private getRepo(repoName: keyof ExportImportService): any {
    return this[repoName];
  }

  async exportData(options: ExportOptions): Promise<Blob> {
    const { format, filters = {}, entityTypes = [] } = options;
    const allEntities = entityTypes.length > 0 ? entityTypes : Object.keys(ENTITY_CONFIGS);

    const workbook = XLSX.utils.book_new();

    for (const entityType of allEntities) {
      const data = await this.getEntityData(entityType, filters);
      const worksheet = XLSX.utils.json_to_sheet(data, { header: ENTITY_CONFIGS[entityType]?.fields });
      XLSX.utils.book_append_sheet(workbook, worksheet, entityType);
    }

    if (format === 'xlsx') {
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } else if (format === 'csv') {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(firstSheet);
      return new Blob([csv], { type: 'text/csv' });
    } else {
      const jsonData: Record<string, unknown[]> = {};
      for (const entityType of allEntities) {
        jsonData[entityType] = await this.getEntityData(entityType, filters);
      }
      return new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    }
  }

  private async getEntityData(entityType: string, filters: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    switch (entityType) {
      case 'students':
        return this.studentRepo.findAll({ where: filters, includeDeleted: false });
      case 'guardians':
        return this.guardianRepo.findAll({ where: filters, includeDeleted: false });
      case 'staff':
        return this.staffRepo.findAll({ where: filters, includeDeleted: false });
      case 'classes':
        return this.classRepo.findAll({ where: filters, includeDeleted: false });
      case 'subjects':
        return this.subjectRepo.findAll({ where: filters, includeDeleted: false });
      case 'fee_components':
        return this.feeComponentRepo.findAll({ where: filters, includeDeleted: false });
      case 'fee_structures':
        return this.feeStructureRepo.findAll({ where: filters, includeDeleted: false });
      default:
        return [];
    }
  }

  async importFromFile(file: File, options: ImportOptions): Promise<ImportResult> {
    const { mode, entityType, dryRun = false, mapping = {} } = options;
    const config = ENTITY_CONFIGS[entityType];
    if (!config) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];

    const result: ImportResult = {
      success: true,
      total: rows.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        const mappedRow = this.applyMapping(row, mapping);
        const validation = this.validateRow(mappedRow, config, rowNumber);
        if (!validation.valid) {
          result.errors.push({ row: rowNumber, message: validation.message!, data: mappedRow });
          result.skipped++;
          continue;
        }

        const existing = await this.findExisting(config, mappedRow);
        if (existing) {
          if (mode === 'add') {
            result.errors.push({ row: rowNumber, message: 'Record already exists (add mode)', data: mappedRow });
            result.skipped++;
            continue;
          }
          if (mode === 'update' || mode === 'upsert') {
            if (!dryRun) {
              await this.updateEntity(config, existing.id, mappedRow);
            }
            result.updated++;
            continue;
          }
        } else {
          if (mode === 'update') {
            result.errors.push({ row: rowNumber, message: 'Record not found (update mode)', data: mappedRow });
            result.skipped++;
            continue;
          }
          if (mode === 'add' || mode === 'upsert') {
            if (!dryRun) {
              await this.createEntity(config, mappedRow);
            }
            result.imported++;
            continue;
          }
        }
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
        result.skipped++;
      }
    }

    if (!dryRun && (result.imported > 0 || result.updated > 0)) {
      this.auditService.log({
        user_id: 'import',
        action: 'data_imported',
        entity_type: entityType,
        new_values: { imported: result.imported, updated: result.updated, errors: result.errors.length },
      });
    }

    return result;
  }

  private applyMapping(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [sourceKey, targetKey] of Object.entries(mapping)) {
      if (row[sourceKey] !== undefined) {
        mapped[targetKey] = row[sourceKey];
      }
    }
    for (const [key, value] of Object.entries(row)) {
      if (!mapping[key]) {
        mapped[key] = value;
      }
    }
    return mapped;
  }

  private validateRow(row: Record<string, unknown>, config: EntityConfig, rowNumber: number): { valid: boolean; message?: string } {
    for (const field of config.requiredFields) {
      if (row[field] === undefined || row[field] === '' || row[field] === null) {
        return { valid: false, message: `Missing required field: ${field}` };
      }
    }
    return { valid: true };
  }

  private async findExisting(config: EntityConfig, row: Record<string, unknown>): Promise<{ id: string } | null> {
    const repo = this.getRepo(config.repository);
    if (!repo) return null;

    for (const field of config.uniqueFields) {
      if (row[field] !== undefined) {
        const existing = repo.findAll({ where: { [field]: row[field] }, limit: 1 })[0];
        if (existing) return { id: existing.id };
      }
    }
    return null;
  }

  private async createEntity(config: EntityConfig, row: Record<string, unknown>): Promise<void> {
    const repo = this.getRepo(config.repository);
    if (!repo) throw new Error(`Repository not found: ${config.repository}`);

    const data: Record<string, unknown> = {};
    for (const field of config.fields) {
      if (row[field] !== undefined) {
        data[field] = row[field];
      }
    }
    repo.create(data);
  }

  private async updateEntity(config: EntityConfig, id: string, row: Record<string, unknown>): Promise<void> {
    const repo = this.getRepo(config.repository);
    if (!repo) throw new Error(`Repository not found: ${config.repository}`);

    const data: Record<string, unknown> = {};
    for (const field of config.fields) {
      if (row[field] !== undefined) {
        data[field] = row[field];
      }
    }
    repo.update(id, data);
  }

  generateTemplate(entityType: string): Blob {
    const config = ENTITY_CONFIGS[entityType];
    if (!config) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    const worksheet = XLSX.utils.aoa_to_sheet([config.fields]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, entityType);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  async exportFullBackup(): Promise<Blob> {
    const db = getDatabase();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];

    const workbook = XLSX.utils.book_new();
    const readmeData = [['Belko Edu-Platform Full Database Export'], ['Generated:', new Date().toISOString()], ['Tables:', tables.length.toString()]];
    const readmeSheet = XLSX.utils.aoa_to_sheet(readmeData);
    XLSX.utils.book_append_sheet(workbook, readmeSheet, 'README');

    for (const { name } of tables) {
      if (name === 'schema_migrations') continue;
      const rows = db.prepare(`SELECT * FROM ${name}`).all() as Record<string, unknown>[];
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  async importFullBackup(file: File): Promise<ImportResult> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const result: ImportResult = {
      success: true,
      total: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const sheetName of workbook.SheetNames) {
      if (sheetName === 'README') continue;
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];
      result.total += rows.length;

      const db = getDatabase();
      const columns = db.prepare(`PRAGMA table_info(${sheetName})`).all() as { name: string }[];
      const columnNames = columns.map(c => c.name).filter(c => c !== 'id' && c !== 'created_at' && c !== 'updated_at' && c !== 'deleted_at');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const placeholders = columnNames.map(() => '?').join(',');
          const values = columnNames.map(col => row[col]);
          db.prepare(`INSERT OR REPLACE INTO ${sheetName} (${columnNames.join(', ')}) VALUES (${placeholders})`).run(...values);
          result.imported++;
        } catch (error) {
          result.errors.push({ row: i + 1, message: error instanceof Error ? error.message : 'Unknown error', data: row });
          result.skipped++;
        }
      }
    }

    return result;
  }
}

export class AuditLogService {
  private auditRepo = new AuditLogRepository();

  log(data: { user_id: string; action: string; entity_type: string; entity_id?: string; old_values?: Record<string, unknown>; new_values?: Record<string, unknown>; ip_address?: string; user_agent?: string }): void {
    this.auditRepo.log(data);
  }

  getAuditTrail(entityType: string, entityId: string) {
    return this.auditRepo.findByEntity(entityType, entityId);
  }

  getUserActivity(userId: string, limit = 100) {
    return this.auditRepo.findByUser(userId, limit);
  }

  exportAuditLogs(): Blob {
    const logs = this.auditRepo.exportAll();
    const worksheet = XLSX.utils.json_to_sheet(logs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'audit_logs');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}

export const exportImportService = new ExportImportService();