import { z } from 'zod';
import { runInTransaction } from '../db/connection';
import { SchoolRepository, AcademicYearRepository, TermRepository } from '../repositories/school';
import { UserRepository } from '../repositories/user';
import { StaffRepository, SubjectRepository, ClassRepository } from '../repositories/staff';
import { StudentRepository } from '../repositories/student';
import { SettingRepository } from '../repositories/system';
import { FeeComponentRepository, FeeStructureRepository, FeeBillRepository } from '../repositories/fees';
import { AuditLogService } from './export-import';
import pino from 'pino';
import type { FeeComponent, FeeBill, Staff, Student, Subject, User } from '../types/database';

const logger = pino({ name: 'service:setup' });

const schoolSchema = z.object({
  name: z.string().min(1).max(200),
  motto: z.string().max(300).optional(),
  address: z.string().max(500).optional(),
  country: z.string().min(1).max(100).default('Nigeria'),
  currency: z.string().min(1).max(10).default('NGN'),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#d8ed88'),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  academic_year: z.string().min(1).max(20).default('2026/2027'),
  terms_per_year: z.number().int().min(1).max(4).default(3),
  grading_scale: z.string().max(100).default('West African'),
  usage_mode: z.enum(['shared', 'network']).default('shared'),
  backup_folder: z.string().max(500).optional(),
});

const principalSchema = z.object({
  full_name: z.string().min(2).max(150),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

const academicYearSchema = z.object({
  name: z.string().min(1).max(20),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const termSchema = z.object({
  name: z.string().min(1).max(50),
  ordinal: z.number().int().min(1).max(4),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const completeSetupSchema = z.object({
  school: schoolSchema,
  academicYear: academicYearSchema,
  terms: z.array(termSchema).min(1).max(4),
  principal: principalSchema,
  seedSampleData: z.boolean().default(false),
});

export type CompleteSetupInput = z.infer<typeof completeSetupSchema>;

export interface SetupStatus {
  completed: boolean;
  hasSchool: boolean;
  hasUsers: boolean;
  hasCurrentTerm: boolean;
}

const SAMPLE_SUBJECTS: Array<{ code: string; name: string; is_core: number }> = [
  { code: 'ENG', name: 'English Language', is_core: 1 },
  { code: 'MTH', name: 'Mathematics', is_core: 1 },
  { code: 'BSC', name: 'Basic Science', is_core: 1 },
  { code: 'SST', name: 'Social Studies', is_core: 1 },
  { code: 'CIV', name: 'Civic Education', is_core: 1 },
  { code: 'CRS', name: 'Christian Religious Studies', is_core: 0 },
  { code: 'IRS', name: 'Islamic Religious Studies', is_core: 0 },
  { code: 'CCA', name: 'Cultural & Creative Arts', is_core: 0 },
  { code: 'PHE', name: 'Physical & Health Education', is_core: 0 },
  { code: 'COM', name: 'Computer Studies', is_core: 0 },
  { code: 'YOR', name: 'Yoruba Language', is_core: 0 },
  { code: 'HAU', name: 'Hausa Language', is_core: 0 },
];

const SAMPLE_CLASSES = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3'];

const SAMPLE_FEE_COMPONENTS = [
  { name: 'Tuition', amount: 25000, is_mandatory: 1 },
  { name: 'Books & Materials', amount: 8000, is_mandatory: 1 },
  { name: 'PTA Levy', amount: 2000, is_mandatory: 0 },
];

export class SetupService {
  private schoolRepo = new SchoolRepository();
  private yearRepo = new AcademicYearRepository();
  private termRepo = new TermRepository();
  private userRepo = new UserRepository();
  private staffRepo = new StaffRepository();
  private settingRepo = new SettingRepository();
  private auditService = new AuditLogService();

  getSetupStatus(): SetupStatus {
    const hasSchool = this.schoolRepo.getSettings() !== null;
    const hasUsers = this.userRepo.count({}) > 0;
    const hasCurrentTerm = this.termRepo.getCurrent() !== null;
    return {
      completed: hasSchool && hasUsers && hasCurrentTerm,
      hasSchool,
      hasUsers,
      hasCurrentTerm,
    };
  }

  /**
   * First-run completion: creates the school row, academic year, terms and the
   * principal account with its linked staff record, inside one transaction.
   * Refuses to run twice.
   */
  async completeSetup(input: CompleteSetupInput): Promise<{
    schoolId: string;
    academicYearId: string;
    termIds: string[];
    userId: string;
    staffId: string;
  }> {
    const status = this.getSetupStatus();
    if (status.completed) {
      throw new Error('Setup has already been completed for this installation');
    }

    const data = completeSetupSchema.parse(input);

    // 3. Principal account (async - must be outside the transaction)
    const principal = await this.userRepo.createUser({
      email: data.principal.email,
      password: data.principal.password,
      full_name: data.principal.full_name,
      role: 'principal',
    });

    const result = runInTransaction(() => {
      // 1. School profile (reuses the single schools row if one exists)
      const school = this.schoolRepo.initialize({
        name: data.school.name,
        motto: data.school.motto,
        address: data.school.address,
        country: data.school.country,
        currency: data.school.currency,
        primary_color: data.school.primary_color,
        secondary_color: data.school.secondary_color,
        academic_year: data.school.academic_year,
        terms_per_year: data.school.terms_per_year,
        grading_scale: data.school.grading_scale,
        usage_mode: data.school.usage_mode,
        backup_folder: data.school.backup_folder,
        report_template: 'Classic',
        receipt_template: 'Compact',
      });

      // 2. Academic year + terms
      const year = this.yearRepo.create({
        name: data.academicYear.name,
        start_date: data.academicYear.start_date,
        end_date: data.academicYear.end_date,
        is_current: true,
      });

      const termIds: string[] = [];
      for (const term of [...data.terms].sort((a, b) => a.ordinal - b.ordinal)) {
        const created = this.termRepo.create({
          academic_year_id: year.id,
          name: term.name,
          ordinal: term.ordinal,
          start_date: term.start_date,
          end_date: term.end_date,
          is_current: term.ordinal === 1,
          is_closed: false,
        });
        termIds.push(created.id);
      }

      // 3. Linked staff record (P0-4)
      const staff = this.createLinkedStaff(principal, 'principal');

      // 4. Mark setup complete
      this.settingRepo.set('setup.completed', 'true', 'First-run setup has been completed', true);
      this.settingRepo.set('setup.completed_at', new Date().toISOString(), 'When setup finished', true);
      if (data.school.backup_folder) {
        this.settingRepo.set('backup.folder', data.school.backup_folder, 'Backup storage folder', true);
      }

      this.auditService.log({
        user_id: principal.id,
        action: 'setup.completed',
        entity_type: 'school',
        entity_id: school.id,
        new_values: { school_name: data.school.name, academic_year: data.academicYear.name, terms: data.terms.length },
      });

      if (data.seedSampleData) {
        this.seedSampleData(year.id, termIds[0], staff.id);
      }

      return { schoolId: school.id, academicYearId: year.id, termIds, userId: principal.id, staffId: staff.id };
    });

    logger.info({ schoolId: result.schoolId, userId: result.userId }, 'First-run setup completed');
    return result;
  }

  /**
   * Every user account must have a linked staff record: attendance, grade and
   * fee actions all reference staff(id) in their foreign keys.
   */
  createLinkedStaff(user: User, role: User['role'], extras?: { phone?: string; hireDate?: string }): Staff {
    const nameParts = user.full_name.trim().split(/\s+/);
    const first_name = nameParts[0] || user.full_name;
    const last_name = nameParts.length > 1 ? nameParts[nameParts.length - 1] : user.full_name;

    const prefix = role === 'principal' ? 'P' : role === 'secretary' ? 'S' : 'T';
    const existingCount = this.staffRepo.count({ role });
    let employee_number = `${prefix}${String(existingCount + 1).padStart(3, '0')}`;

    if (this.staffRepo.findByEmployeeNumber(employee_number)) {
      employee_number = `${employee_number}-${user.id.slice(0, 4)}`;
    }

    return this.staffRepo.create({
      employee_number,
      first_name,
      last_name,
      email: user.email,
      phone: extras?.phone,
      role,
      hire_date: extras?.hireDate || new Date().toISOString().slice(0, 10),
      is_active: true,
      user_id: user.id,
    });
  }

  /**
   * Practice/sample data so the school can explore the app before real records
   * exist: subjects, classes, students and term fee bills. Idempotent per row.
   */
  seedSampleData(academicYearId: string, termId: string, generatedByStaffId: string): {
    subjects: number;
    classes: number;
    students: number;
    bills: number;
  } {
    // Subjects (unique by code)
    const subjectRepo = new SubjectRepository();
    const newSubjects = SAMPLE_SUBJECTS
      .filter(s => !subjectRepo.findByCode(s.code))
      .map(s => ({ code: s.code, name: s.name, is_core: s.is_core }));
    if (newSubjects.length > 0) {
      subjectRepo.createBatch(newSubjects as unknown as Array<Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>);
    }
    const subjects = subjectRepo.findAll({ orderBy: 'name' });

    // Classes for the academic year
    const classRepo = new ClassRepository();
    const newClasses = SAMPLE_CLASSES
      .filter(name => classRepo.findAll({ where: { academic_year_id: academicYearId, name }, limit: 1 }).length === 0)
      .map(name => ({ name, academic_year_id: academicYearId, capacity: 40 }));
    if (newClasses.length > 0) {
      classRepo.createBatch(newClasses);
    }
    const classes = classRepo.findByAcademicYear(academicYearId);

    // Students: 3 per class, assigned to classes
    const studentRepo = new StudentRepository();
    const year = this.yearRepo.findById(academicYearId);
    const admissionYear = year ? year.name.slice(0, 4) : String(new Date().getFullYear());
    const students: Student[] = [];
    let seq = 1;

    for (const klass of classes) {
      for (let i = 1; i <= 3; i++) {
        const admission_number = `STU-${admissionYear}-${String(seq).padStart(4, '0')}`;
        if (studentRepo.findByAdmissionNumber(admission_number)) {
          seq++;
          continue;
        }
        const firstNames = ['Amina', 'Chidi', 'Fatima', 'Emeka', 'Ngozi', 'Tunde', 'Zainab', 'Ibrahim', 'Adaeze', 'Musa', 'Kemi', 'Obinna'];
        const lastNames = ['Abubakar', 'Okafor', 'Bello', 'Eze', 'Adeyemi', 'Danjuma', 'Okonkwo', 'Lawal', 'Nwachukwu', 'Sani'];
        const first = firstNames[(seq + i) % firstNames.length];
        const last = lastNames[seq % lastNames.length];

        students.push(studentRepo.create({
          admission_number,
          first_name: first,
          last_name: last,
          date_of_birth: `${Number(admissionYear) - 6 - (seq % 8)}-0${(seq % 9) + 1}-1${(seq % 9)}`,
          gender: seq % 2 === 0 ? 'M' : 'F',
          enrollment_date: new Date().toISOString().slice(0, 10),
          status: 'active',
          class_id: klass.id,
        }));
        seq++;
      }
    }

    // Fee components + default structure + bills for the first term
    const feeComponentRepo = new FeeComponentRepository();
    const feeStructureRepo = new FeeStructureRepository();
    const feeBillRepo = new FeeBillRepository();

    const newComponents = SAMPLE_FEE_COMPONENTS.filter(
      c => feeComponentRepo.findAll({ where: { name: c.name, academic_year_id: academicYearId }, limit: 1 }).length === 0
    );
    if (newComponents.length > 0) {
      feeComponentRepo.createBatch(newComponents as unknown as Array<Omit<FeeComponent, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>);
    }

    const allComponents = feeComponentRepo.findByAcademicYear(academicYearId).slice(0, 3);
    const structure = feeStructureRepo.getOrCreateDefault(academicYearId, termId);
    for (const component of allComponents) {
      feeStructureRepo.addComponent(structure.id, component.id);
    }

    const billTotal = allComponents.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const now = new Date().toISOString();
    let billCount = 0;

    for (const student of students) {
      const existing = feeBillRepo.findAll({ where: { student_id: student.id, term_id: termId }, limit: 1 });
      if (existing.length > 0) continue;
      feeBillRepo.create({
        student_id: student.id,
        academic_year_id: academicYearId,
        term_id: termId,
        fee_structure_id: structure.id,
        total_amount: billTotal,
        paid_amount: 0,
        balance: billTotal,
        status: 'pending',
        due_date: dueDate,
        generated_at: now,
        generated_by: generatedByStaffId,
      });
      billCount++;
    }

    logger.info(
      { subjects: subjects.length, classes: classes.length, students: students.length, bills: billCount },
      'Sample data seeded'
    );

    return { subjects: subjects.length, classes: classes.length, students: students.length, bills: billCount };
  }
}
