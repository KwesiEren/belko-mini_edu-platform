import crypto from 'node:crypto';
import { getDatabase, runInTransaction } from './connection';
import { createPerformanceIndexes } from './indexes';
import pino from 'pino';

const logger = pino({ name: 'migrations' });

export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      CREATE TABLE schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        motto TEXT,
        address TEXT,
        logo_url TEXT,
        primary_color TEXT NOT NULL DEFAULT '#d8ed88',
        secondary_color TEXT,
        country TEXT NOT NULL DEFAULT 'Nigeria',
        currency TEXT NOT NULL DEFAULT 'NGN',
        academic_year TEXT NOT NULL DEFAULT '2026/2027',
        terms_per_year INTEGER NOT NULL DEFAULT 3,
        grading_scale TEXT NOT NULL DEFAULT 'West African',
        report_template TEXT NOT NULL DEFAULT 'Classic',
        receipt_template TEXT NOT NULL DEFAULT 'Compact',
        usage_mode TEXT NOT NULL DEFAULT 'shared' CHECK (usage_mode IN ('shared', 'network')),
        backup_folder TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE academic_years (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_current INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE terms (
        id TEXT PRIMARY KEY,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        name TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_current INTEGER NOT NULL DEFAULT 0,
        is_closed INTEGER NOT NULL DEFAULT 0,
        closed_at TEXT,
        closed_by TEXT,
        close_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE INDEX idx_terms_academic_year ON terms(academic_year_id);
      CREATE INDEX idx_terms_current ON terms(is_current) WHERE is_current = 1;
    `,
    down: `
      DROP TABLE IF EXISTS terms;
      DROP TABLE IF EXISTS academic_years;
      DROP TABLE IF EXISTS schools;
    `,
  },
  {
    version: 2,
    name: 'users_and_auth',
    up: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('principal', 'secretary', 'teacher')),
        avatar_url TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        token_hash TEXT NOT NULL,
        refresh_token_hash TEXT,
        device_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        expires_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_revoked INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_sessions_user ON sessions(user_id);
      CREATE INDEX idx_sessions_token ON sessions(token_hash);
      CREATE INDEX idx_sessions_expires ON sessions(expires_at);
    `,
    down: `
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS users;
    `,
  },
  {
    version: 3,
    name: 'students_and_guardians',
    up: `
      CREATE TABLE students (
        id TEXT PRIMARY KEY,
        admission_number TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        date_of_birth TEXT,
        gender TEXT CHECK (gender IN ('M', 'F', 'O')),
        photo_url TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        enrollment_date TEXT NOT NULL DEFAULT (date('now')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'transferred', 'suspended', 'withdrawn')),
        status_changed_at TEXT,
        status_changed_by TEXT,
        status_reason TEXT,
        class_id TEXT,
        stream_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE guardians (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        relationship TEXT,
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE student_guardians (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES students(id),
        guardian_id TEXT NOT NULL REFERENCES guardians(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(student_id, guardian_id)
      );

      CREATE INDEX idx_students_admission ON students(admission_number);
      CREATE INDEX idx_students_class ON students(class_id);
      CREATE INDEX idx_students_status ON students(status);
      CREATE INDEX idx_student_guardians_student ON student_guardians(student_id);
      CREATE INDEX idx_student_guardians_guardian ON student_guardians(guardian_id);
    `,
    down: `
      DROP TABLE IF EXISTS student_guardians;
      DROP TABLE IF EXISTS guardians;
      DROP TABLE IF EXISTS students;
    `,
  },
  {
    version: 4,
    name: 'staff_classes_subjects',
    up: `
      CREATE TABLE staff (
        id TEXT PRIMARY KEY,
        employee_number TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL CHECK (role IN ('principal', 'secretary', 'teacher')),
        hire_date TEXT NOT NULL DEFAULT (date('now')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        capacity INTEGER,
        homeroom_teacher_id TEXT REFERENCES staff(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE streams (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES classes(id),
        name TEXT NOT NULL,
        capacity INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE subjects (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        is_core INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE teaching_assignments (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL REFERENCES staff(id),
        subject_id TEXT NOT NULL REFERENCES subjects(id),
        class_id TEXT NOT NULL REFERENCES classes(id),
        stream_id TEXT REFERENCES streams(id),
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        term_id TEXT REFERENCES terms(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE homeroom_assignments (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL REFERENCES staff(id),
        class_id TEXT NOT NULL REFERENCES classes(id),
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE INDEX idx_staff_employee ON staff(employee_number);
      CREATE INDEX idx_classes_academic_year ON classes(academic_year_id);
      CREATE INDEX idx_streams_class ON streams(class_id);
      CREATE INDEX idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);
      CREATE INDEX idx_teaching_assignments_class_subject ON teaching_assignments(class_id, subject_id);
      CREATE INDEX idx_homeroom_assignments_teacher ON homeroom_assignments(teacher_id);
    `,
    down: `
      DROP TABLE IF EXISTS homeroom_assignments;
      DROP TABLE IF EXISTS teaching_assignments;
      DROP TABLE IF EXISTS subjects;
      DROP TABLE IF EXISTS streams;
      DROP TABLE IF EXISTS classes;
      DROP TABLE IF EXISTS staff;
    `,
  },
  {
    version: 5,
    name: 'attendance',
    up: `
      CREATE TABLE attendance_sessions (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES classes(id),
        stream_id TEXT REFERENCES streams(id),
        subject_id TEXT REFERENCES subjects(id),
        teacher_id TEXT NOT NULL REFERENCES staff(id),
        session_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'submitted')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE attendance_records (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES attendance_sessions(id),
        student_id TEXT NOT NULL REFERENCES students(id),
        status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
        remarks TEXT,
        recorded_by TEXT NOT NULL REFERENCES staff(id),
        recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE UNIQUE INDEX idx_attendance_unique ON attendance_records(session_id, student_id) WHERE deleted_at IS NULL;
      CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
      CREATE INDEX idx_attendance_sessions_teacher ON attendance_sessions(teacher_id);
      CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);
    `,
    down: `
      DROP TABLE IF EXISTS attendance_records;
      DROP TABLE IF EXISTS attendance_sessions;
    `,
  },
  {
    version: 6,
    name: 'grades',
    up: `
      CREATE TABLE grade_components (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        weight INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        subject_id TEXT REFERENCES subjects(id),
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        term_id TEXT REFERENCES terms(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE grade_scales (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE grade_boundaries (
        id TEXT PRIMARY KEY,
        grade_scale_id TEXT NOT NULL REFERENCES grade_scales(id),
        letter TEXT NOT NULL,
        min_score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        remark TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(grade_scale_id, letter)
      );

      CREATE TABLE grade_sheets (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES classes(id),
        stream_id TEXT REFERENCES streams(id),
        subject_id TEXT NOT NULL REFERENCES subjects(id),
        teacher_id TEXT NOT NULL REFERENCES staff(id),
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        term_id TEXT NOT NULL REFERENCES terms(id),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'published')),
        submitted_at TEXT,
        submitted_by TEXT REFERENCES staff(id),
        reviewed_at TEXT,
        reviewed_by TEXT REFERENCES staff(id),
        approved_at TEXT,
        approved_by TEXT REFERENCES staff(id),
        published_at TEXT,
        published_by TEXT REFERENCES staff(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE grade_entries (
        id TEXT PRIMARY KEY,
        grade_sheet_id TEXT NOT NULL REFERENCES grade_sheets(id),
        student_id TEXT NOT NULL REFERENCES students(id),
        component_id TEXT NOT NULL REFERENCES grade_components(id),
        score INTEGER,
        is_draft INTEGER NOT NULL DEFAULT 1,
        entered_by TEXT NOT NULL REFERENCES staff(id),
        entered_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE grade_submissions (
        id TEXT PRIMARY KEY,
        grade_sheet_id TEXT NOT NULL REFERENCES grade_sheets(id),
        submitted_by TEXT NOT NULL REFERENCES staff(id),
        submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE grade_approvals (
        id TEXT PRIMARY KEY,
        grade_sheet_id TEXT NOT NULL REFERENCES grade_sheets(id),
        approved_by TEXT NOT NULL REFERENCES staff(id),
        approved_at TEXT NOT NULL DEFAULT (datetime('now')),
        action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'returned')),
        remarks TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE report_cards (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES students(id),
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        term_id TEXT NOT NULL REFERENCES terms(id),
        class_id TEXT NOT NULL REFERENCES classes(id),
        stream_id TEXT REFERENCES streams(id),
        pdf_path TEXT,
        generated_at TEXT,
        generated_by TEXT REFERENCES staff(id),
        is_final INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE conduct_remarks (
        id TEXT PRIMARY KEY,
        report_card_id TEXT NOT NULL REFERENCES report_cards(id),
        conduct TEXT NOT NULL,
        attitude TEXT NOT NULL,
        attendance_summary TEXT NOT NULL,
        teacher_remark TEXT NOT NULL,
        principal_remark TEXT,
        principal_signature_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_grade_components_subject_year ON grade_components(subject_id, academic_year_id);
      CREATE INDEX idx_grade_sheets_class_subject ON grade_sheets(class_id, subject_id);
      CREATE INDEX idx_grade_sheets_status ON grade_sheets(status);
      CREATE INDEX idx_grade_entries_sheet ON grade_entries(grade_sheet_id);
      CREATE INDEX idx_grade_entries_student ON grade_entries(student_id);
      CREATE INDEX idx_report_cards_student_term ON report_cards(student_id, academic_year_id, term_id);
    `,
    down: `
      DROP TABLE IF EXISTS conduct_remarks;
      DROP TABLE IF EXISTS report_cards;
      DROP TABLE IF EXISTS grade_approvals;
      DROP TABLE IF EXISTS grade_submissions;
      DROP TABLE IF EXISTS grade_entries;
      DROP TABLE IF EXISTS grade_sheets;
      DROP TABLE IF EXISTS grade_boundaries;
      DROP TABLE IF EXISTS grade_scales;
      DROP TABLE IF EXISTS grade_components;
    `,
  },
  {
    version: 7,
    name: 'fees',
    up: `
      CREATE TABLE fee_components (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        frequency TEXT NOT NULL CHECK (frequency IN ('once', 'term', 'monthly', 'annual')),
        is_mandatory INTEGER NOT NULL DEFAULT 1,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        term_id TEXT REFERENCES terms(id),
        class_id TEXT REFERENCES classes(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE fee_structures (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        term_id TEXT REFERENCES terms(id),
        class_id TEXT REFERENCES classes(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE fee_structure_components (
        id TEXT PRIMARY KEY,
        fee_structure_id TEXT NOT NULL REFERENCES fee_structures(id),
        fee_component_id TEXT NOT NULL REFERENCES fee_components(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(fee_structure_id, fee_component_id)
      );

      CREATE TABLE fee_bills (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES students(id),
        fee_structure_id TEXT NOT NULL REFERENCES fee_structures(id),
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        term_id TEXT NOT NULL REFERENCES terms(id),
        total_amount INTEGER NOT NULL,
        paid_amount INTEGER NOT NULL DEFAULT 0,
        balance INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'voided')),
        due_date TEXT NOT NULL,
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        generated_by TEXT NOT NULL REFERENCES staff(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      CREATE TABLE fee_payments (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL REFERENCES fee_bills(id),
        student_id TEXT NOT NULL REFERENCES students(id),
        amount INTEGER NOT NULL,
        method TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'cheque', 'mobile_money', 'card', 'other')),
        reference_number TEXT,
        payment_date TEXT NOT NULL DEFAULT (date('now')),
        received_by TEXT NOT NULL REFERENCES staff(id),
        receipt_number TEXT,
        is_void INTEGER NOT NULL DEFAULT 0,
        void_reason TEXT,
        voided_at TEXT,
        voided_by TEXT REFERENCES staff(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE receipt_counters (
        id TEXT PRIMARY KEY,
        prefix TEXT NOT NULL,
        current_number INTEGER NOT NULL DEFAULT 0,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(prefix, academic_year_id)
      );

      CREATE UNIQUE INDEX idx_receipt_number ON fee_payments(receipt_number) WHERE is_void = 0 AND receipt_number IS NOT NULL;
      CREATE INDEX idx_fee_bills_student ON fee_bills(student_id);
      CREATE INDEX idx_fee_bills_status ON fee_bills(status);
      CREATE INDEX idx_fee_payments_bill ON fee_payments(bill_id);
      CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
      CREATE INDEX idx_fee_payments_date ON fee_payments(payment_date);
    `,
    down: `
      DROP TABLE IF EXISTS receipt_counters;
      DROP TABLE IF EXISTS fee_payments;
      DROP TABLE IF EXISTS fee_bills;
      DROP TABLE IF EXISTS fee_structure_components;
      DROP TABLE IF EXISTS fee_structures;
      DROP TABLE IF EXISTS fee_components;
    `,
  },
  {
    version: 8,
    name: 'backup_audit_settings',
    up: `
      CREATE TABLE backup_records (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('auto', 'manual', 'pre_migration', 'pre_import')),
        status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'corrupted')),
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE TABLE backup_schedules (
        id TEXT PRIMARY KEY,
        frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
        time TEXT NOT NULL,
        retention_daily INTEGER NOT NULL DEFAULT 30,
        retention_monthly INTEGER NOT NULL DEFAULT 12,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        last_run_at TEXT,
        next_run_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
      CREATE INDEX idx_backup_records_created ON backup_records(created_at);
    `,
    down: `
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS backup_schedules;
      DROP TABLE IF EXISTS backup_records;
    `,
  },
  {
    version: 9,
    name: 'network_sync',
    up: `
      CREATE TABLE device_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        device_id TEXT NOT NULL UNIQUE,
        device_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        last_sync_at TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE sync_queue (
        id TEXT PRIMARY KEY,
        device_session_id TEXT NOT NULL REFERENCES device_sessions(id),
        operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'conflict', 'failed')),
        conflict_resolution TEXT CHECK (conflict_resolution IN ('server_wins', 'client_wins', 'manual')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT
      );

      CREATE TABLE conflict_logs (
        id TEXT PRIMARY KEY,
        sync_queue_id TEXT NOT NULL REFERENCES sync_queue(id),
        server_data TEXT NOT NULL,
        client_data TEXT NOT NULL,
        resolution TEXT CHECK (resolution IN ('server_wins', 'client_wins', 'manual')),
        resolved_by TEXT REFERENCES users(id),
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_device_sessions_user ON device_sessions(user_id);
      CREATE INDEX idx_sync_queue_device ON sync_queue(device_session_id);
      CREATE INDEX idx_sync_queue_status ON sync_queue(status);
      CREATE INDEX idx_conflict_logs_sync ON conflict_logs(sync_queue_id);
    `,
    down: `
      DROP TABLE IF EXISTS conflict_logs;
      DROP TABLE IF EXISTS sync_queue;
      DROP TABLE IF EXISTS device_sessions;
    `,
  },
  {
    version: 10,
    name: 'user_staff_link_and_nullable_audit_user',
    up: `
      -- audit_logs.user_id was NOT NULL with a hard FK to users(id), which made
      -- every system-initiated audit write (backups, imports) fail with a FK
      -- violation. Rebuild the table with a nullable user_id.
      CREATE TABLE audit_logs_new (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO audit_logs_new (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
        SELECT id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at
        FROM audit_logs;

      DROP TABLE audit_logs;
      ALTER TABLE audit_logs_new RENAME TO audit_logs;

      CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

      -- Authentication creates users rows, but grade/attendance/fee actions
      -- FK to staff(id). Link every user to its staff record.
      ALTER TABLE staff ADD COLUMN user_id TEXT REFERENCES users(id);
      CREATE UNIQUE INDEX idx_staff_user ON staff(user_id) WHERE user_id IS NOT NULL;
    `,
    down: `
      DROP INDEX IF EXISTS idx_staff_user;
      -- user_id column on staff cannot be dropped in SQLite; documented as irreversible.
    `,
  },
];

function computeChecksum(sql: string): string {
  return crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);
}

export function runMigrations(): void {
  const database = getDatabase();
  logger.info('Running migrations');

  const applied = database.prepare('SELECT version, checksum FROM schema_migrations ORDER BY version').all() as { version: number; checksum: string }[];
  const appliedMap = new Map(applied.map(m => [m.version, m.checksum]));

  for (const migration of migrations) {
    const existingChecksum = appliedMap.get(migration.version);
    const currentChecksum = computeChecksum(migration.up);

    if (existingChecksum) {
      if (existingChecksum !== currentChecksum) {
        throw new Error(`Migration ${migration.version} (${migration.name}) has been modified! Expected checksum: ${existingChecksum}, got: ${currentChecksum}`);
      }
      logger.debug({ version: migration.version }, 'Migration already applied');
      continue;
    }

    logger.info({ version: migration.version, name: migration.name }, 'Applying migration');

    runInTransaction(() => {
      database.exec(migration.up);
      database.prepare('INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        currentChecksum
      );
    });

    logger.info({ version: migration.version }, 'Migration applied successfully');
  }

  logger.info('All migrations completed');
  
  createPerformanceIndexes();
}

export function getMigrationStatus(): { version: number; name: string; applied: boolean }[] {
  const database = getDatabase();
  const applied = database.prepare('SELECT version FROM schema_migrations').all() as { version: number }[];
  const appliedVersions = new Set(applied.map(m => m.version));

  return migrations.map(m => ({
    version: m.version,
    name: m.name,
    applied: appliedVersions.has(m.version),
  }));
}

export function rollbackMigration(targetVersion: number): void {
  const database = getDatabase();
  const applied = database.prepare('SELECT version FROM schema_migrations WHERE version > ? ORDER BY version DESC').all(targetVersion) as { version: number }[];

  for (const { version } of applied) {
    const migration = migrations.find(m => m.version === version);
    if (!migration) continue;

    logger.warn({ version }, 'Rolling back migration');

    runInTransaction(() => {
      database.exec(migration.down);
      database.prepare('DELETE FROM schema_migrations WHERE version = ?').run(version);
    });

    logger.info({ version }, 'Migration rolled back');
  }
}