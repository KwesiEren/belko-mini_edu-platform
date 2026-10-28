export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'principal' | 'secretary' | 'teacher';
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface School {
  id: string;
  name: string;
  motto?: string;
  address?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color?: string;
  country: string;
  currency: string;
  academic_year: string;
  terms_per_year: number;
  grading_scale: string;
  report_template: string;
  receipt_template: string;
  usage_mode: 'shared' | 'network';
  backup_folder?: string;
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Term {
  id: string;
  academic_year_id: string;
  name: string;
  ordinal: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
  closed_at?: string;
  closed_by?: string;
  close_reason?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'M' | 'F' | 'O';
  photo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  enrollment_date: string;
  status: 'active' | 'graduated' | 'transferred' | 'suspended' | 'withdrawn';
  status_changed_at?: string;
  status_changed_by?: string;
  status_reason?: string;
  class_id?: string;
  stream_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Guardian {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone?: string;
  email?: string;
  address?: string;
  relationship?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface StudentGuardian {
  id: string;
  student_id: string;
  guardian_id: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: 'principal' | 'secretary' | 'teacher';
  hire_date: string;
  is_active: boolean;
  /** Linked login account (see migration 10). One user ↔ one staff record. */
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Class {
  id: string;
  name: string;
  academic_year_id: string;
  capacity?: number;
  homeroom_teacher_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Stream {
  id: string;
  class_id: string;
  name: string;
  capacity?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  is_core: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface TeachingAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  stream_id?: string;
  academic_year_id: string;
  term_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface HomeroomAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  academic_year_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  stream_id?: string;
  subject_id?: string;
  teacher_id: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  status: 'open' | 'closed' | 'submitted';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface GradeComponent {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  subject_id?: string;
  academic_year_id: string;
  term_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface GradeScale {
  id: string;
  name: string;
  academic_year_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface GradeBoundary {
  id: string;
  grade_scale_id: string;
  letter: string;
  min_score: number;
  max_score: number;
  remark: string;
  created_at: string;
  updated_at: string;
}

export interface GradeSheet {
  id: string;
  class_id: string;
  stream_id?: string;
  subject_id: string;
  teacher_id: string;
  academic_year_id: string;
  term_id: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'published';
  submitted_at?: string;
  submitted_by?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  approved_at?: string;
  approved_by?: string;
  published_at?: string;
  published_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface GradeEntry {
  id: string;
  grade_sheet_id: string;
  student_id: string;
  component_id: string;
  score: number;
  is_draft: boolean;
  entered_by: string;
  entered_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface GradeSubmission {
  id: string;
  grade_sheet_id: string;
  submitted_by: string;
  submitted_at: string;
  created_at: string;
}

export interface GradeApproval {
  id: string;
  grade_sheet_id: string;
  approved_by: string;
  approved_at: string;
  action: 'approved' | 'rejected' | 'returned';
  remarks?: string;
  created_at: string;
}

export interface ReportCard {
  id: string;
  student_id: string;
  academic_year_id: string;
  term_id: string;
  class_id: string;
  stream_id?: string;
  pdf_path?: string;
  generated_at?: string;
  generated_by?: string;
  is_final: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ConductRemark {
  id: string;
  report_card_id: string;
  conduct: string;
  attitude: string;
  attendance_summary: string;
  teacher_remark: string;
  principal_remark?: string;
  principal_signature_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeComponent {
  id: string;
  name: string;
  amount: number;
  frequency: 'once' | 'term' | 'monthly' | 'annual';
  is_mandatory: boolean;
  academic_year_id: string;
  term_id?: string;
  class_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FeeStructure {
  id: string;
  name: string;
  academic_year_id: string;
  term_id?: string;
  class_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FeeStructureComponent {
  id: string;
  fee_structure_id: string;
  fee_component_id: string;
  created_at: string;
}

export interface FeeBill {
  id: string;
  student_id: string;
  fee_structure_id: string;
  academic_year_id: string;
  term_id: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'voided';
  due_date: string;
  generated_at: string;
  generated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FeePayment {
  id: string;
  bill_id: string;
  student_id: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'card' | 'other';
  reference_number?: string;
  payment_date: string;
  received_by: string;
  receipt_number?: string;
  is_void: boolean;
  void_reason?: string;
  voided_at?: string;
  voided_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptCounter {
  id: string;
  prefix: string;
  current_number: number;
  academic_year_id: string;
  created_at: string;
  updated_at: string;
}

export interface BackupRecord {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  checksum: string;
  type: 'auto' | 'manual' | 'pre_migration' | 'pre_import';
  status: 'completed' | 'failed' | 'corrupted';
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface BackupSchedule {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  retention_daily: number;
  retention_monthly: number;
  is_enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  /** Null for system-initiated actions (scheduled backups, imports). */
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  refresh_token_hash?: string;
  device_name?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  last_activity_at: string;
  is_revoked: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeviceSession {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  platform: string;
  last_sync_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncQueue {
  id: string;
  device_session_id: string;
  operation: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: string;
  payload: string;
  status: 'pending' | 'synced' | 'conflict' | 'failed';
  conflict_resolution?: 'server_wins' | 'client_wins' | 'manual';
  created_at: string;
  synced_at?: string;
  updated_at: string;
}

export interface ConflictLog {
  id: string;
  sync_queue_id: string;
  server_data: string;
  client_data: string;
  resolution: 'server_wins' | 'client_wins' | 'manual';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type Role = 'principal' | 'secretary' | 'teacher';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  principal: [
    'school.settings',
    'school.branding',
    'school.backup',
    'users.manage',
    'students.manage',
    'students.import',
    'staff.manage',
    'classes.manage',
    'subjects.manage',
    'attendance.view_all',
    'attendance.manage',
    'grades.manage',
    'grades.approve',
    'grades.publish',
    'fees.manage',
    'fees.collect',
    'fees.receipts',
    'reports.view_all',
    'reports.export',
    'backup.manage',
    'restore.manage',
    'audit.view',
    'import.manage',
    'export.manage',
  ],
  secretary: [
    'students.manage',
    'students.import',
    'attendance.view_all',
    'attendance.manage',
    'fees.collect',
    'fees.receipts',
    'reports.export',
    'import.manage',
    'export.manage',
  ],
  teacher: [
    'attendance.own_classes',
    'grades.own_subjects',
    'grades.submit',
    'reports.own_classes',
    'conduct_remarks.own_class',
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}