import { getDatabase } from '../db/connection';
import { validateInput, sanitizeObject, createStudentSchema, createStaffSchema, attendanceRecordSchema, gradeEntrySchema, recordPaymentSchema } from '../utils/security';
import pino from 'pino';

const logger = pino({ name: 'security:validation' });

export function validateStudentInput(data: unknown) {
  return validateInput(createStudentSchema, sanitizeObject(data as Record<string, unknown>));
}

export function validateStaffInput(data: unknown) {
  return validateInput(createStaffSchema, sanitizeObject(data as Record<string, unknown>));
}

export function validateAttendanceInput(data: unknown) {
  return validateInput(attendanceRecordSchema, sanitizeObject(data as Record<string, unknown>));
}

export function validateGradeEntryInput(data: unknown) {
  return validateInput(gradeEntrySchema, sanitizeObject(data as Record<string, unknown>));
}

export function validatePaymentInput(data: unknown) {
  return validateInput(recordPaymentSchema, sanitizeObject(data as Record<string, unknown>));
}

export function testXssPayloads(): { passed: number; failed: number; results: Array<{ payload: string; blocked: boolean }> } {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>',
    '<textarea onfocus=alert(1) autofocus>',
    '<keygen onfocus=alert(1) autofocus>',
    '<video><source onerror=alert(1)>',
    '<audio><source onerror=alert(1)>',
    '<details open ontoggle=alert(1)>',
    '<marquee onstart=alert(1)>',
    '<meter onmouseover=alert(1)>',
    '<a href="javascript:alert(1)">click</a>',
    '<form><button formaction="javascript:alert(1)">',
    '<math><maction actiontype="statusline" onmouseover=alert(1)>',
    '<svg><animate onbegin=alert(1) attributeName=x>',
    '<svg><set onbegin=alert(1) attributeName=x>',
  ];

  let passed = 0;
  let failed = 0;
  const results: Array<{ payload: string; blocked: boolean }> = [];

  for (const payload of xssPayloads) {
    const testData = {
      admission_number: 'TEST001',
      first_name: payload,
      last_name: 'Test',
      enrollment_date: '2026-01-01',
    };

    const result = validateStudentInput(testData);
    const blocked = !result.success;
    
    if (blocked) {
      passed++;
    } else {
      failed++;
      logger.warn({ payload, sanitized: result.data?.first_name }, 'XSS payload not blocked');
    }
    
    results.push({ payload, blocked });
  }

  return { passed, failed, results };
}

export function testSqlInjectionPayloads(): { passed: number; failed: number; results: Array<{ payload: string; blocked: boolean }> } {
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE students; --",
    "' UNION SELECT * FROM users --",
    "'; INSERT INTO users (email, password_hash) VALUES ('hacker@evil.com', 'hash'); --",
    "' OR 1=1 --",
    "' OR '1'='1' --",
    "admin' --",
    "'; EXEC xp_cmdshell('dir'); --",
    "' AND (SELECT COUNT(*) FROM students) > 0 --",
    "'; WAITFOR DELAY '00:00:10' --",
    "' OR EXISTS(SELECT * FROM users) --",
    "'; SHUTDOWN; --",
    "1; DELETE FROM students WHERE 1=1; --",
    "' OR 'x'='x",
    "'; CREATE TABLE test (id INT); --",
  ];

  let passed = 0;
  let failed = 0;
  const results: Array<{ payload: string; blocked: boolean }> = [];

  for (const payload of sqlPayloads) {
    const testData = {
      admission_number: 'TEST001',
      first_name: 'Test',
      last_name: payload,
      enrollment_date: '2026-01-01',
    };

    const result = validateStudentInput(testData);
    const blocked = !result.success;
    
    if (blocked) {
      passed++;
    } else {
      failed++;
      logger.warn({ payload, sanitized: result.data?.last_name }, 'SQL injection payload not blocked');
    }
    
    results.push({ payload, blocked });
  }

  return { passed, failed, results };
}

export function runSecurityTests(): void {
  logger.info('Running XSS protection tests...');
  const xssResults = testXssPayloads();
  logger.info({ passed: xssResults.passed, failed: xssResults.failed }, 'XSS tests completed');

  logger.info('Running SQL injection protection tests...');
  const sqlResults = testSqlInjectionPayloads();
  logger.info({ passed: sqlResults.passed, failed: sqlResults.failed }, 'SQL injection tests completed');

  if (xssResults.failed > 0 || sqlResults.failed > 0) {
    logger.error('SECURITY TESTS FAILED - Some payloads were not blocked!');
    throw new Error('Security validation failed');
  }

  logger.info('All security tests passed!');
}

export function verifyCSP(): void {
  const { CSP_POLICY } = require('./security');
  
  const requiredDirectives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  let allPresent = true;
  for (const directive of requiredDirectives) {
    if (!CSP_POLICY.includes(directive)) {
      logger.error({ directive }, 'Missing CSP directive');
      allPresent = false;
    }
  }

  if (allPresent) {
    logger.info('CSP policy verification passed - all required directives present');
  } else {
    logger.error('CSP policy verification failed - missing required directives');
    throw new Error('CSP policy incomplete');
  }
}