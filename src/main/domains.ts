import { ipcMain } from 'electron';
import { z } from 'zod';
import type { AuthService } from '../services/auth';
import { SetupService, completeSetupSchema } from '../services/setup';
import { hasPermission, type Role } from '../types/database';
import type { AttendanceRecord, FeePayment } from '../types/database';
import { SchoolRepository, AcademicYearRepository, TermRepository } from '../repositories/school';
import { UserRepository } from '../repositories/user';
import { StaffRepository, ClassRepository, StreamRepository, SubjectRepository, TeachingAssignmentRepository } from '../repositories/staff';
import { StudentRepository, GuardianRepository, StudentGuardianRepository } from '../repositories/student';
import { AttendanceSessionRepository, AttendanceRecordRepository } from '../repositories/attendance';
import {
  GradeComponentRepository, GradeSheetRepository, GradeEntryRepository,
  ReportCardRepository,
} from '../repositories/grades';
import { FeeComponentRepository, FeeStructureRepository, FeeBillRepository, FeePaymentRepository } from '../repositories/fees';
import { SettingRepository, AuditLogRepository } from '../repositories/system';
import { AuditLogService } from '../services/export-import';
import { BackupService } from '../services/backup';
import pino from 'pino';

const logger = pino({ name: 'ipc:domains' });

export interface IpcContext {
  userId: string;
  role: Role;
  sessionId: string;
  staffId: string;
}

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

/** Drop null/undefined values so repo `update()` calls match typed Partial<...> params. */
function stripNulls<T extends Record<string, unknown>>(obj: T): Partial<{ [K in keyof T]: NonNullable<T[K]> }> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) result[k] = v;
  }
  return result as Partial<{ [K in keyof T]: NonNullable<T[K]> }>;
}

function fail(error: string, code = 'internal'): IpcResult<never> {
  return { ok: false, error, code };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCoded(error: unknown): IpcResult<never> {
  const message = errorMessage(error);
  if (message === 'Unauthorized') return fail(message, 'unauthorized');
  if (message === 'Forbidden') return fail(message, 'forbidden');
  if (error instanceof z.ZodError) {
    return fail(error.issues.map(i => `${i.path.join('.') || 'payload'}: ${i.message}`).join('; '), 'validation');
  }
  if (/not found/i.test(message)) return fail(message, 'not_found');
  if (/UNIQUE constraint|already exists/i.test(message)) return fail(message, 'conflict');
  return fail(message, 'internal');
}

/**
 * Domain IPC surface. Every handler:
 *  - verifies the caller's session (JWT + DB session row),
 *  - enforces permissions from the single ROLE_PERMISSIONS source,
 *  - validates payloads with Zod before touching repositories.
 */
export class DomainIpc {
  private staffRepo = new StaffRepository();
  private auditService = new AuditLogService();

  constructor(
    private authService: AuthService,
    private setupService: SetupService,
    private backupService: BackupService,
  ) { }

  register(): void {
    // ---------------------------------------------------------------- setup
    this.handle('setup:get-status', null, async () => {
      return this.setupService.getSetupStatus();
    });

    // Setup completion runs before any user exists, so it is gated on state,
    // not on a session. Once completed, only users.manage may re-run it.
    ipcMain.handle('setup:complete', async (_e, payload: unknown) => {
      try {
        const status = this.setupService.getSetupStatus();
        if (status.completed) {
          // Requires an authenticated principal with users.manage.
          const ctx = this.requireContext((payload as { token?: string })?.token, ['users.manage']);
          void ctx;
          return fail('Setup has already been completed', 'conflict');
        }
        const data = completeSetupSchema.parse(payload);
        return ok(this.setupService.completeSetup(data));
      } catch (error) {
        return errorCoded(error);
      }
    });

    // ------------------------------------------------------------ dashboard
    this.handle('dashboard:overview', null, async () => {
      return this.getDashboardOverview();
    });

    // Pre-auth public info: the login screen shows school branding before any
    // session exists, and the renderer needs the setup status to route between
    // the setup wizard and login.
    ipcMain.handle('schools:get-public', async () => {
      try {
        const school = new SchoolRepository().getSettings();
        return ok({
          school: school
            ? {
                name: school.name,
                motto: school.motto,
                address: school.address,
                primary_color: school.primary_color,
                secondary_color: school.secondary_color,
                currency: school.currency,
              }
            : null,
          setupStatus: this.setupService.getSetupStatus(),
        });
      } catch (error) {
        return errorCoded(error);
      }
    });

    // ------------------------------------------------------------- students
    this.handle('students:list', ['students.manage', 'attendance.view_all', 'attendance.own_classes', 'grades.own_subjects', 'fees.collect', 'reports.own_classes'], async (_ctx, p) => {
      const q = z.object({
        classId: z.string().optional(),
        status: z.enum(['active', 'graduated', 'transferred', 'suspended', 'withdrawn']).optional(),
        query: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      }).parse(p);
      if (q.query) {
        return new StudentRepository().search(q.query, q.limit);
      }
      if (q.classId) {
        return new StudentRepository().findByClass(q.classId);
      }
      const where: Record<string, unknown> = q.status ? { status: q.status } : {};
      return new StudentRepository().findAll({ where, orderBy: 'last_name, first_name', limit: q.limit });
    });

    this.handle('students:get', ['students.manage', 'attendance.own_classes', 'grades.own_subjects', 'fees.collect', 'reports.own_classes'], async (_ctx, p) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(p);
      const student = new StudentRepository().getWithGuardians(id);
      if (!student) throw new Error('Student not found');
      return student;
    });

    this.handle('students:create', ['students.manage'], async (ctx, p) => {
      const q = z.object({
        admission_number: z.string().min(1).max(50),
        first_name: z.string().min(1).max(100),
        middle_name: z.string().max(100).optional(),
        last_name: z.string().min(1).max(100),
        date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        gender: z.enum(['M', 'F', 'O']).optional(),
        address: z.string().max(500).optional(),
        phone: z.string().max(50).optional(),
        email: z.string().email().max(200).optional(),
        enrollment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        class_id: z.string().optional(),
        stream_id: z.string().optional(),
        guardian: z.object({
          first_name: z.string().min(1).max(100),
          last_name: z.string().min(1).max(100),
          phone: z.string().max(50).optional(),
          email: z.string().email().max(200).optional(),
          address: z.string().max(500).optional(),
          relationship: z.string().max(50).optional(),
        }).optional(),
      }).parse(p);

      const studentRepo = new StudentRepository();
      if (studentRepo.findByAdmissionNumber(q.admission_number)) {
        throw new Error(`Admission number ${q.admission_number} already exists`);
      }

      const student = studentRepo.create({
        admission_number: q.admission_number,
        first_name: q.first_name,
        middle_name: q.middle_name,
        last_name: q.last_name,
        date_of_birth: q.date_of_birth,
        gender: q.gender,
        address: q.address,
        phone: q.phone,
        email: q.email,
        enrollment_date: q.enrollment_date,
        status: 'active',
        class_id: q.class_id,
        stream_id: q.stream_id,
      });

      if (q.guardian) {
        const guardianRepo = new GuardianRepository();
        const linkRepo = new StudentGuardianRepository();
        const guardian = guardianRepo.create({ ...q.guardian, is_primary: true });
        linkRepo.link(student.id, guardian.id);
      }

      this.auditService.log({
        user_id: ctx.userId,
        action: 'student_created',
        entity_type: 'student',
        entity_id: student.id,
        new_values: { admission_number: student.admission_number, name: `${student.first_name} ${student.last_name}` },
      });
      return student;
    });

    this.handle('students:update', ['students.manage'], async (ctx, p) => {
      const q = z.object({
        id: z.string().min(1),
        first_name: z.string().min(1).max(100).optional(),
        middle_name: z.string().max(100).nullable().optional(),
        last_name: z.string().min(1).max(100).optional(),
        date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        gender: z.enum(['M', 'F', 'O']).nullable().optional(),
        address: z.string().max(500).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        email: z.string().email().max(200).nullable().optional(),
        class_id: z.string().nullable().optional(),
        stream_id: z.string().nullable().optional(),
      }).parse(p);
      const { id, ...updates } = q;
      const student = new StudentRepository().update(id, stripNulls(updates));
      if (!student) throw new Error('Student not found');
      this.auditService.log({
        user_id: ctx.userId,
        action: 'student_updated',
        entity_type: 'student',
        entity_id: id,
        new_values: updates as Record<string, unknown>,
      });
      return student;
    });

    this.handle('students:change-status', ['students.manage'], async (ctx, p) => {
      const q = z.object({
        id: z.string().min(1),
        status: z.enum(['active', 'graduated', 'transferred', 'suspended', 'withdrawn']),
        reason: z.string().max(500).optional(),
      }).parse(p);
      const student = new StudentRepository().changeStatus(q.id, q.status, ctx.userId, q.reason);
      if (!student) throw new Error('Student not found');
      this.auditService.log({
        user_id: ctx.userId,
        action: 'student_status_changed',
        entity_type: 'student',
        entity_id: q.id,
        new_values: { status: q.status, reason: q.reason },
      });
      return student;
    });

    this.handle('students:delete', ['students.manage'], async (ctx, p) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(p);
      const success = new StudentRepository().softDelete(id);
      if (!success) throw new Error('Student not found');
      this.auditService.log({
        user_id: ctx.userId,
        action: 'student_deleted',
        entity_type: 'student',
        entity_id: id,
      });
      return success;
    });

    // -------------------------------------------------------------- classes
    this.handle('classes:list', ['classes.manage', 'students.manage', 'attendance.view_all', 'attendance.own_classes', 'grades.own_subjects', 'fees.collect', 'reports.own_classes', 'reports.view_all'], async (_ctx, p) => {
      const { academicYearId } = z.object({ academicYearId: z.string().min(1) }).parse(p);
      return new ClassRepository().findByAcademicYear(academicYearId);
    });

    this.handle('classes:create', ['classes.manage'], async (ctx, p) => {
      const q = z.object({
        name: z.string().min(1).max(100),
        academic_year_id: z.string().min(1),
        capacity: z.number().int().min(1).max(500).optional(),
      }).parse(p);
      const created = new ClassRepository().create(q);
      this.auditService.log({ user_id: ctx.userId, action: 'class_created', entity_type: 'class', entity_id: created.id, new_values: { name: q.name } });
      return created;
    });

    this.handle('classes:update', ['classes.manage'], async (ctx, p) => {
      const q = z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(100).optional(),
        capacity: z.number().int().min(1).max(500).nullable().optional(),
      }).parse(p);
      const { id, ...updates } = q;
      const updated = new ClassRepository().update(id, stripNulls(updates));
      if (!updated) throw new Error('Class not found');
      this.auditService.log({ user_id: ctx.userId, action: 'class_updated', entity_type: 'class', entity_id: id });
      return updated;
    });

    this.handle('classes:delete', ['classes.manage'], async (ctx, p) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(p);
      const success = new ClassRepository().softDelete(id);
      if (!success) throw new Error('Class not found');
      this.auditService.log({ user_id: ctx.userId, action: 'class_deleted', entity_type: 'class', entity_id: id });
      return success;
    });

    // ------------------------------------------------------------- subjects
    this.handle('subjects:list', ['subjects.manage', 'students.manage', 'attendance.own_classes', 'grades.own_subjects', 'fees.collect', 'reports.own_classes', 'reports.view_all'], async () => {
      return new SubjectRepository().findAll({ orderBy: 'name' });
    });

    this.handle('subjects:create', ['subjects.manage'], async (ctx, p) => {
      const q = z.object({
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(150),
        is_core: z.boolean().default(true),
      }).parse(p);
      if (new SubjectRepository().findByCode(q.code)) {
        throw new Error(`Subject code ${q.code} already exists`);
      }
      const created = new SubjectRepository().create({ code: q.code, name: q.name, is_core: q.is_core });
      this.auditService.log({ user_id: ctx.userId, action: 'subject_created', entity_type: 'subject', entity_id: created.id, new_values: { code: q.code } });
      return created;
    });

    this.handle('subjects:update', ['subjects.manage'], async (ctx, p) => {
      const q = z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(150).optional(),
        is_core: z.boolean().optional(),
      }).parse(p);
      const { id, ...updates } = q;
      const updated = new SubjectRepository().update(id, updates);
      if (!updated) throw new Error('Subject not found');
      this.auditService.log({ user_id: ctx.userId, action: 'subject_updated', entity_type: 'subject', entity_id: id });
      return updated;
    });

    this.handle('subjects:delete', ['subjects.manage'], async (ctx, p) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(p);
      const success = new SubjectRepository().softDelete(id);
      if (!success) throw new Error('Subject not found');
      this.auditService.log({ user_id: ctx.userId, action: 'subject_deleted', entity_type: 'subject', entity_id: id });
      return success;
    });

    // ---------------------------------------------------------------- staff
    this.handle('staff:list', ['staff.manage', 'school.settings', 'reports.view_all'], async () => {
      return this.staffRepo.findAll({ orderBy: 'role, last_name, first_name' });
    });

    this.handle('staff:create', ['staff.manage'], async (ctx, p) => {
      const q = z.object({
        first_name: z.string().min(1).max(100),
        middle_name: z.string().max(100).optional(),
        last_name: z.string().min(1).max(100),
        email: z.string().email().max(200).optional(),
        phone: z.string().max(50).optional(),
        role: z.enum(['principal', 'secretary', 'teacher']),
        hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).parse(p);

      const existingCount = this.staffRepo.count({ role: q.role });
      const prefix = q.role === 'principal' ? 'P' : q.role === 'secretary' ? 'S' : 'T';
      let employee_number = `${prefix}${String(existingCount + 1).padStart(3, '0')}`;
      while (this.staffRepo.findByEmployeeNumber(employee_number)) {
        employee_number = `${employee_number}x`;
      }

      const created = this.staffRepo.create({
        employee_number,
        first_name: q.first_name,
        middle_name: q.middle_name,
        last_name: q.last_name,
        email: q.email,
        phone: q.phone,
        role: q.role,
        hire_date: q.hire_date || new Date().toISOString().slice(0, 10),
        is_active: true,
      });
      this.auditService.log({ user_id: ctx.userId, action: 'staff_created', entity_type: 'staff', entity_id: created.id, new_values: { employee_number } });
      return created;
    });

    this.handle('staff:update', ['staff.manage'], async (ctx, p) => {
      const q = z.object({
        id: z.string().min(1),
        first_name: z.string().min(1).max(100).optional(),
        last_name: z.string().min(1).max(100).optional(),
        email: z.string().email().max(200).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        role: z.enum(['principal', 'secretary', 'teacher']).optional(),
        is_active: z.boolean().optional(),
      }).parse(p);
      const { id, ...updates } = q;
      const updated = this.staffRepo.update(id, stripNulls(updates));
      if (!updated) throw new Error('Staff member not found');
      this.auditService.log({ user_id: ctx.userId, action: 'staff_updated', entity_type: 'staff', entity_id: id, new_values: updates as Record<string, unknown> });
      return updated;
    });

    // ---------------------------------------------------------------- users
    this.handle('users:list', ['users.manage'], async () => {
      return new UserRepository().findAll({ orderBy: 'role, full_name' }).map(u => {
        const { password_hash: _ph, ...safe } = u;
        return safe;
      });
    });

    this.handle('users:create', ['users.manage'], async (ctx, p) => {
      const q = z.object({
        full_name: z.string().min(2).max(150),
        email: z.string().email().max(200),
        password: z.string().min(8).max(200),
        role: z.enum(['principal', 'secretary', 'teacher']),
      }).parse(p);
      const repo = new UserRepository();
      if (repo.findByEmail(q.email.toLowerCase())) {
        throw new Error('A user with this email already exists');
      }
      const user = await repo.createUser(q);
      const staff = this.setupService.createLinkedStaff(user, q.role);
      this.auditService.log({ user_id: ctx.userId, action: 'user_created', entity_type: 'user', entity_id: user.id, new_values: { email: q.email, role: q.role } });
      const { password_hash: _ph, ...safe } = user;
      return { user: safe, staffId: staff.id };
    });

    this.handle('users:set-active', ['users.manage'], async (ctx, p) => {
      const q = z.object({ id: z.string().min(1), is_active: z.boolean() }).parse(p);
      const updated = new UserRepository().update(q.id, { is_active: q.is_active });
      if (!updated) throw new Error('User not found');
      this.auditService.log({ user_id: ctx.userId, action: q.is_active ? 'user_activated' : 'user_deactivated', entity_type: 'user', entity_id: q.id });
      const { password_hash: _ph, ...safe } = updated;
      return safe;
    });

    this.handle('users:reset-password', ['users.manage'], async (ctx, p) => {
      const q = z.object({
        id: z.string().min(1),
        newPassword: z.string().min(8).max(200),
      }).parse(p);
      const repo = new UserRepository();
      const user = repo.findById(q.id);
      if (!user) throw new Error('User not found');
      const success = await repo.updatePassword(q.id, q.newPassword);
      this.auditService.log({ user_id: ctx.userId, action: 'user_password_reset', entity_type: 'user', entity_id: q.id });
      return { success };
    });

    // ----------------------------------------------------------- attendance
    this.handle('attendance:open-session', ['attendance.manage', 'attendance.own_classes'], async (ctx, p) => {
      const q = z.object({
        class_id: z.string().min(1),
        stream_id: z.string().optional(),
        subject_id: z.string().optional(),
        session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      }).parse(p);
      const session = new AttendanceSessionRepository().getOrCreateSession({
        class_id: q.class_id,
        stream_id: q.stream_id,
        subject_id: q.subject_id,
        teacher_id: ctx.staffId,
        session_date: q.session_date,
        start_time: q.start_time || new Date().toTimeString().slice(0, 5),
      });
      return session;
    });

    this.handle('attendance:get-session', ['attendance.manage', 'attendance.own_classes', 'attendance.view_all'], async (_ctx, p) => {
      const q = z.object({ session_id: z.string().min(1) }).parse(p);
      const sessionRepo = new AttendanceSessionRepository();
      const recordRepo = new AttendanceRecordRepository();
      const session = sessionRepo.findById(q.session_id);
      if (!session) throw new Error('Session not found');
      return {
        session,
        records: recordRepo.findBySession(q.session_id),
        summary: recordRepo.getSessionSummary(q.session_id),
      };
    });

    this.handle('attendance:sessions-by-class-date', ['attendance.manage', 'attendance.own_classes', 'attendance.view_all'], async (_ctx, p) => {
      const q = z.object({
        class_id: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).parse(p);
      return new AttendanceSessionRepository().findByClassDate(q.class_id, q.date);
    });

    this.handle('attendance:mark', ['attendance.manage', 'attendance.own_classes'], async (ctx, p) => {
      const q = z.object({
        session_id: z.string().min(1),
        marks: z.array(z.object({
          student_id: z.string().min(1),
          status: z.enum(['present', 'absent', 'late', 'excused']),
          remarks: z.string().max(300).optional(),
        })).min(1).max(500),
      }).parse(p);
      const recordRepo = new AttendanceRecordRepository();
      const results = q.marks.map(m => recordRepo.markAttendance({
        session_id: q.session_id,
        student_id: m.student_id,
        status: m.status,
        remarks: m.remarks,
        recorded_by: ctx.staffId,
      }));
      return results;
    });

    this.handle('attendance:mark-all-present', ['attendance.manage', 'attendance.own_classes'], async (ctx, p) => {
      const q = z.object({
        session_id: z.string().min(1),
        student_ids: z.array(z.string().min(1)).min(1).max(500),
      }).parse(p);
      return new AttendanceRecordRepository().markAllPresent(q.session_id, ctx.staffId, q.student_ids);
    });

    this.handle('attendance:close-session', ['attendance.manage', 'attendance.own_classes'], async (ctx, p) => {
      const { session_id } = z.object({ session_id: z.string().min(1) }).parse(p);
      const session = new AttendanceSessionRepository().closeSession(session_id);
      if (!session) throw new Error('Session not found');
      this.auditService.log({
        user_id: ctx.userId,
        action: 'attendance_session_closed',
        entity_type: 'attendance_session',
        entity_id: session_id,
      });
      return session;
    });

    this.handle('attendance:submit-session', ['attendance.manage', 'attendance.own_classes'], async (ctx, p) => {
      const { session_id } = z.object({ session_id: z.string().min(1) }).parse(p);
      const session = new AttendanceSessionRepository().submitSession(session_id);
      if (!session) throw new Error('Session not found');
      this.auditService.log({
        user_id: ctx.userId,
        action: 'attendance_session_submitted',
        entity_type: 'attendance_session',
        entity_id: session_id,
      });
      return session;
    });

    this.handle('attendance:stats', ['attendance.manage', 'attendance.own_classes', 'attendance.view_all'], async (_ctx, p) => {
      const q = z.object({
        student_id: z.string().min(1),
        term_id: z.string().min(1),
      }).parse(p);
      return new AttendanceRecordRepository().getAttendanceStats(q.student_id, q.term_id);
    });

    // --------------------------------------------------------------- grades
    this.handle('grades:components-list', ['grades.manage', 'grades.own_subjects'], async (_ctx, p) => {
      const q = z.object({
        subject_id: z.string().optional(),
        academic_year_id: z.string().min(1),
        term_id: z.string().optional(),
      }).parse(p);
      const repo = new GradeComponentRepository();
      const components = q.subject_id
        ? repo.findBySubjectYear(q.subject_id, q.academic_year_id, q.term_id)
        : repo.findAll({ where: { academic_year_id: q.academic_year_id }, orderBy: 'name' });
      return components;
    });

    this.handle('grades:sheet-get-or-create', ['grades.manage', 'grades.own_subjects'], async (ctx, p) => {
      const q = z.object({
        class_id: z.string().min(1),
        stream_id: z.string().optional(),
        subject_id: z.string().min(1),
        academic_year_id: z.string().min(1),
        term_id: z.string().min(1),
      }).parse(p);
      const sheet = new GradeSheetRepository().getOrCreateSheet({
        class_id: q.class_id,
        stream_id: q.stream_id,
        subject_id: q.subject_id,
        teacher_id: ctx.staffId,
        academic_year_id: q.academic_year_id,
        term_id: q.term_id,
      });
      const students = new StudentRepository().findByClass(q.class_id);
      return {
        sheet,
        students: students.map(s => ({ id: s.id, full_name: `${s.first_name} ${s.last_name}`, admission_number: s.admission_number })),
      };
    });

    this.handle('grades:entries-get', ['grades.manage', 'grades.own_subjects'], async (_ctx, p) => {
      const { grade_sheet_id } = z.object({ grade_sheet_id: z.string().min(1) }).parse(p);
      return new GradeEntryRepository().findBySheet(grade_sheet_id);
    });

    this.handle('grades:entries-bulk-upsert', ['grades.manage', 'grades.submit', 'grades.own_subjects'], async (ctx, p) => {
      const q = z.object({
        grade_sheet_id: z.string().min(1),
        entries: z.array(z.object({
          student_id: z.string().min(1),
          component_id: z.string().min(1),
          score: z.number().min(0).max(1000).nullable(),
          is_draft: z.boolean().default(false),
        })).min(1).max(1000),
      }).parse(p);
      const repo = new GradeEntryRepository();
      return repo.bulkUpsert(q.entries.map(e => ({
        grade_sheet_id: q.grade_sheet_id,
        student_id: e.student_id,
        component_id: e.component_id,
        score: e.score,
        is_draft: e.is_draft,
        entered_by: ctx.staffId,
      })));
    });

    this.handle('grades:totals', ['grades.manage', 'grades.own_subjects', 'reports.view_all'], async (_ctx, p) => {
      const { grade_sheet_id } = z.object({ grade_sheet_id: z.string().min(1) }).parse(p);
      const totals = new GradeEntryRepository().calculateTotals(grade_sheet_id);
      return Array.from(totals.entries()).map(([studentId, t]) => ({ studentId, ...t }));
    });

    this.handle('grades:sheet-submit', ['grades.submit', 'grades.manage'], async (ctx, p) => {
      const { sheet_id } = z.object({ sheet_id: z.string().min(1) }).parse(p);
      // Finalize drafts before submission so nothing is silently lost.
      new GradeEntryRepository().finalizeDrafts(sheet_id);
      const sheet = new GradeSheetRepository().submitSheet(sheet_id, ctx.staffId);
      if (!sheet) throw new Error('Grade sheet not found');
      this.auditService.log({ user_id: ctx.userId, action: 'grade_sheet_submitted', entity_type: 'grade_sheet', entity_id: sheet_id });
      return sheet;
    });

    this.handle('grades:sheet-review', ['grades.manage'], async (ctx, p) => {
      const q = z.object({
        sheet_id: z.string().min(1),
        action: z.enum(['approved', 'returned']),
        remarks: z.string().max(1000).optional(),
      }).parse(p);
      const sheet = new GradeSheetRepository().reviewSheet(q.sheet_id, ctx.staffId, q.action, q.remarks);
      if (!sheet) throw new Error('Grade sheet not found');
      this.auditService.log({ user_id: ctx.userId, action: `grade_sheet_reviewed_${q.action}`, entity_type: 'grade_sheet', entity_id: q.sheet_id, new_values: { remarks: q.remarks } });
      return sheet;
    });

    this.handle('grades:sheet-approve', ['grades.approve'], async (ctx, p) => {
      const { sheet_id } = z.object({ sheet_id: z.string().min(1) }).parse(p);
      const sheet = new GradeSheetRepository().approveSheet(sheet_id, ctx.staffId);
      if (!sheet) throw new Error('Grade sheet not found');
      this.auditService.log({ user_id: ctx.userId, action: 'grade_sheet_approved', entity_type: 'grade_sheet', entity_id: sheet_id });
      return sheet;
    });

    this.handle('grades:sheet-publish', ['grades.publish'], async (ctx, p) => {
      const { sheet_id } = z.object({ sheet_id: z.string().min(1) }).parse(p);
      const sheet = new GradeSheetRepository().publishSheet(sheet_id, ctx.staffId);
      if (!sheet) throw new Error('Grade sheet not found');
      this.auditService.log({ user_id: ctx.userId, action: 'grade_sheet_published', entity_type: 'grade_sheet', entity_id: sheet_id });
      return sheet;
    });

    this.handle('grades:sheet-unlock', ['grades.manage'], async (ctx, p) => {
      const q = z.object({
        sheet_id: z.string().min(1),
        reason: z.string().min(1).max(500),
      }).parse(p);
      const sheet = new GradeSheetRepository().unlockSheet(q.sheet_id, q.reason, ctx.userId);
      if (!sheet) throw new Error('Grade sheet not found');
      // unlockSheet discards its params by design; the audit trail lives here.
      this.auditService.log({
        user_id: ctx.userId,
        action: 'grade_sheet_unlocked',
        entity_type: 'grade_sheet',
        entity_id: q.sheet_id,
        new_values: { reason: q.reason },
      });
      return sheet;
    });

    this.handle('grades:sheets-by-teacher', ['grades.manage', 'grades.own_subjects'], async (ctx, p) => {
      const q = z.object({
        academic_year_id: z.string().min(1),
        term_id: z.string().optional(),
      }).parse(p);
      return new GradeSheetRepository().findByTeacher(ctx.staffId, q.academic_year_id, q.term_id);
    });

    this.handle('grades:report-card', ['grades.manage', 'grades.own_subjects', 'reports.view_all'], async (_ctx, p) => {
      const q = z.object({
        student_id: z.string().min(1),
        class_id: z.string().min(1),
        academic_year_id: z.string().min(1),
        term_id: z.string().min(1),
      }).parse(p);
      return new ReportCardRepository().getOrCreate(q);
    });

    // ----------------------------------------------------------------- fees
    this.handle('fees:components-list', ['fees.manage', 'fees.collect'], async (_ctx, p) => {
      const { academic_year_id } = z.object({ academic_year_id: z.string().min(1) }).parse(p);
      return new FeeComponentRepository().findByAcademicYear(academic_year_id);
    });

    this.handle('fees:component-create', ['fees.manage'], async (ctx, p) => {
      const q = z.object({
        name: z.string().min(1).max(150),
        amount: z.number().int().min(0),
        frequency: z.enum(['once', 'term', 'monthly', 'annual']).default('term'),
        is_mandatory: z.boolean().default(true),
        academic_year_id: z.string().min(1),
        term_id: z.string().optional(),
        class_id: z.string().optional(),
      }).parse(p);
      const created = new FeeComponentRepository().create({ ...q, is_mandatory: q.is_mandatory });
      this.auditService.log({ user_id: ctx.userId, action: 'fee_component_created', entity_type: 'fee_component', entity_id: created.id, new_values: { name: q.name, amount: q.amount } });
      return created;
    });

    this.handle('fees:structure-get-or-default', ['fees.manage', 'fees.collect'], async (_ctx, p) => {
      const q = z.object({
        academic_year_id: z.string().min(1),
        term_id: z.string().optional(),
        class_id: z.string().optional(),
      }).parse(p);
      const structure = new FeeStructureRepository().getOrCreateDefault(q.academic_year_id, q.term_id, q.class_id);
      return { structure, components: new FeeComponentRepository().findByStructure(structure.id) };
    });

    this.handle('fees:structure-add-component', ['fees.manage'], async (_ctx, p) => {
      const q = z.object({
        structure_id: z.string().min(1),
        component_id: z.string().min(1),
      }).parse(p);
      new FeeStructureRepository().addComponent(q.structure_id, q.component_id);
      return new FeeComponentRepository().findByStructure(q.structure_id);
    });

    this.handle('fees:bills-generate', ['fees.manage'], async (ctx, p) => {
      const q = z.object({
        structure_id: z.string().min(1),
        academic_year_id: z.string().min(1),
        term_id: z.string().min(1),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).parse(p);
      const bills = new FeeBillRepository().generateBillsForStructure(q.structure_id, q.academic_year_id, q.term_id, ctx.staffId, q.due_date);
      this.auditService.log({
        user_id: ctx.userId,
        action: 'fee_bills_generated',
        entity_type: 'fee_structure',
        entity_id: q.structure_id,
        new_values: { count: bills.length, due_date: q.due_date },
      });
      return bills;
    });

    this.handle('fees:bills-list', ['fees.manage', 'fees.collect', 'reports.view_all'], async (_ctx, p) => {
      const q = z.object({
        academic_year_id: z.string().min(1),
        term_id: z.string().min(1),
        class_id: z.string().optional(),
        student_id: z.string().optional(),
      }).parse(p);
      const repo = new FeeBillRepository();
      if (q.student_id) return repo.findByStudent(q.student_id);
      return repo.findByTerm(q.academic_year_id, q.term_id, q.class_id);
    });

    this.handle('fees:payments-list', ['fees.manage', 'fees.collect'], async (_ctx, p) => {
      const q = z.object({ bill_id: z.string().min(1) }).parse(p);
      return new FeePaymentRepository().findByBill(q.bill_id);
    });

    this.handle('fees:payment-record', ['fees.collect', 'fees.manage'], async (ctx, p) => {
      const q = z.object({
        bill_id: z.string().min(1),
        amount: z.number().int().min(1),
        method: z.enum(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card', 'other']),
        reference_number: z.string().max(100).optional(),
        payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).parse(p);
      const bill = new FeeBillRepository().findById(q.bill_id);
      if (!bill) throw new Error('Bill not found');

      const payment = new FeePaymentRepository().recordPayment({
        bill_id: q.bill_id,
        student_id: bill.student_id,
        amount: q.amount,
        method: q.method,
        reference_number: q.reference_number,
        payment_date: q.payment_date || new Date().toISOString().slice(0, 10),
        received_by: ctx.staffId,
        academic_year_id: bill.academic_year_id,
      });

      this.auditService.log({
        user_id: ctx.userId,
        action: 'fee_payment_recorded',
        entity_type: 'fee_payment',
        entity_id: payment.id,
        new_values: { bill_id: q.bill_id, amount: q.amount, method: q.method, receipt: payment.receipt_number },
      });
      return { payment, bill: new FeeBillRepository().findById(q.bill_id) };
    });

    this.handle('fees:payment-void', ['fees.manage'], async (ctx, p) => {
      const q = z.object({
        payment_id: z.string().min(1),
        reason: z.string().min(1).max(500),
      }).parse(p);
      const payment = new FeePaymentRepository().voidPayment(q.payment_id, ctx.staffId, q.reason);
      if (!payment) throw new Error('Payment not found');
      this.auditService.log({
        user_id: ctx.userId,
        action: 'fee_payment_voided',
        entity_type: 'fee_payment',
        entity_id: q.payment_id,
        new_values: { reason: q.reason },
      });
      return payment;
    });

    this.handle('fees:debtors', ['fees.manage', 'fees.collect', 'reports.view_all'], async (_ctx, p) => {
      const q = z.object({
        academic_year_id: z.string().min(1),
        term_id: z.string().min(1),
      }).parse(p);
      return new FeeBillRepository().getDebtorsList(q.academic_year_id, q.term_id);
    });

    this.handle('fees:collection-report', ['fees.manage', 'fees.collect', 'reports.view_all'], async (_ctx, p) => {
      const q = z.object({
        academic_year_id: z.string().min(1),
        term_id: z.string().optional(),
        class_id: z.string().optional(),
      }).parse(p);
      return new FeePaymentRepository().getCollectionReport(q.academic_year_id, q.term_id, q.class_id);
    });

    // -------------------------------------------------------------- schools
    this.handle('schools:get', null, async () => {
      const school = new SchoolRepository().getSettings();
      const year = new AcademicYearRepository().getCurrent();
      const term = new TermRepository().getCurrent();
      return { school, academicYear: year, term };
    });

    this.handle('schools:update', ['school.settings', 'school.branding'], async (ctx, p) => {
      const q = z.object({
        name: z.string().min(1).max(200).optional(),
        motto: z.string().max(300).nullable().optional(),
        address: z.string().max(500).nullable().optional(),
        country: z.string().min(1).max(100).optional(),
        currency: z.string().min(1).max(10).optional(),
        primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
        grading_scale: z.string().max(100).optional(),
        report_template: z.string().max(100).optional(),
        receipt_template: z.string().max(100).optional(),
        usage_mode: z.enum(['shared', 'network']).optional(),
        backup_folder: z.string().max(500).nullable().optional(),
      }).parse(p);
      const repo = new SchoolRepository();
      const existing = repo.getSettings();
      if (!existing) throw new Error('School profile not found — complete setup first');
      const updated = repo.update(existing.id, stripNulls(q));
      this.auditService.log({ user_id: ctx.userId, action: 'school_settings_updated', entity_type: 'school', entity_id: existing.id, new_values: q as Record<string, unknown> });
      return updated;
    });

    // ------------------------------------------------------------ academic
    this.handle('academic:years-list', null, async () => {
      return new AcademicYearRepository().findAll({ orderBy: 'name' });
    });

    this.handle('academic:terms-list', null, async (_ctx, p) => {
      const { academic_year_id } = z.object({ academic_year_id: z.string().min(1) }).parse(p);
      return new TermRepository().getByAcademicYear(academic_year_id);
    });

    this.handle('academic:year-create', ['school.settings'], async (ctx, p) => {
      const q = z.object({
        name: z.string().min(1).max(20),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        is_current: z.boolean().default(false),
      }).parse(p);
      const created = new AcademicYearRepository().create({ ...q, is_current: q.is_current });
      this.auditService.log({ user_id: ctx.userId, action: 'academic_year_created', entity_type: 'academic_year', entity_id: created.id, new_values: { name: q.name } });
      return created;
    });

    this.handle('academic:set-current-year', ['school.settings'], async (ctx, p) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(p);
      new AcademicYearRepository().setCurrent(id);
      this.auditService.log({ user_id: ctx.userId, action: 'academic_year_set_current', entity_type: 'academic_year', entity_id: id });
      return { success: true };
    });

    this.handle('academic:term-create', ['school.settings'], async (ctx, p) => {
      const q = z.object({
        academic_year_id: z.string().min(1),
        name: z.string().min(1).max(50),
        ordinal: z.number().int().min(1).max(4),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        is_current: z.boolean().default(false),
      }).parse(p);
      const created = new TermRepository().create({ ...q, is_current: q.is_current, is_closed: false });
      this.auditService.log({ user_id: ctx.userId, action: 'term_created', entity_type: 'term', entity_id: created.id, new_values: { name: q.name } });
      return created;
    });

    this.handle('academic:set-current-term', ['school.settings'], async (ctx, p) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(p);
      new TermRepository().setCurrent(id);
      this.auditService.log({ user_id: ctx.userId, action: 'term_set_current', entity_type: 'term', entity_id: id });
      return { success: true };
    });

    this.handle('academic:term-close', ['school.settings'], async (ctx, p) => {
      const q = z.object({
        id: z.string().min(1),
        reason: z.string().min(1).max(500),
      }).parse(p);
      const term = new TermRepository().closeTerm(q.id, ctx.userId, q.reason);
      if (!term) throw new Error('Term not found');
      this.auditService.log({ user_id: ctx.userId, action: 'term_closed', entity_type: 'term', entity_id: q.id, new_values: { reason: q.reason } });
      return term;
    });

    this.handle('academic:term-reopen', ['school.settings'], async (ctx, p) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(p);
      const term = new TermRepository().reopenTerm(id);
      if (!term) throw new Error('Term not found');
      this.auditService.log({ user_id: ctx.userId, action: 'term_reopened', entity_type: 'term', entity_id: id });
      return term;
    });

    // ------------------------------------------------------------ settings
    this.handle('settings:get-all', null, async () => {
      return new SettingRepository().getAll();
    });

    this.handle('settings:set', ['school.settings'], async (ctx, p) => {
      const q = z.object({
        key: z.string().regex(/^[a-z0-9_.-]+$/).min(1).max(200),
        value: z.string().max(5000),
        description: z.string().max(300).optional(),
        is_public: z.boolean().default(false),
      }).parse(p);
      new SettingRepository().set(q.key, q.value, q.description, q.is_public);
      this.auditService.log({ user_id: ctx.userId, action: 'setting_changed', entity_type: 'setting', entity_id: q.key, new_values: { value: q.value } });
      return { success: true };
    });

    // ------------------------------------------------------------- backups
    this.handle('backup:create', ['backup.manage'], async (ctx, p) => {
      const q = z.object({ type: z.enum(['manual', 'auto', 'pre_migration', 'pre_import']).default('manual') }).parse(p);
      const result = await this.backupService.createBackup(q);
      if (result.success) {
        this.auditService.log({ user_id: ctx.userId, action: 'backup_created_manual', entity_type: 'backup', entity_id: result.filename || result.filePath || undefined });
      }
      return result;
    });
  }

  /**
   * Standard handler wrapper: auth context + permission check + envelope.
   * @param permissions null = any authenticated user; array = any listed permission.
   */
  private handle<T>(
    channel: string,
    permissions: string[] | null,
    fn: (ctx: IpcContext, payload: Record<string, unknown>) => T | Promise<T>,
  ): void {
    ipcMain.handle(channel, async (_event, payload: Record<string, unknown> = {}) => {
      try {
        const token = typeof payload.token === 'string' ? payload.token : undefined;
        const ctx = this.requireContext(token, permissions);
        const data = await fn(ctx, payload);
        return ok(data);
      } catch (error) {
        logger.warn({ channel, error: errorMessage(error) }, 'IPC handler failed');
        return errorCoded(error);
      }
    });
  }

  private requireContext(token: string | undefined, permissions: string[] | null): IpcContext {
    if (!token) throw new Error('Unauthorized');
    const payload = this.authService.verifyAccessToken(token);
    if (!payload) throw new Error('Unauthorized');

    if (permissions && permissions.length > 0) {
      const allowed = permissions.some(p => hasPermission(payload.role as Role, p));
      if (!allowed) throw new Error('Forbidden');
    }

    const staff = this.staffRepo.findAll({ where: { user_id: payload.userId }, limit: 1 })[0];
    return {
      userId: payload.userId,
      role: payload.role as Role,
      sessionId: payload.sessionId,
      staffId: staff?.id ?? '',
    };
  }

  private getDashboardOverview(): {
    school: ReturnType<SchoolRepository['getSettings']>;
    currentYear: ReturnType<AcademicYearRepository['getCurrent']>;
    currentTerm: ReturnType<TermRepository['getCurrent']>;
    stats: {
      students: number;
      staff: number;
      billsDue: number;
      collected: number;
      collectionRate: number;
      attendanceTodayRate: number | null;
    };
    recentActivity: ReturnType<AuditLogRepository['findAll']>;
    lastBackup: string | null;
  } {
    const school = new SchoolRepository().getSettings();
    const year = new AcademicYearRepository().getCurrent();
    const term = new TermRepository().getCurrent();

    const studentRepo = new StudentRepository();
    const students = studentRepo.count({ status: 'active' });
    const staffCount = this.staffRepo.count({ is_active: 1 });

    let billsDue = 0;
    let collected = 0;
    if (year && term) {
      const bills = new FeeBillRepository().findByTerm(year.id, term.id);
      for (const bill of bills) {
        if (bill.status !== 'voided') billsDue += bill.total_amount;
        collected += bill.paid_amount;
      }
    }

    const recordRepo = new AttendanceRecordRepository();
    let attendanceTodayRate: number | null = null;
    if (year && term) {
      const today = new Date().toISOString().slice(0, 10);
      const row = this.staffRepo.queryOne<{ total: number; present: number }>(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present
         FROM attendance_records ar
         JOIN attendance_sessions s ON ar.session_id = s.id
         WHERE s.session_date = ? AND ar.deleted_at IS NULL AND s.deleted_at IS NULL`,
        [today]
      );
      if (row && row.total > 0) {
        attendanceTodayRate = Math.round((row.present / row.total) * 100);
      }
    }

    const auditRepo = new AuditLogRepository();
    const recentActivity = auditRepo.findAll({ orderBy: 'created_at', orderDir: 'DESC', limit: 10 });

    const lastBackup = this.backupService.getBackupHistory(1)[0]?.completed_at || null;

    return {
      school,
      currentYear: year,
      currentTerm: term,
      stats: {
        students,
        staff: staffCount,
        billsDue,
        collected,
        collectionRate: billsDue > 0 ? Math.round((collected / billsDue) * 100) : 0,
        attendanceTodayRate,
      },
      recentActivity,
      lastBackup,
    };
  }
}
