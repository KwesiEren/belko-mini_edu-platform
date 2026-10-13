import { BaseRepository } from './base';
import { School, AcademicYear, Term } from '../types/database';
import { getDatabase, runInTransaction } from '../db/connection';
import { v7 as uuidv7 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'repository:school' });

export class SchoolRepository extends BaseRepository<School> {
  protected tableName = 'schools';
  protected primaryKey = 'id';
  protected columns = [
    'name', 'motto', 'address', 'logo_url', 'primary_color', 'secondary_color',
    'country', 'currency', 'academic_year', 'terms_per_year', 'grading_scale',
    'report_template', 'receipt_template', 'usage_mode', 'backup_folder'
  ];

  getSettings(): School | null {
    const row = this.db.prepare('SELECT * FROM schools LIMIT 1').get() as School | undefined;
    return row || null;
  }

  initialize(settings: Omit<School, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): School {
    const existing = this.getSettings();
    if (existing) {
      return this.update(existing.id, settings)!;
    }
    return this.create(settings);
  }
}

export class AcademicYearRepository extends BaseRepository<AcademicYear> {
  protected tableName = 'academic_years';
  protected primaryKey = 'id';
  protected columns = ['name', 'start_date', 'end_date', 'is_current'];

  getCurrent(): AcademicYear | null {
    return this.findAll({ where: { is_current: 1 }, limit: 1 })[0] || null;
  }

  setCurrent(id: string): void {
    runInTransaction(() => {
      this.db.prepare('UPDATE academic_years SET is_current = 0').run();
      this.db.prepare('UPDATE academic_years SET is_current = 1, updated_at = ? WHERE id = ?')
        .run(this.getNow(), id);
    });
  }

  create(entity: Omit<AcademicYear, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): AcademicYear {
    if (entity.is_current) {
      runInTransaction(() => {
        this.db.prepare('UPDATE academic_years SET is_current = 0').run();
      });
    }
    return super.create(entity);
  }
}

export class TermRepository extends BaseRepository<Term> {
  protected tableName = 'terms';
  protected primaryKey = 'id';
  protected columns = ['academic_year_id', 'name', 'ordinal', 'start_date', 'end_date', 'is_current', 'is_closed', 'closed_at', 'closed_by', 'close_reason'];

  getCurrent(): Term | null {
    return this.findAll({ where: { is_current: 1 }, limit: 1 })[0] || null;
  }

  getByAcademicYear(academicYearId: string): Term[] {
    return this.findAll({ where: { academic_year_id: academicYearId }, orderBy: 'ordinal' });
  }

  setCurrent(id: string): void {
    runInTransaction(() => {
      this.db.prepare('UPDATE terms SET is_current = 0').run();
      this.db.prepare('UPDATE terms SET is_current = 1, updated_at = ? WHERE id = ?')
        .run(this.getNow(), id);
    });
  }

  closeTerm(id: string, closedBy: string, reason: string): Term | null {
    const now = this.getNow();
    return this.update(id, {
      is_closed: 1,
      closed_at: now,
      closed_by: closedBy,
      close_reason: reason,
    });
  }

  reopenTerm(id: string): Term | null {
    return this.update(id, {
      is_closed: 0,
      closed_at: null,
      closed_by: null,
      close_reason: null,
    });
  }
}