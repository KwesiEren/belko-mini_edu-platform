import jwt from 'jsonwebtoken';
import { UserRepository, SessionRepository, hashToken, generateToken } from '../repositories/user';
import { User, Session, Role } from '../types/database';
import { getDatabase } from '../db/connection';
import pino from 'pino';

const logger = pino({ name: 'service:auth' });

const JWT_SECRET = process.env.JWT_SECRET || 'belko-edu-platform-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SESSION_EXPIRY_DAYS = 30;

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  sessionId: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export class AuthService {
  private userRepo = new UserRepository();
  private sessionRepo = new SessionRepository();

  async login(email: string, password: string, deviceInfo?: { deviceName?: string; ipAddress?: string; userAgent?: string }): Promise<AuthResult> {
    const user = this.userRepo.findByEmail(email.toLowerCase());
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('Account is disabled');
    }

    const valid = await this.userRepo.verifyPassword(user, password);
    if (!valid) {
      this.recordFailedAttempt(email);
      throw new Error('Invalid credentials');
    }

    const failedAttempts = this.getFailedAttempts(email);
    if (failedAttempts >= 5) {
      throw new Error('Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.');
    }

    this.clearFailedAttempts(email);

    const sessionId = this.sessionRepo.generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, sessionId },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = generateToken();
    const refreshTokenHash = hashToken(refreshToken);

    const session = this.sessionRepo.createSession({
      user_id: user.id,
      token_hash: hashToken(accessToken),
      refresh_token_hash: refreshTokenHash,
      device_name: deviceInfo?.deviceName,
      ip_address: deviceInfo?.ipAddress,
      user_agent: deviceInfo?.userAgent,
      expires_at: expiresAt,
    });

    this.userRepo.recordLogin(user.id);

    logger.info({ userId: user.id, sessionId }, 'User logged in');

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
    const refreshTokenHash = hashToken(refreshToken);
    const session = this.sessionRepo.findByRefreshTokenHash(refreshTokenHash);

    if (!session || session.is_revoked) {
      throw new Error('Invalid refresh token');
    }

    if (new Date(session.expires_at) < new Date()) {
      this.sessionRepo.revoke(session.id);
      throw new Error('Session expired');
    }

    const user = this.userRepo.findById(session.user_id);
    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    const newSessionId = this.sessionRepo.generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, sessionId: newSessionId },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const newRefreshToken = generateToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);

    this.sessionRepo.revoke(session.id);
    this.sessionRepo.createSession({
      user_id: user.id,
      token_hash: hashToken(accessToken),
      refresh_token_hash: newRefreshTokenHash,
      device_name: 'refreshed',
      expires_at: expiresAt,
    });

    return { accessToken, expiresAt };
  }

  async logout(sessionId: string): Promise<void> {
    this.sessionRepo.revoke(sessionId);
    logger.info({ sessionId }, 'User logged out');
  }

  async logoutAll(userId: string): Promise<number> {
    const count = this.sessionRepo.revokeAllForUser(userId);
    logger.info({ userId, count }, 'All sessions revoked for user');
    return count;
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      const session = this.sessionRepo.findByTokenHash(hashToken(token));
      if (!session || session.is_revoked) {
        return null;
      }
      if (new Date(session.expires_at) < new Date()) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }

  getSession(sessionId: string): Session | null {
    return this.sessionRepo.findById(sessionId);
  }

  getUserSessions(userId: string): Session[] {
    return this.sessionRepo.getUserSessions(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = this.userRepo.findById(userId);
    if (!user) return false;

    const valid = await this.userRepo.verifyPassword(user, currentPassword);
    if (!valid) return false;

    return this.userRepo.updatePassword(userId, newPassword);
  }

  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    return this.userRepo.updatePassword(userId, newPassword);
  }

  cleanupExpiredSessions(): number {
    return this.sessionRepo.cleanupExpired();
  }

  private failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

  private recordFailedAttempt(email: string): void {
    const now = Date.now();
    const record = this.failedAttempts.get(email) || { count: 0, lockedUntil: 0 };
    record.count += 1;
    if (record.count >= 5) {
      record.lockedUntil = now + 15 * 60 * 1000;
    }
    this.failedAttempts.set(email, record);
  }

  private getFailedAttempts(email: string): number {
    const record = this.failedAttempts.get(email);
    if (!record) return 0;
    if (record.lockedUntil > Date.now()) {
      return record.count;
    }
    return 0;
  }

  private clearFailedAttempts(email: string): void {
    this.failedAttempts.delete(email);
  }

  private sanitizeUser(user: User): User {
    const { password_hash, ...sanitized } = user;
    return sanitized as User;
  }

  hasPermission(role: Role, permission: string): boolean {
    const permissions: Record<Role, string[]> = {
      principal: [
        'school.settings', 'school.branding', 'school.backup', 'users.manage',
        'students.manage', 'students.import', 'staff.manage', 'classes.manage',
        'subjects.manage', 'attendance.view_all', 'attendance.manage',
        'grades.manage', 'grades.approve', 'grades.publish', 'fees.manage',
        'fees.collect', 'fees.receipts', 'reports.view_all', 'reports.export',
        'backup.manage', 'restore.manage', 'audit.view', 'import.manage', 'export.manage',
      ],
      secretary: [
        'students.manage', 'students.import', 'attendance.view_all', 'attendance.manage',
        'fees.collect', 'fees.receipts', 'reports.export', 'import.manage', 'export.manage',
      ],
      teacher: [
        'attendance.own_classes', 'grades.own_subjects', 'grades.submit',
        'reports.own_classes', 'conduct_remarks.own_class',
      ],
    };
    return permissions[role]?.includes(permission) ?? false;
  }
}

export const authService = new AuthService();