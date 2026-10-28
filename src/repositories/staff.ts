import { BaseRepository } from './base';
import { Staff, Class, Stream, Subject, TeachingAssignment, HomeroomAssignment } from '../types/database';
import { getDatabase, runInTransaction } from '../db/connection';
import pino from 'pino';

const logger = pino({ name: 'repository:staff' });

export class StaffRepository extends BaseRepository<Staff> {
  protected tableName = 'staff';
  protected primaryKey = 'id';
  protected columns = ['employee_number', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 'role', 'hire_date', 'is_active', 'user_id'];

  findByEmployeeNumber(employeeNumber: string): Staff | null {
    return this.findAll({ where: { employee_number: employeeNumber }, limit: 1 })[0] || null;
  }

  findByRole(role: Staff['role']): Staff[] {
    return this.findAll({ where: { role, is_active: 1 }, orderBy: 'last_name, first_name' });
  }

  getTeachers(): Staff[] {
    return this.findByRole('teacher');
  }

  getSecretaries(): Staff[] {
    return this.findByRole('secretary');
  }

  getPrincipals(): Staff[] {
    return this.findByRole('principal');
  }
}

export class ClassRepository extends BaseRepository<Class> {
  protected tableName = 'classes';
  protected primaryKey = 'id';
  protected columns = ['name', 'academic_year_id', 'capacity', 'homeroom_teacher_id'];

  findByAcademicYear(academicYearId: string): Class[] {
    return this.findAll({ where: { academic_year_id: academicYearId }, orderBy: 'name' });
  }

  getWithStreams(classId: string): (Class & { streams: Stream[] }) | null {
    const class_ = this.findById(classId);
    if (!class_) return null;

    const streams = this.db.prepare('SELECT * FROM streams WHERE class_id = ? AND deleted_at IS NULL ORDER BY name').all(classId) as Stream[];
    return { ...class_, streams };
  }

  getStudentCount(classId: string, streamId?: string): number {
    let sql = 'SELECT COUNT(*) as count FROM students WHERE class_id = ? AND status = "active" AND deleted_at IS NULL';
    const params = [classId];
    if (streamId) {
      sql += ' AND stream_id = ?';
      params.push(streamId);
    }
    const row = this.db.prepare(sql).get(...params) as { count: number };
    return row.count;
  }

  isAtCapacity(classId: string, streamId?: string): boolean {
    const class_ = this.findById(classId);
    if (!class_ || !class_.capacity) return false;
    const count = this.getStudentCount(classId, streamId);
    return count >= class_.capacity;
  }
}

export class StreamRepository extends BaseRepository<Stream> {
  protected tableName = 'streams';
  protected primaryKey = 'id';
  protected columns = ['class_id', 'name', 'capacity'];

  findByClass(classId: string): Stream[] {
    return this.findAll({ where: { class_id: classId }, orderBy: 'name' });
  }
}

export class SubjectRepository extends BaseRepository<Subject> {
  protected tableName = 'subjects';
  protected primaryKey = 'id';
  protected columns = ['code', 'name', 'is_core'];

  findByCode(code: string): Subject | null {
    return this.findAll({ where: { code }, limit: 1 })[0] || null;
  }

  getCoreSubjects(): Subject[] {
    return this.findAll({ where: { is_core: 1 }, orderBy: 'name' });
  }

  getElectiveSubjects(): Subject[] {
    return this.findAll({ where: { is_core: 0 }, orderBy: 'name' });
  }
}

export class TeachingAssignmentRepository extends BaseRepository<TeachingAssignment> {
  protected tableName = 'teaching_assignments';
  protected primaryKey = 'id';
  protected columns = ['teacher_id', 'subject_id', 'class_id', 'stream_id', 'academic_year_id', 'term_id'];

  findByTeacher(teacherId: string, academicYearId: string): TeachingAssignment[] {
    return this.findAll({ where: { teacher_id: teacherId, academic_year_id: academicYearId }, orderBy: 'class_id, subject_id' });
  }

  findByClassSubject(classId: string, subjectId: string, academicYearId: string): TeachingAssignment[] {
    return this.findAll({ where: { class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });
  }

  getTeacherSubjects(teacherId: string, academicYearId: string, termId?: string): TeachingAssignment[] {
    let sql = `
      SELECT ta.*, s.code as subject_code, s.name as subject_name, c.name as class_name, st.name as stream_name
      FROM teaching_assignments ta
      JOIN subjects s ON ta.subject_id = s.id
      JOIN classes c ON ta.class_id = c.id
      LEFT JOIN streams st ON ta.stream_id = st.id
      WHERE ta.teacher_id = ? AND ta.academic_year_id = ? AND ta.deleted_at IS NULL
    `;
    const params = [teacherId, academicYearId];
    if (termId) {
      sql += ' AND (ta.term_id IS NULL OR ta.term_id = ?)';
      params.push(termId);
    }
    return this.query(sql, params);
  }

  assignTeacher(data: Omit<TeachingAssignment, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): TeachingAssignment {
    const existing = this.findAll({
      where: {
        teacher_id: data.teacher_id,
        subject_id: data.subject_id,
        class_id: data.class_id,
        stream_id: data.stream_id,
        academic_year_id: data.academic_year_id,
        term_id: data.term_id,
      },
      limit: 1,
    })[0];

    if (existing) return existing;
    return this.create(data);
  }
}

export class HomeroomAssignmentRepository extends BaseRepository<HomeroomAssignment> {
  protected tableName = 'homeroom_assignments';
  protected primaryKey = 'id';
  protected columns = ['teacher_id', 'class_id', 'academic_year_id'];

  findByTeacher(teacherId: string, academicYearId: string): HomeroomAssignment[] {
    return this.findAll({ where: { teacher_id: teacherId, academic_year_id: academicYearId } });
  }

  findByClass(classId: string, academicYearId: string): HomeroomAssignment | null {
    return this.findAll({ where: { class_id: classId, academic_year_id: academicYearId }, limit: 1 })[0] || null;
  }

  assignHomeroomTeacher(data: Omit<HomeroomAssignment, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): HomeroomAssignment {
    const existing = this.findByClass(data.class_id, data.academic_year_id);
    if (existing) {
      return this.update(existing.id, { teacher_id: data.teacher_id })!;
    }
    return this.create(data);
  }
}