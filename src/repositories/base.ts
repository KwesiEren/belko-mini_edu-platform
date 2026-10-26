import { getDatabase, runInTransaction } from '../db/connection';
import { v7 as uuidv7 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'repository' });

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FindOptions {
  where?: Record<string, unknown>;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract tableName: string;
  protected abstract columns: string[];
  protected abstract primaryKey: string;

  protected get db(): ReturnType<typeof getDatabase> {
    return getDatabase();
  }

  protected buildWhereClause(where: Record<string, unknown>, includeDeleted = false): { clause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!includeDeleted) {
      conditions.push(`${this.tableName}.deleted_at IS NULL`);
    }

    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        conditions.push(`${this.tableName}.${key} IS NULL`);
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          conditions.push('1=0');
        } else {
          const placeholders = value.map(() => '?').join(',');
          conditions.push(`${this.tableName}.${key} IN (${placeholders})`);
          params.push(...value);
        }
      } else {
        conditions.push(`${this.tableName}.${key} = ?`);
        params.push(value);
      }
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  protected mapRow(row: Record<string, unknown>): T {
    return row as T;
  }

  protected mapRows(rows: Record<string, unknown>[]): T[] {
    return rows.map(r => this.mapRow(r));
  }

  generateId(): string {
    return uuidv7();
  }

  getNow(): string {
    return new Date().toISOString();
  }

  findById(id: string, includeDeleted = false): T | null {
    const clause = includeDeleted ? '' : `WHERE ${this.tableName}.deleted_at IS NULL`;
    const row = this.db.prepare(
      `SELECT * FROM ${this.tableName} ${clause} AND ${this.primaryKey} = ?`
    ).get(id) as Record<string, unknown> | undefined;

    return row ? this.mapRow(row) : null;
  }

  findAll(options: FindOptions = {}): T[] {
    const { where, orderBy, orderDir = 'ASC', limit, offset, includeDeleted } = options;
    const { clause, params } = this.buildWhereClause(where || {}, includeDeleted);

    let sql = `SELECT * FROM ${this.tableName} ${clause}`;
    if (orderBy) {
      sql += ` ORDER BY ${orderBy} ${orderDir}`;
    }
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return this.mapRows(rows);
  }

  findPaginated(page: number, pageSize: number, options: FindOptions = {}): PaginatedResult<T> {
    const { where, orderBy, orderDir = 'ASC', includeDeleted } = options;
    const { clause, params } = this.buildWhereClause(where || {}, includeDeleted);

    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${clause}`;
    const total = (this.db.prepare(countSql).get(...params) as { total: number }).total;

    const data = this.findAll({
      ...options,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): T {
    const now = this.getNow();
    const id = this.generateId();

    const columns = [this.primaryKey, ...this.columns, 'created_at', 'updated_at'];
    const placeholders = columns.map(() => '?').join(',');
    const values = [id, ...Object.values(entity), now, now];

    runInTransaction(() => {
      this.db.prepare(
        `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`
      ).run(...values);
    });

    return this.findById(id)!;
  }

  createBatch(entities: Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>[]): T[] {
    if (entities.length === 0) return [];

    const now = this.getNow();
    const columns = [this.primaryKey, ...this.columns, 'created_at', 'updated_at'];
    const placeholders = columns.map(() => '?').join(',');

    const stmt = this.db.prepare(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`
    );

    const ids: string[] = [];

    runInTransaction(() => {
      for (const entity of entities) {
        const id = this.generateId();
        ids.push(id);
        const values = [id, ...Object.values(entity), now, now];
        stmt.run(...values);
      }
    });

    return ids.map(id => this.findById(id)!);
  }

  update(id: string, updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): T | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = this.getNow();
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), now, id];

    runInTransaction(() => {
      this.db.prepare(
        `UPDATE ${this.tableName} SET ${setClause}, updated_at = ? WHERE ${this.primaryKey} = ? AND deleted_at IS NULL`
      ).run(...values);
    });

    return this.findById(id);
  }

  softDelete(id: string, deletedBy?: string): boolean {
    const now = this.getNow();
    const result = runInTransaction(() => {
      return this.db.prepare(
        `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ? WHERE ${this.primaryKey} = ? AND deleted_at IS NULL`
      ).run(now, now, id);
    });

    return result.changes > 0;
  }

  hardDelete(id: string): boolean {
    const result = runInTransaction(() => {
      return this.db.prepare(
        `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`
      ).run(id);
    });

    return result.changes > 0;
  }

  count(where: Record<string, unknown> = {}, includeDeleted = false): number {
    const { clause, params } = this.buildWhereClause(where, includeDeleted);
    const row = this.db.prepare(
      `SELECT COUNT(*) as total FROM ${this.tableName} ${clause}`
    ).get(...params) as { total: number };

    return row.total;
  }

  exists(where: Record<string, unknown>, includeDeleted = false): boolean {
    return this.count(where, includeDeleted) > 0;
  }

  execute(sql: string, params: unknown[] = []): Database.RunResult {
    return runInTransaction(() => this.db.prepare(sql).run(...params));
  }

  query<TResult = Record<string, unknown>>(sql: string, params: unknown[] = []): TResult[] {
    return this.db.prepare(sql).all(...params) as TResult[];
  }

  queryOne<TResult = Record<string, unknown>>(sql: string, params: unknown[] = []): TResult | null {
    return this.db.prepare(sql).get(...params) as TResult | undefined ?? null;
  }
}