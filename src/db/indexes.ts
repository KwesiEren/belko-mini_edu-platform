import { getDatabase } from './connection';
import pino from 'pino';

const logger = pino({ name: 'db:indexes' });

export function createPerformanceIndexes(): void {
  const db = getDatabase();
  
  logger.info('Creating performance indexes...');

  const indexes = [
    { table: 'students', columns: 'admission_number', unique: true },
    { table: 'students', columns: 'class_id, status' },
    { table: 'students', columns: 'last_name, first_name' },
    { table: 'students', columns: 'email' },
    { table: 'students', columns: 'stream_id, status' },
    
    { table: 'staff', columns: 'employee_number', unique: true },
    { table: 'staff', columns: 'role, is_active' },
    { table: 'staff', columns: 'last_name, first_name' },
    
    { table: 'classes', columns: 'academic_year_id, name' },
    { table: 'streams', columns: 'class_id, name' },
    
    { table: 'subjects', columns: 'code', unique: true },
    { table: 'subjects', columns: 'is_core' },
    
    { table: 'attendance_sessions', columns: 'teacher_id, session_date' },
    { table: 'attendance_sessions', columns: 'class_id, session_date' },
    { table: 'attendance_records', columns: 'session_id, student_id', unique: true, where: 'deleted_at IS NULL' },
    { table: 'attendance_records', columns: 'student_id' },
    { table: 'attendance_records', columns: 'recorded_by' },
    
    { table: 'grade_components', columns: 'subject_id, academic_year_id, term_id' },
    { table: 'grade_sheets', columns: 'class_id, subject_id, academic_year_id, term_id' },
    { table: 'grade_sheets', columns: 'teacher_id, academic_year_id, term_id' },
    { table: 'grade_sheets', columns: 'status' },
    { table: 'grade_entries', columns: 'grade_sheet_id, student_id, component_id', unique: true },
    { table: 'grade_entries', columns: 'student_id, component_id' },
    { table: 'grade_entries', columns: 'entered_by' },
    { table: 'grade_entries', columns: 'is_draft' },
    
    { table: 'grade_boundaries', columns: 'grade_scale_id, min_score, max_score' },
    
    { table: 'fee_components', columns: 'academic_year_id, term_id, class_id' },
    { table: 'fee_structures', columns: 'academic_year_id, term_id, class_id' },
    { table: 'fee_bills', columns: 'student_id, academic_year_id, term_id' },
    { table: 'fee_bills', columns: 'status, due_date' },
    { table: 'fee_payments', columns: 'bill_id' },
    { table: 'fee_payments', columns: 'student_id, payment_date' },
    { table: 'fee_payments', columns: 'received_by, payment_date' },
    { table: 'fee_payments', columns: 'receipt_number', unique: true, where: 'is_void = 0 AND receipt_number IS NOT NULL' },
    
    { table: 'receipt_counters', columns: 'prefix, academic_year_id', unique: true },
    
    { table: 'report_cards', columns: 'student_id, academic_year_id, term_id' },
    { table: 'report_cards', columns: 'class_id, academic_year_id, term_id' },
    { table: 'report_cards', columns: 'generated_by' },
    
    { table: 'audit_logs', columns: 'user_id, created_at' },
    { table: 'audit_logs', columns: 'entity_type, entity_id' },
    { table: 'audit_logs', columns: 'action, created_at' },
    
    { table: 'sessions', columns: 'user_id, is_revoked' },
    { table: 'sessions', columns: 'token_hash' },
    { table: 'sessions', columns: 'refresh_token_hash' },
    { table: 'sessions', columns: 'expires_at' },
    
    { table: 'device_sessions', columns: 'user_id, is_active' },
    { table: 'device_sessions', columns: 'device_id', unique: true },
    
    { table: 'sync_queue', columns: 'device_session_id, status' },
    { table: 'sync_queue', columns: 'entity_type, entity_id' },
    
    { table: 'backup_records', columns: 'created_at' },
    { table: 'backup_records', columns: 'status, type' },
    
    { table: 'conduct_remarks', columns: 'report_card_id', unique: true },
    
    { table: 'teaching_assignments', columns: 'teacher_id, academic_year_id' },
    { table: 'teaching_assignments', columns: 'class_id, subject_id, academic_year_id' },
    { table: 'homeroom_assignments', columns: 'teacher_id, academic_year_id' },
    { table: 'homeroom_assignments', columns: 'class_id, academic_year_id', unique: true },
  ];

  for (const idx of indexes) {
    const uniqueClause = idx.unique ? 'UNIQUE ' : '';
    const whereClause = idx.where ? ` WHERE ${idx.where}` : '';
    const indexName = `idx_${idx.table}_${idx.columns.replace(/[,\s]+/g, '_')}`;
    
    try {
      db.exec(`
        CREATE ${uniqueClause}INDEX IF NOT EXISTS ${indexName} 
        ON ${idx.table} (${idx.columns})${whereClause}
      `);
      logger.debug({ indexName, table: idx.table }, 'Index created');
    } catch (error) {
      logger.warn({ indexName, error: error instanceof Error ? error.message : 'Unknown' }, 'Index creation skipped');
    }
  }

  logger.info({ count: indexes.length }, 'Performance indexes created');
}

export function analyzeQueryPerformance(): { slowQueries: Array<{ query: string; time: number }> } {
  const db = getDatabase();
  
  const queries = [
    'SELECT * FROM students WHERE class_id = ? AND status = "active" ORDER BY last_name, first_name',
    'SELECT * FROM attendance_records ar JOIN attendance_sessions ses ON ar.session_id = ses.id WHERE ar.student_id = ? AND ses.term_id = ?',
    'SELECT * FROM grade_entries ge JOIN grade_components gc ON ge.component_id = gc.id WHERE ge.grade_sheet_id = ?',
    'SELECT * FROM fee_bills WHERE student_id = ? AND status IN ("pending", "partial") ORDER BY due_date',
    'SELECT * FROM fee_payments WHERE received_by = ? AND payment_date = ? AND is_void = 0',
    'SELECT * FROM attendance_sessions WHERE teacher_id = ? AND session_date = ?',
    'SELECT * FROM grade_sheets WHERE teacher_id = ? AND academic_year_id = ? AND term_id = ?',
    'SELECT * FROM students WHERE admission_number = ?',
    'SELECT * FROM staff WHERE employee_number = ?',
  ];

  const results: Array<{ query: string; time: number }> = [];
  
  for (const query of queries) {
    const start = process.hrtime.bigint();
    try {
      db.prepare(query).all('TEST', 'TEST');
    } catch {
      // Expected to fail with test params, but we measure execution time
    }
    const end = process.hrtime.bigint();
    const timeMs = Number(end - start) / 1_000_000;
    results.push({ query: query.slice(0, 80) + '...', time: timeMs });
  }

  return { slowQueries: results.filter(r => r.time > 10).sort((a, b) => b.time - a.time) };
}

export function getDatabaseStats(): {
  tableSizes: Array<{ table: string; rows: number; sizeBytes: number }>;
  totalSize: number;
  indexCount: number;
} {
  const db = getDatabase();
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'schema_%'
  `).all() as { name: string }[];
  
  const tableSizes: Array<{ table: string; rows: number; sizeBytes: number }> = [];
  let totalSize = 0;
  
  for (const { name } of tables) {
    try {
      const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get() as { count: number };
      const sizeResult = db.prepare(`
        SELECT SUM(pgsize) as size FROM dbstat WHERE name = ?
      `).get(name) as { size: number | null };
      
      const size = sizeResult?.size || 0;
      tableSizes.push({ table: name, rows: rowCount.count, sizeBytes: size });
      totalSize += size;
    } catch {
      tableSizes.push({ table: name, rows: 0, sizeBytes: 0 });
    }
  }
  
  const indexCount = db.prepare(`
    SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'
  `).get() as { count: number };
  
  return { tableSizes, totalSize, indexCount: indexCount.count };
}