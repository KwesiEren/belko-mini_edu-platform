import { BaseRepository } from './base';
import { Student, Guardian, StudentGuardian } from '../types/database';
import { getDatabase, runInTransaction } from '../db/connection';
import pino from 'pino';

const logger = pino({ name: 'repository:student' });

export class StudentRepository extends BaseRepository<Student> {
  protected tableName = 'students';
  protected primaryKey = 'id';
  protected columns = [
    'admission_number', 'first_name', 'middle_name', 'last_name', 'date_of_birth',
    'gender', 'photo_url', 'address', 'phone', 'email', 'enrollment_date',
    'status', 'status_changed_at', 'status_changed_by', 'status_reason',
    'class_id', 'stream_id'
  ];

  findByAdmissionNumber(admissionNumber: string): Student | null {
    return this.findAll({ where: { admission_number: admissionNumber }, limit: 1 })[0] || null;
  }

  findByClass(classId: string, includeInactive = false): Student[] {
    const where: Record<string, unknown> = { class_id: classId };
    if (!includeInactive) {
      where.status = 'active';
    }
    return this.findAll({ where, orderBy: 'last_name, first_name' });
  }

  findByStream(streamId: string, includeInactive = false): Student[] {
    const where: Record<string, unknown> = { stream_id: streamId };
    if (!includeInactive) {
      where.status = 'active';
    }
    return this.findAll({ where, orderBy: 'last_name, first_name' });
  }

  search(query: string, limit = 50): Student[] {
    const sql = `
      SELECT * FROM students
      WHERE deleted_at IS NULL
      AND (
        first_name LIKE ? OR
        last_name LIKE ? OR
        middle_name LIKE ? OR
        admission_number LIKE ? OR
        email LIKE ?
      )
      ORDER BY last_name, first_name
      LIMIT ?
    `;
    const param = `%${query}%`;
    return this.query(sql, [param, param, param, param, param, limit]);
  }

  getByIds(ids: string[]): Student[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    return this.query(
      `SELECT * FROM students WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    );
  }

  changeStatus(
    studentId: string,
    status: Student['status'],
    changedBy: string,
    reason?: string
  ): Student | null {
    const now = this.getNow();
    return this.update(studentId, {
      status,
      status_changed_at: now,
      status_changed_by: changedBy,
      status_reason: reason,
    });
  }

  assignToClass(studentId: string, classId: string, streamId?: string): Student | null {
    return this.update(studentId, { class_id: classId, stream_id: streamId });
  }

  unassignFromClass(studentId: string): Student | null {
    return this.update(studentId, { class_id: undefined, stream_id: undefined });
  }

  getSiblings(studentId: string): Student[] {
    const student = this.findById(studentId);
    if (!student || !student.email) return [];

    return this.findAll({
      where: { email: student.email },
      includeDeleted: false,
    }).filter(s => s.id !== studentId);
  }

  getWithGuardians(studentId: string): (Student & { guardians: Guardian[] }) | null {
    const student = this.findById(studentId);
    if (!student) return null;

    const guardians = this.db.prepare(`
      SELECT g.* FROM guardians g
      JOIN student_guardians sg ON g.id = sg.guardian_id
      WHERE sg.student_id = ? AND g.deleted_at IS NULL
      ORDER BY g.is_primary DESC
    `).all(studentId) as Guardian[];

    return { ...student, guardians };
  }
}

export class GuardianRepository extends BaseRepository<Guardian> {
  protected tableName = 'guardians';
  protected primaryKey = 'id';
  protected columns = ['first_name', 'middle_name', 'last_name', 'phone', 'email', 'address', 'relationship', 'is_primary'];

  findByStudent(studentId: string): Guardian[] {
    return this.db.prepare(`
      SELECT g.* FROM guardians g
      JOIN student_guardians sg ON g.id = sg.guardian_id
      WHERE sg.student_id = ? AND g.deleted_at IS NULL
      ORDER BY g.is_primary DESC
    `).all(studentId) as Guardian[];
  }
}

export class StudentGuardianRepository extends BaseRepository<StudentGuardian> {
  protected tableName = 'student_guardians';
  protected primaryKey = 'id';
  protected columns = ['student_id', 'guardian_id', 'created_at', 'updated_at'];

  link(studentId: string, guardianId: string): StudentGuardian | null {
    const existing = this.findAll({ where: { student_id: studentId, guardian_id: guardianId }, limit: 1 })[0];
    if (existing) return existing;
    return this.create({ student_id: studentId, guardian_id: guardianId });
  }

  unlink(studentId: string, guardianId: string): boolean {
    const result = runInTransaction(() => {
      return this.db.prepare(
        'DELETE FROM student_guardians WHERE student_id = ? AND guardian_id = ?'
      ).run(studentId, guardianId);
    });
    return result.changes > 0;
  }

  setPrimary(studentId: string, guardianId: string): void {
    runInTransaction(() => {
      this.db.prepare('UPDATE guardians SET is_primary = 0 WHERE id IN (SELECT guardian_id FROM student_guardians WHERE student_id = ?)').run(studentId);
      this.db.prepare('UPDATE guardians SET is_primary = 1 WHERE id = ?').run(guardianId);
    });
  }
}