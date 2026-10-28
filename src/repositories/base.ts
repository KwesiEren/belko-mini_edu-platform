import { getDatabase, runInTransaction } from '../db/connection';
import { v7 as uuidv7 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'repository' });

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Column/table identifiers interpolated into SQL must be plain SQLite
 * identifiers. Values are always parameterized; this guards the one place
 * where caller-supplied keys (filters, orderBy) end up in the SQL text.
 */
function assertIdentifier(name: string): void {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
}

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
      assertIdentifier(key);
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

  private tableColumnsCache?: Set<string>;

  /**
   * Actual column names of the backing table. Several tables (attendance_records,
   * settings, fee_structure_components) do not follow the created_at/updated_at
   * convention, so INSERT statements are built from what the table really has.
   */
  protected tableColumns(): Set<string> {
    if (!this.tableColumnsCache) {
      const rows = this.db.prepare(`PRAGMA table_info(${this.tableName})`).all() as { name: string }[];
      this.tableColumnsCache = new Set(rows.map(r => r.name));
    }
    return this.tableColumnsCache;
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
    const clause = includeDeleted
      ? `WHERE ${this.primaryKey} = ?`
      : `WHERE ${this.tableName}.deleted_at IS NULL AND ${this.primaryKey} = ?`;
    const row = this.db.prepare(
      `SELECT * FROM ${this.tableName} ${clause}`
    ).get(id) as Record<string, unknown> | undefined;

    return row ? this.mapRow(row) : null;
  }

  findAll(options: FindOptions = {}): T[] {
    const { where, orderBy, orderDir = 'ASC', limit, offset, includeDeleted } = options;
    const { clause, params } = this.buildWhereClause(where || {}, includeDeleted);

    let sql = `SELECT * FROM ${this.tableName} ${clause}`;
    if (orderBy) {
      if (orderBy.includes(',') ? !orderBy.split(',').every(part => IDENTIFIER_RE.test(part.trim().split(/\s+/)[0])) : !IDENTIFIER_RE.test(orderBy.split(/\s+/)[0])) {
        throw new Error(`Invalid SQL identifier in orderBy: ${orderBy}`);
      }
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

    const tableColumns = this.tableColumns();
    const insertColumns: string[] = [this.primaryKey];
    const insertValues: unknown[] = [id];

    // Map declared columns by name — never by object key order — and skip any
    // that the table does not actually have.
    for (const col of this.columns) {
      if (tableColumns.has(col)) {
        insertColumns.push(col);
        insertValues.push((entity as Record<string, unknown>)[col] ?? null);
      }
    }
    for (const ts of ['created_at', 'updated_at']) {
      if (tableColumns.has(ts)) {
        insertColumns.push(ts);
        insertValues.push(now);
      }
    }

    const placeholders = insertColumns.map(() => '?').join(',');

    runInTransaction(() => {
      this.db.prepare(
        `INSERT INTO ${this.tableName} (${insertColumns.join(', ')}) VALUES (${placeholders})`
      ).run(...insertValues);
    });

    return this.findById(id)!;
  }

  createBatch(entities: Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>[]): T[] {
    if (entities.length === 0) return [];

    const now = this.getNow();
    const tableColumns = this.tableColumns();

    const insertColumns: string[] = [this.primaryKey];
    for (const col of this.columns) {
      if (tableColumns.has(col)) insertColumns.push(col);
    }
    for (const ts of ['created_at', 'updated_at']) {
      if (tableColumns.has(ts)) insertColumns.push(ts);
    }
    const placeholders = insertColumns.map(() => '?').join(',');

    const stmt = this.db.prepare(
      `INSERT INTO ${this.tableName} (${insertColumns.join(', ')}) VALUES (${placeholders})`
    );

    const ids: string[] = [];

    runInTransaction(() => {
      for (const entity of entities) {
        const id = this.generateId();
        ids.push(id);
        const values: unknown[] = [id];
        for (const col of this.columns) {
          if (tableColumns.has(col)) {
            values.push((entity as Record<string, unknown>)[col] ?? null);
          }
        }
        for (const ts of ['created_at', 'updated_at']) {
          if (tableColumns.has(ts)) values.push(now);
        }
        stmt.run(...values);
      }
    });

    return ids.map(id => this.findById(id)!);
  }

  update(id: string, updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): T | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = this.getNow();
    for (const key of Object.keys(updates)) {
      assertIdentifier(key);
    }
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

  execute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    const result = runInTransaction(() => this.db.prepare(sql).run(...params));
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
  }

  query<TResult = Record<string, unknown>>(sql: string, params: unknown[] = []): TResult[] {
    return this.db.prepare(sql).all(...params) as TResult[];
  }

  queryOne<TResult = Record<string, unknown>>(sql: string, params: unknown[] = []): TResult | null {
    return this.db.prepare(sql).get(...params) as TResult | undefined ?? null;
  }
}