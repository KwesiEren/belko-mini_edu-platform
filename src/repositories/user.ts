import { BaseRepository } from './base';
import { User, Session, Role } from '../types/database';
import { getDatabase, runInTransaction } from '../db/connection';
import { v7 as uuidv7 } from 'uuid';
import pino from 'pino';
import argon2 from 'argon2';

const logger = pino({ name: 'repository:user' });

export class UserRepository extends BaseRepository<User> {
  protected tableName = 'users';
  protected primaryKey = 'id';
  protected columns = ['email', 'password_hash', 'full_name', 'role', 'avatar_url', 'is_active', 'last_login_at'];

  findByEmail(email: string): User | null {
    return this.findAll({ where: { email }, limit: 1 })[0] || null;
  }

  findByRole(role: Role): User[] {
    return this.findAll({ where: { role, is_active: 1 }, orderBy: 'full_name' });
  }

  async createUser(data: {
    email: string;
    password: string;
    full_name: string;
    role: Role;
  }): Promise<User> {
    const password_hash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    return this.create({
      email: data.email.toLowerCase(),
      password_hash,
      full_name: data.full_name,
      role: data.role,
      is_active: 1,
    });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      return await argon2.verify(user.password_hash, password);
    } catch {
      return false;
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const password_hash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    const result = this.update(userId, { password_hash });
    return result !== null;
  }

  recordLogin(userId: string): void {
    const now = this.getNow();
    runInTransaction(() => {
      this.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, userId);
    });
  }

  getStaffForLogin(): Pick<User, 'id' | 'full_name' | 'role' | 'avatar_url'>[] {
    return this.db.prepare(
      'SELECT id, full_name, role, avatar_url FROM users WHERE is_active = 1 AND deleted_at IS NULL ORDER BY role, full_name'
    ).all() as Pick<User, 'id' | 'full_name' | 'role' | 'avatar_url'>[];
  }
}

export class SessionRepository extends BaseRepository<Session> {
  protected tableName = 'sessions';
  protected primaryKey = 'id';
  protected columns = ['user_id', 'token_hash', 'refresh_token_hash', 'device_name', 'ip_address', 'user_agent', 'expires_at', 'last_activity_at', 'is_revoked'];

  createSession(data: {
    user_id: string;
    token_hash: string;
    refresh_token_hash?: string;
    device_name?: string;
    ip_address?: string;
    user_agent?: string;
    expires_at: string;
  }): Session {
    return this.create({
      ...data,
      last_activity_at: this.getNow(),
      is_revoked: 0,
    });
  }

  findByTokenHash(tokenHash: string): Session | null {
    return this.findAll({ where: { token_hash: tokenHash }, limit: 1 })[0] || null;
  }

  findByRefreshTokenHash(refreshTokenHash: string): Session | null {
    return this.findAll({ where: { refresh_token_hash: refreshTokenHash }, limit: 1 })[0] || null;
  }

  updateActivity(sessionId: string): void {
    const now = this.getNow();
    runInTransaction(() => {
      this.db.prepare('UPDATE sessions SET last_activity_at = ? WHERE id = ?').run(now, sessionId);
    });
  }

  revoke(sessionId: string): boolean {
    const result = runInTransaction(() => {
      return this.db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?').run(sessionId);
    });
    return result.changes > 0;
  }

  revokeAllForUser(userId: string): number {
    const result = runInTransaction(() => {
      return this.db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0').run(userId);
    });
    return result.changes;
  }

  cleanupExpired(): number {
    const now = this.getNow();
    const result = runInTransaction(() => {
      return this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    });
    return result.changes;
  }

  getUserSessions(userId: string): Session[] {
    return this.findAll({ where: { user_id: userId, is_revoked: 0 }, orderBy: 'last_activity_at', orderDir: 'DESC' });
  }
}

export function hashToken(token: string): string {
  const crypto = require('node:crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  const crypto = require('node:crypto');
  return crypto.randomBytes(32).toString('hex');
}