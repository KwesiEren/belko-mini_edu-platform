import { BaseRepository } from './base';
import { AttendanceSession, AttendanceRecord } from '../types/database';
import { getDatabase, runInTransaction } from '../db/connection';
import pino from 'pino';

const logger = pino({ name: 'repository:attendance' });

export class AttendanceSessionRepository extends BaseRepository<AttendanceSession> {
  protected tableName = 'attendance_sessions';
  protected primaryKey = 'id';
  protected columns = ['class_id', 'stream_id', 'subject_id', 'teacher_id', 'session_date', 'start_time', 'end_time', 'status'];

  findByTeacherDate(teacherId: string, date: string): AttendanceSession[] {
    return this.findAll({ where: { teacher_id: teacherId, session_date: date }, orderBy: 'start_time' });
  }

  findByClassDate(classId: string, date: string, streamId?: string): AttendanceSession[] {
    const where: Record<string, unknown> = { class_id: classId, session_date: date };
    if (streamId) where.stream_id = streamId;
    return this.findAll({ where });
  }

  getOrCreateSession(data: {
    class_id: string;
    stream_id?: string;
    subject_id?: string;
    teacher_id: string;
    session_date: string;
    start_time: string;
  }): AttendanceSession {
    const existing = this.findAll({
      where: {
        class_id: data.class_id,
        stream_id: data.stream_id || null,
        subject_id: data.subject_id || null,
        teacher_id: data.teacher_id,
        session_date: data.session_date,
      },
      limit: 1,
    })[0];

    if (existing) return existing;

    return this.create({
      ...data,
      status: 'open',
    });
  }

  closeSession(sessionId: string): AttendanceSession | null {
    const now = this.getNow();
    return this.update(sessionId, { status: 'closed', end_time: now.slice(11, 16) });
  }

  submitSession(sessionId: string): AttendanceSession | null {
    return this.update(sessionId, { status: 'submitted' });
  }
}

export class AttendanceRecordRepository extends BaseRepository<AttendanceRecord> {
  protected tableName = 'attendance_records';
  protected primaryKey = 'id';
  protected columns = ['session_id', 'student_id', 'status', 'remarks', 'recorded_by', 'recorded_at', 'created_at', 'updated_at'];

  findBySession(sessionId: string): AttendanceRecord[] {
    return this.findAll({ where: { session_id: sessionId }, orderBy: 'student_id' });
  }

  findByStudent(studentId: string, startDate?: string, endDate?: string): AttendanceRecord[] {
    let sql = `
      SELECT ar.*, ses.session_date, ses.class_id, ses.subject_id
      FROM attendance_records ar
      JOIN attendance_sessions ses ON ar.session_id = ses.id
      WHERE ar.student_id = ? AND ar.deleted_at IS NULL AND ses.deleted_at IS NULL
    `;
    const params: unknown[] = [studentId];
    if (startDate) {
      sql += ' AND ses.session_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND ses.session_date <= ?';
      params.push(endDate);
    }
    sql += ' ORDER BY ses.session_date DESC';
    return this.query(sql, params);
  }

  getSessionSummary(sessionId: string): { present: number; absent: number; late: number; excused: number; total: number } {
    const rows = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM attendance_records
      WHERE session_id = ? AND deleted_at IS NULL
      GROUP BY status
    `).all(sessionId) as { status: string; count: number }[];

    const summary = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    for (const row of rows) {
      summary[row.status as keyof typeof summary] = row.count;
      summary.total += row.count;
    }
    return summary;
  }

  markAttendance(data: {
    session_id: string;
    student_id: string;
    status: AttendanceRecord['status'];
    remarks?: string;
    recorded_by: string;
  }): AttendanceRecord {
    const existing = this.findAll({
      where: { session_id: data.session_id, student_id: data.student_id },
      limit: 1,
    })[0];

    if (existing) {
      return this.update(existing.id, {
        status: data.status,
        remarks: data.remarks,
        recorded_by: data.recorded_by,
      })!;
    }

    return this.create({
      ...data,
      recorded_at: this.getNow(),
    });
  }

  markAllPresent(sessionId: string, teacherId: string, studentIds: string[]): AttendanceRecord[] {
    const records: AttendanceRecord[] = [];
    const now = this.getNow();

    runInTransaction(() => {
      for (const studentId of studentIds) {
        const existing = this.findAll({
          where: { session_id: sessionId, student_id: studentId },
          limit: 1,
        })[0];

        if (existing) {
          this.db.prepare(`
            UPDATE attendance_records
            SET status = 'present', remarks = NULL, recorded_by = ?, updated_at = ?
            WHERE id = ?
          `).run(teacherId, now, existing.id);
          records.push({ ...existing, status: 'present', remarks: undefined, recorded_by: teacherId, updated_at: now });
        } else {
          const record = this.create({
            session_id: sessionId,
            student_id: studentId,
            status: 'present',
            recorded_by: teacherId,
            recorded_at: now,
          });
          records.push(record);
        }
      }
    });

    return records;
  }

  getAttendanceStats(studentId: string, termId: string): {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  } {
    const sql = `
      SELECT ar.status, COUNT(*) as count
      FROM attendance_records ar
      JOIN attendance_sessions ses ON ar.session_id = ses.id
      WHERE ar.student_id = ? AND ar.deleted_at IS NULL
      AND ses.term_id = ? AND ses.deleted_at IS NULL
      GROUP BY ar.status
    `;
    const rows = this.db.prepare(sql).all(studentId, termId) as { status: string; count: number }[];

    const stats = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const row of rows) {
      stats[row.status as keyof typeof stats] = row.count;
    }
    const total = stats.present + stats.absent + stats.late + stats.excused;
    const percentage = total > 0 ? Math.round(((stats.present + stats.late) / total) * 10000) / 100 : 0;

    return { ...stats, total, percentage };
  }

  getClassAttendanceReport(classId: string, termId: string, streamId?: string): {
    student_id: string;
    student_name: string;
    admission_number: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    percentage: number;
  }[] {
    let studentSql = `
      SELECT id, admission_number, first_name, last_name
      FROM students
      WHERE class_id = ? AND status = 'active' AND deleted_at IS NULL
    `;
    const studentParams = [classId];
    if (streamId) {
      studentSql += ' AND stream_id = ?';
      studentParams.push(streamId);
    }
    studentSql += ' ORDER BY last_name, first_name';

    const students = this.db.prepare(studentSql).all(...studentParams) as { id: string; admission_number: string; first_name: string; last_name: string }[];

    const report = [];
    for (const student of students) {
      const stats = this.getAttendanceStats(student.id, termId);
      report.push({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        ...stats,
      });
    }
    return report;
  }
}