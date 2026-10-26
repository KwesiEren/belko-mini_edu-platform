import DOMPurify from 'dompurify';
import { z } from 'zod';

// DOMPurify needs a DOM. In plain Node (CLI tests, main-process helpers) we fall
// back to a conservative tag stripper so the sanitize helpers never throw.
const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';

function fallbackStripTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/\son\w+\s*=/gi, '');
}

export const sanitizeHtml = (html: string): string => {
  if (!hasDom) return fallbackStripTags(html);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span', 'div'],
    ALLOWED_ATTR: ['class', 'style'],
  });
};

export const sanitizeText = (text: string): string => {
  if (!hasDom) return fallbackStripTags(text);
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

export const stripHtml = (html: string): string => {
  if (!hasDom) return fallbackStripTags(html);
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

export const commonSchemas = {
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s\-'\.]+$/, 'Invalid characters in name'),
  phone: z.string().regex(/^[\d\s\-\+\(\)]{7,20}$/, 'Invalid phone number').optional(),
  admissionNumber: z.string().min(1).max(50).regex(/^[A-Z0-9\-\/]+$/i, 'Invalid admission number'),
  currencyAmount: z.number().int().min(0).max(999999999),
  percentage: z.number().min(0).max(100),
  score: z.number().min(0).max(1000),
  uuid: z.string().uuid('Invalid UUID format'),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  dateTimeString: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Invalid datetime format'),
  role: z.enum(['principal', 'secretary', 'teacher']),
  attendanceStatus: z.enum(['present', 'absent', 'late', 'excused']),
  feeMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card', 'other']),
  gradeStatus: z.enum(['draft', 'submitted', 'reviewed', 'approved', 'published']),
  studentStatus: z.enum(['active', 'graduated', 'transferred', 'suspended', 'withdrawn']),
  backupType: z.enum(['auto', 'manual', 'pre_migration', 'pre_import']),
  networkMode: z.enum(['shared', 'network']),
};

export const createStudentSchema = z.object({
  admission_number: commonSchemas.admissionNumber,
  first_name: commonSchemas.name,
  middle_name: z.string().max(100).optional(),
  last_name: commonSchemas.name,
  date_of_birth: commonSchemas.dateString.optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  address: z.string().max(500).optional(),
  phone: commonSchemas.phone,
  email: commonSchemas.email.optional(),
  enrollment_date: commonSchemas.dateString,
  status: commonSchemas.studentStatus.default('active'),
  class_id: commonSchemas.uuid.optional(),
  stream_id: commonSchemas.uuid.optional(),
});

export const createStaffSchema = z.object({
  employee_number: z.string().min(1).max(50).regex(/^[A-Z0-9\-]+$/i),
  first_name: commonSchemas.name,
  middle_name: z.string().max(100).optional(),
  last_name: commonSchemas.name,
  email: commonSchemas.email.optional(),
  phone: commonSchemas.phone,
  role: commonSchemas.role,
  hire_date: commonSchemas.dateString,
});

export const createClassSchema = z.object({
  name: z.string().min(1).max(100),
  academic_year_id: commonSchemas.uuid,
  capacity: z.number().int().min(1).max(200).optional(),
  homeroom_teacher_id: commonSchemas.uuid.optional(),
});

export const createSubjectSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/i),
  name: z.string().min(1).max(100),
  is_core: z.boolean().default(true),
});

export const createGradeComponentSchema = z.object({
  name: z.string().min(1).max(100),
  weight: z.number().int().min(1).max(100),
  max_score: z.number().int().min(1).max(1000),
  subject_id: commonSchemas.uuid.optional(),
  academic_year_id: commonSchemas.uuid,
  term_id: commonSchemas.uuid.optional(),
});

export const createFeeComponentSchema = z.object({
  name: z.string().min(1).max(100),
  amount: commonSchemas.currencyAmount,
  frequency: z.enum(['once', 'term', 'monthly', 'annual']),
  is_mandatory: z.boolean().default(true),
  academic_year_id: commonSchemas.uuid,
  term_id: commonSchemas.uuid.optional(),
  class_id: commonSchemas.uuid.optional(),
});

export const recordPaymentSchema = z.object({
  bill_id: commonSchemas.uuid,
  student_id: commonSchemas.uuid,
  amount: commonSchemas.currencyAmount,
  method: commonSchemas.feeMethod,
  reference_number: z.string().max(100).optional(),
  payment_date: commonSchemas.dateString,
  received_by: commonSchemas.uuid,
});

export const attendanceRecordSchema = z.object({
  session_id: commonSchemas.uuid,
  student_id: commonSchemas.uuid,
  status: commonSchemas.attendanceStatus,
  remarks: z.string().max(500).optional(),
  recorded_by: commonSchemas.uuid,
});

export const gradeEntrySchema = z.object({
  grade_sheet_id: commonSchemas.uuid,
  student_id: commonSchemas.uuid,
  component_id: commonSchemas.uuid,
  score: commonSchemas.score.nullable(),
  is_draft: z.boolean(),
  entered_by: commonSchemas.uuid,
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

export const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws: wss:",
  "media-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export function applyCSPHeaders(res: any): void {
  res.setHeader('Content-Security-Policy', CSP_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 100;