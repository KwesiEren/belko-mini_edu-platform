import { BaseRepository } from './base';
import {
  GradeComponent, GradeScale, GradeBoundary, GradeSheet, GradeEntry,
  GradeSubmission, GradeApproval, ReportCard, ConductRemark
} from '../types/database';
import { getDatabase, runInTransaction } from '../db/connection';
import pino from 'pino';

const logger = pino({ name: 'repository:grades' });

export class GradeComponentRepository extends BaseRepository<GradeComponent> {
  protected tableName = 'grade_components';
  protected primaryKey = 'id';
  protected columns = ['name', 'weight', 'max_score', 'subject_id', 'academic_year_id', 'term_id'];

  findBySubjectYear(subjectId: string, academicYearId: string, termId?: string): GradeComponent[] {
    const where: Record<string, unknown> = { subject_id: subjectId, academic_year_id: academicYearId };
    if (termId) where.term_id = termId;
    return this.findAll({ where, orderBy: 'name' });
  }

  validateWeights(academicYearId: string, termId?: string, subjectId?: string): { valid: boolean; total: number } {
    let sql = 'SELECT SUM(weight) as total FROM grade_components WHERE academic_year_id = ? AND deleted_at IS NULL';
    const params: unknown[] = [academicYearId];
    if (termId) {
      sql += ' AND term_id = ?';
      params.push(termId);
    }
    if (subjectId) {
      sql += ' AND subject_id = ?';
      params.push(subjectId);
    }
    const row = this.db.prepare(sql).get(...params) as { total: number | null };
    const total = row.total || 0;
    return { valid: total === 100, total };
  }
}

export class GradeScaleRepository extends BaseRepository<GradeScale> {
  protected tableName = 'grade_scales';
  protected primaryKey = 'id';
  protected columns = ['name', 'academic_year_id', 'is_default'];

  findByAcademicYear(academicYearId: string): GradeScale[] {
    return this.findAll({ where: { academic_year_id: academicYearId }, orderBy: 'is_default DESC, name' });
  }

  getDefault(academicYearId: string): GradeScale | null {
    return this.findAll({ where: { academic_year_id: academicYearId, is_default: 1 }, limit: 1 })[0] || null;
  }

  setDefault(id: string): void {
    runInTransaction(() => {
      this.db.prepare('UPDATE grade_scales SET is_default = 0 WHERE is_default = 1').run();
      this.db.prepare('UPDATE grade_scales SET is_default = 1, updated_at = ? WHERE id = ?').run(this.getNow(), id);
    });
  }
}

export class GradeBoundaryRepository extends BaseRepository<GradeBoundary> {
  protected tableName = 'grade_boundaries';
  protected primaryKey = 'id';
  protected columns = ['grade_scale_id', 'letter', 'min_score', 'max_score', 'remark', 'updated_at'];

  findByScale(gradeScaleId: string): GradeBoundary[] {
    return this.findAll({ where: { grade_scale_id: gradeScaleId }, orderBy: 'min_score DESC' });
  }

  getGradeForScore(gradeScaleId: string, score: number): GradeBoundary | null {
    const row = this.db.prepare(`
      SELECT * FROM grade_boundaries
      WHERE grade_scale_id = ? AND ? BETWEEN min_score AND max_score
      LIMIT 1
    `).get(gradeScaleId, score) as GradeBoundary | undefined;
    return row || null;
  }
}

export class GradeSheetRepository extends BaseRepository<GradeSheet> {
  protected tableName = 'grade_sheets';
  protected primaryKey = 'id';
  protected columns = ['class_id', 'stream_id', 'subject_id', 'teacher_id', 'academic_year_id', 'term_id', 'status', 'submitted_at', 'submitted_by', 'reviewed_at', 'reviewed_by', 'approved_at', 'approved_by', 'published_at', 'published_by'];

  findByTeacher(teacherId: string, academicYearId: string, termId?: string): GradeSheet[] {
    const where: Record<string, unknown> = { teacher_id: teacherId, academic_year_id: academicYearId };
    if (termId) where.term_id = termId;
    return this.findAll({ where, orderBy: 'class_id, subject_id' });
  }

  findByClassSubject(classId: string, subjectId: string, academicYearId: string, termId: string): GradeSheet | null {
    return this.findAll({
      where: { class_id: classId, subject_id: subjectId, academic_year_id: academicYearId, term_id: termId },
      limit: 1,
    })[0] || null;
  }

  getOrCreateSheet(data: {
    class_id: string;
    stream_id?: string;
    subject_id: string;
    teacher_id: string;
    academic_year_id: string;
    term_id: string;
  }): GradeSheet {
    const existing = this.findByClassSubject(data.class_id, data.subject_id, data.academic_year_id, data.term_id);
    if (existing) return existing;

    return this.create({ ...data, status: 'draft' });
  }

  submitSheet(sheetId: string, teacherId: string): GradeSheet | null {
    const now = this.getNow();
    return this.update(sheetId, {
      status: 'submitted',
      submitted_at: now,
      submitted_by: teacherId,
    });
  }

  reviewSheet(sheetId: string, teacherId: string, action: 'approved' | 'returned', remarks?: string): GradeSheet | null {
    const now = this.getNow();
    const sheet = this.findById(sheetId);
    if (!sheet) return null;

    if (action === 'approved') {
      return this.update(sheetId, {
        status: 'reviewed',
        reviewed_at: now,
        reviewed_by: teacherId,
      });
    } else {
      return this.update(sheetId, {
        status: 'draft',
        reviewed_at: now,
        reviewed_by: teacherId,
      });
    }
  }

  approveSheet(sheetId: string, principalId: string): GradeSheet | null {
    const now = this.getNow();
    return this.update(sheetId, {
      status: 'approved',
      approved_at: now,
      approved_by: principalId,
    });
  }

  publishSheet(sheetId: string, principalId: string): GradeSheet | null {
    const now = this.getNow();
    return this.update(sheetId, {
      status: 'published',
      published_at: now,
      published_by: principalId,
    });
  }

  unlockSheet(sheetId: string, reason: string, userId: string): GradeSheet | null {
    const now = this.getNow();
    return this.update(sheetId, {
      status: 'draft',
      submitted_at: undefined,
      submitted_by: undefined,
      reviewed_at: undefined,
      reviewed_by: undefined,
      approved_at: undefined,
      approved_by: undefined,
      published_at: undefined,
      published_by: undefined,
    });
  }
}

export class GradeEntryRepository extends BaseRepository<GradeEntry> {
  protected tableName = 'grade_entries';
  protected primaryKey = 'id';
  protected columns = ['grade_sheet_id', 'student_id', 'component_id', 'score', 'is_draft', 'entered_by', 'entered_at', 'created_at', 'updated_at'];

  findBySheet(gradeSheetId: string): GradeEntry[] {
    return this.findAll({ where: { grade_sheet_id: gradeSheetId }, orderBy: 'student_id, component_id' });
  }

  findByStudentSheet(studentId: string, gradeSheetId: string): GradeEntry[] {
    return this.findAll({ where: { student_id: studentId, grade_sheet_id: gradeSheetId } });
  }

  upsertEntry(data: {
    grade_sheet_id: string;
    student_id: string;
    component_id: string;
    score: number | null;
    is_draft: boolean;
    entered_by: string;
  }): GradeEntry {
    const existing = this.findAll({
      where: { grade_sheet_id: data.grade_sheet_id, student_id: data.student_id, component_id: data.component_id },
      limit: 1,
    })[0];

    if (existing) {
      return this.update(existing.id, {
        score: data.score ?? 0,
        is_draft: Boolean(data.is_draft),
        entered_by: data.entered_by,
      })!;
    }

    return this.create({ ...data, score: data.score ?? 0, is_draft: Boolean(data.is_draft), entered_at: this.getNow() });
  }

  bulkUpsert(entries: Array<{
    grade_sheet_id: string;
    student_id: string;
    component_id: string;
    score: number | null;
    is_draft: boolean;
    entered_by: string;
  }>): GradeEntry[] {
    const results: GradeEntry[] = [];
    const now = this.getNow();

    runInTransaction(() => {
      for (const entry of entries) {
        const existing = this.findAll({
          where: { grade_sheet_id: entry.grade_sheet_id, student_id: entry.student_id, component_id: entry.component_id },
          limit: 1,
        })[0];

        if (existing) {
          this.db.prepare(`
            UPDATE grade_entries
            SET score = ?, is_draft = ?, entered_by = ?, updated_at = ?
            WHERE id = ?
          `).run(entry.score ?? 0, entry.is_draft ? 1 : 0, entry.entered_by, now, existing.id);
          results.push({ ...existing, score: entry.score ?? 0, is_draft: entry.is_draft, entered_by: entry.entered_by, updated_at: now });
        } else {
          const id = this.generateId();
          this.db.prepare(`
            INSERT INTO grade_entries (id, grade_sheet_id, student_id, component_id, score, is_draft, entered_by, entered_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, entry.grade_sheet_id, entry.student_id, entry.component_id, entry.score ?? 0, entry.is_draft ? 1 : 0, entry.entered_by, now, now);
          results.push({ ...entry, id, score: entry.score ?? 0, entered_at: now, updated_at: now } as GradeEntry);
        }
      }
    });

    return results;
  }

  calculateTotals(gradeSheetId: string): Map<string, { caTotal: number; examScore: number | null; total: number; letter?: string; remark?: string }> {
    const components = this.db.prepare(`
      SELECT gc.*, gs.grade_scale_id
      FROM grade_components gc
      JOIN grade_sheets gs ON gc.subject_id = gs.subject_id AND gc.academic_year_id = gs.academic_year_id
      WHERE gs.id = ? AND gc.deleted_at IS NULL
    `).all(gradeSheetId) as (GradeComponent & { grade_scale_id: string })[];

    const entries = this.findBySheet(gradeSheetId);
    const studentEntries = new Map<string, Map<string, GradeEntry>>();

    for (const entry of entries) {
      if (!studentEntries.has(entry.student_id)) {
        studentEntries.set(entry.student_id, new Map());
      }
      studentEntries.get(entry.student_id)!.set(entry.component_id, entry);
    }

    const results = new Map<string, { caTotal: number; examScore: number | null; total: number; letter?: string; remark?: string }>();

    for (const [studentId, entriesMap] of studentEntries) {
      let caTotal = 0;
      let examScore: number | null = null;

      for (const component of components) {
        const entry = entriesMap.get(component.id);
        if (entry && entry.score !== null) {
          const weightedScore = (entry.score / component.max_score) * component.weight;
          if (component.name.toLowerCase().includes('exam')) {
            examScore = weightedScore;
          } else {
            caTotal += weightedScore;
          }
        }
      }

      const total = caTotal + (examScore || 0);
      results.set(studentId, { caTotal, examScore, total });
    }

    return results;
  }

  getDraftEntries(gradeSheetId: string): GradeEntry[] {
    return this.findAll({ where: { grade_sheet_id: gradeSheetId, is_draft: 1 } });
  }

  finalizeDrafts(gradeSheetId: string): number {
    const result = runInTransaction(() => {
      return this.db.prepare(`
        UPDATE grade_entries
        SET is_draft = 0, updated_at = ?
        WHERE grade_sheet_id = ? AND is_draft = 1
      `).run(this.getNow(), gradeSheetId);
    });
    return result.changes;
  }
}

export class ReportCardRepository extends BaseRepository<ReportCard> {
  protected tableName = 'report_cards';
  protected primaryKey = 'id';
  protected columns = ['student_id', 'academic_year_id', 'term_id', 'class_id', 'stream_id', 'pdf_path', 'generated_at', 'generated_by', 'is_final'];

  findByStudentTerm(studentId: string, academicYearId: string, termId: string): ReportCard | null {
    return this.findAll({ where: { student_id: studentId, academic_year_id: academicYearId, term_id: termId }, limit: 1 })[0] || null;
  }

  getOrCreate(data: {
    student_id: string;
    academic_year_id: string;
    term_id: string;
    class_id: string;
    stream_id?: string;
  }): ReportCard {
    const existing = this.findByStudentTerm(data.student_id, data.academic_year_id, data.term_id);
    if (existing) return existing;

    return this.create({ ...data, is_final: false });
  }

  markGenerated(reportCardId: string, pdfPath: string, generatedBy: string): ReportCard | null {
    return this.update(reportCardId, {
      pdf_path: pdfPath,
      generated_at: this.getNow(),
      generated_by: generatedBy,
      is_final: true,
    });
  }

  getBatchForPrinting(academicYearId: string, termId: string, classId?: string): ReportCard[] {
    const where: Record<string, unknown> = { academic_year_id: academicYearId, term_id: termId };
    if (classId) where.class_id = classId;
    return this.findAll({ where, orderBy: 'class_id, student_id' });
  }
}

export class ConductRemarkRepository extends BaseRepository<ConductRemark> {
  protected tableName = 'conduct_remarks';
  protected primaryKey = 'id';
  protected columns = ['report_card_id', 'conduct', 'attitude', 'attendance_summary', 'teacher_remark', 'principal_remark', 'principal_signature_url'];

  findByReportCard(reportCardId: string): ConductRemark | null {
    return this.findAll({ where: { report_card_id: reportCardId }, limit: 1 })[0] || null;
  }

  upsert(data: {
    report_card_id: string;
    conduct: string;
    attitude: string;
    attendance_summary: string;
    teacher_remark: string;
    principal_remark?: string;
    principal_signature_url?: string;
  }): ConductRemark {
    const existing = this.findByReportCard(data.report_card_id);
    if (existing) {
      return this.update(existing.id, data)!;
    }
    return this.create(data);
  }
}