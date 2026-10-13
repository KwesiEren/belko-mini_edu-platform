import { BaseRepository } from './base';
import { FeeComponent, FeeStructure, FeeBill, FeePayment, ReceiptCounter } from '../types/database';
import { getDatabase, runInTransaction } from '../db/connection';
import pino from 'pino';

const logger = pino({ name: 'repository:fees' });

export class FeeComponentRepository extends BaseRepository<FeeComponent> {
  protected tableName = 'fee_components';
  protected primaryKey = 'id';
  protected columns = ['name', 'amount', 'frequency', 'is_mandatory', 'academic_year_id', 'term_id', 'class_id'];

  findByAcademicYear(academicYearId: string): FeeComponent[] {
    return this.findAll({ where: { academic_year_id: academicYearId }, orderBy: 'name' });
  }

  findByStructure(structureId: string): FeeComponent[] {
    return this.db.prepare(`
      SELECT fc.* FROM fee_components fc
      JOIN fee_structure_components fsc ON fc.id = fsc.fee_component_id
      WHERE fsc.fee_structure_id = ? AND fc.deleted_at IS NULL
    `).all(structureId) as FeeComponent[];
  }
}

export class FeeStructureRepository extends BaseRepository<FeeStructure> {
  protected tableName = 'fee_structures';
  protected primaryKey = 'id';
  protected columns = ['name', 'academic_year_id', 'term_id', 'class_id'];

  findByAcademicYear(academicYearId: string): FeeStructure[] {
    return this.findAll({ where: { academic_year_id: academicYearId }, orderBy: 'name' });
  }

  getOrCreateDefault(academicYearId: string, termId?: string, classId?: string): FeeStructure {
    const where: Record<string, unknown> = { academic_year_id: academicYearId };
    if (termId) where.term_id = termId;
    if (classId) where.class_id = classId;

    const existing = this.findAll({ where, limit: 1 })[0];
    if (existing) return existing;

    return this.create({
      name: classId ? 'Class Structure' : termId ? 'Term Structure' : 'Default Structure',
      academic_year_id: academicYearId,
      term_id: termId,
      class_id: classId,
    });
  }

  addComponent(structureId: string, componentId: string): void {
    runInTransaction(() => {
      this.db.prepare(`
        INSERT OR IGNORE INTO fee_structure_components (id, fee_structure_id, fee_component_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(this.generateId(), structureId, componentId, this.getNow());
    });
  }

  removeComponent(structureId: string, componentId: string): void {
    runInTransaction(() => {
      this.db.prepare(`
        DELETE FROM fee_structure_components WHERE fee_structure_id = ? AND fee_component_id = ?
      `).run(structureId, componentId);
    });
  }
}

export class FeeBillRepository extends BaseRepository<FeeBill> {
  protected tableName = 'fee_bills';
  protected primaryKey = 'id';
  protected columns = ['student_id', 'fee_structure_id', 'academic_year_id', 'term_id', 'total_amount', 'paid_amount', 'balance', 'status', 'due_date', 'generated_by'];

  findByStudent(studentId: string): FeeBill[] {
    return this.findAll({ where: { student_id: studentId }, orderBy: 'due_date DESC' });
  }

  findByTerm(academicYearId: string, termId: string, classId?: string): FeeBill[] {
    const where: Record<string, unknown> = { academic_year_id: academicYearId, term_id: termId };
    if (classId) where.student_id = classId;
    return this.findAll({ where, orderBy: 'student_id' });
  }

  generateBillsForStructure(
    structureId: string,
    academicYearId: string,
    termId: string,
    generatedBy: string,
    dueDate: string
  ): FeeBill[] {
    const structure = new FeeStructureRepository().findById(structureId);
    if (!structure) throw new Error('Fee structure not found');

    const components = new FeeComponentRepository().findByStructure(structureId);
    const totalAmount = components.reduce((sum, c) => sum + c.amount, 0);

    let studentSql = 'SELECT id FROM students WHERE status = "active" AND deleted_at IS NULL';
    const studentParams: unknown[] = [];

    if (structure.class_id) {
      studentSql += ' AND class_id = ?';
      studentParams.push(structure.class_id);
    }

    const students = this.db.prepare(studentSql).all(...studentParams) as { id: string }[];

    const bills: FeeBill[] = [];
    const now = this.getNow();

    runInTransaction(() => {
      for (const student of students) {
        const existing = this.findAll({
          where: { student_id: student.id, fee_structure_id: structureId, academic_year_id: academicYearId, term_id: termId },
          limit: 1,
        })[0];

        if (existing) continue;

        const bill = this.create({
          student_id: student.id,
          fee_structure_id: structureId,
          academic_year_id: academicYearId,
          term_id: termId,
          total_amount: totalAmount,
          paid_amount: 0,
          balance: totalAmount,
          status: 'pending',
          due_date: dueDate,
          generated_by: generatedBy,
        });
        bills.push(bill);
      }
    });

    return bills;
  }

  updateBalance(billId: string): FeeBill | null {
    const bill = this.findById(billId);
    if (!bill) return null;

    const paidResult = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as paid
      FROM fee_payments
      WHERE bill_id = ? AND is_void = 0
    `).get(billId) as { paid: number };

    const paidAmount = paidResult.paid;
    const balance = bill.total_amount - paidAmount;
    let status: FeeBill['status'] = 'pending';

    if (balance <= 0) status = 'paid';
    else if (paidAmount > 0) status = 'partial';
    else if (new Date(bill.due_date) < new Date()) status = 'overdue';

    return this.update(billId, { paid_amount: paidAmount, balance, status });
  }

  getDebtorsList(academicYearId: string, termId: string): FeeBill[] {
    return this.findAll({
      where: { academic_year_id: academicYearId, term_id: termId },
      orderBy: 'balance DESC',
    }).filter(b => b.balance > 0);
  }
}

export class FeePaymentRepository extends BaseRepository<FeePayment> {
  protected tableName = 'fee_payments';
  protected primaryKey = 'id';
  protected columns = ['bill_id', 'student_id', 'amount', 'method', 'reference_number', 'payment_date', 'received_by', 'receipt_number', 'is_void', 'void_reason', 'voided_at', 'voided_by'];

  findByBill(billId: string): FeePayment[] {
    return this.findAll({ where: { bill_id: billId }, orderBy: 'payment_date' });
  }

  findByStudent(studentId: string): FeePayment[] {
    return this.findAll({ where: { student_id: studentId }, orderBy: 'payment_date DESC' });
  }

  findByReceiptNumber(receiptNumber: string): FeePayment | null {
    return this.findAll({ where: { receipt_number: receiptNumber }, limit: 1 })[0] || null;
  }

  getNextReceiptNumber(prefix: string, academicYearId: string): string {
    const counterRepo = new ReceiptCounterRepository();
    let counter = counterRepo.findByPrefixYear(prefix, academicYearId);

    if (!counter) {
      counter = counterRepo.create({ prefix, current_number: 0, academic_year_id: academicYearId });
    }

    const nextNumber = counter.current_number + 1;
    counterRepo.update(counter.id, { current_number: nextNumber });

    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  recordPayment(data: {
    bill_id: string;
    student_id: string;
    amount: number;
    method: FeePayment['method'];
    reference_number?: string;
    payment_date: string;
    received_by: string;
    academic_year_id: string;
  }): FeePayment {
    const bill = new FeeBillRepository().findById(data.bill_id);
    if (!bill) throw new Error('Bill not found');

    if (bill.status === 'paid' || bill.status === 'voided') {
      throw new Error('Cannot record payment on paid or voided bill');
    }

    const prefix = `RCPT-${data.academic_year_id.replace('/', '-')}-`;
    const receiptNumber = this.getNextReceiptNumber(prefix, data.academic_year_id);

    const payment = this.create({
      ...data,
      receipt_number: receiptNumber,
      is_void: 0,
    });

    new FeeBillRepository().updateBalance(data.bill_id);

    return payment;
  }

  voidPayment(paymentId: string, voidedBy: string, reason: string): FeePayment | null {
    const payment = this.findById(paymentId);
    if (!payment) return null;
    if (payment.is_void) throw new Error('Payment already voided');

    const now = this.getNow();
    const updated = this.update(paymentId, {
      is_void: 1,
      void_reason: reason,
      voided_at: now,
      voided_by: voidedBy,
    });

    if (updated) {
      new FeeBillRepository().updateBalance(payment.bill_id);
    }

    return updated;
  }

  getDailyCollection(receivedBy: string, date: string): { total: number; count: number; by_method: Record<string, number> } {
    const rows = this.db.prepare(`
      SELECT method, SUM(amount) as total, COUNT(*) as count
      FROM fee_payments
      WHERE received_by = ? AND payment_date = ? AND is_void = 0
      GROUP BY method
    `).all(receivedBy, date) as { method: string; total: number; count: number }[];

    const by_method: Record<string, number> = {};
    let total = 0;
    let count = 0;
    for (const row of rows) {
      by_method[row.method] = row.total;
      total += row.total;
      count += row.count;
    }
    return { total, count, by_method };
  }

  getCollectionReport(academicYearId: string, termId?: string, classId?: string): {
    total_billed: number;
    total_collected: number;
    total_outstanding: number;
    by_class: Array<{ class_id: string; class_name: string; billed: number; collected: number; outstanding: number }>;
    by_method: Record<string, number>;
  } {
    let billSql = `
      SELECT fb.*, s.class_id, c.name as class_name
      FROM fee_bills fb
      JOIN students s ON fb.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE fb.academic_year_id = ? AND fb.deleted_at IS NULL
    `;
    const billParams: unknown[] = [academicYearId];
    if (termId) {
      billSql += ' AND fb.term_id = ?';
      billParams.push(termId);
    }
    if (classId) {
      billSql += ' AND s.class_id = ?';
      billParams.push(classId);
    }

    const bills = this.db.prepare(billSql).all(...billParams) as (FeeBill & { class_id?: string; class_name?: string })[];

    let total_billed = 0;
    let total_collected = 0;
    const by_class = new Map<string, { class_id: string; class_name: string; billed: number; collected: number; outstanding: number }>();
    const by_method: Record<string, number> = {};

    for (const bill of bills) {
      total_billed += bill.total_amount;
      total_collected += bill.paid_amount;

      const classKey = bill.class_id || 'unassigned';
      const className = bill.class_name || 'Unassigned';
      if (!by_class.has(classKey)) {
        by_class.set(classKey, { class_id: classKey, class_name: className, billed: 0, collected: 0, outstanding: 0 });
      }
      const cls = by_class.get(classKey)!;
      cls.billed += bill.total_amount;
      cls.collected += bill.paid_amount;
      cls.outstanding += bill.balance;
    }

    const paymentRows = this.db.prepare(`
      SELECT fp.method, SUM(fp.amount) as total
      FROM fee_payments fp
      JOIN fee_bills fb ON fp.bill_id = fb.id
      WHERE fb.academic_year_id = ? AND fp.is_void = 0
      ${termId ? 'AND fb.term_id = ?' : ''}
      ${classId ? 'AND fb.student_id IN (SELECT id FROM students WHERE class_id = ?)' : ''}
      GROUP BY fp.method
    `).all(academicYearId, ...(termId ? [termId] : []), ...(classId ? [classId] : [])) as { method: string; total: number }[];

    for (const row of paymentRows) {
      by_method[row.method] = row.total;
    }

    return {
      total_billed,
      total_collected,
      total_outstanding: total_billed - total_collected,
      by_class: Array.from(by_class.values()),
      by_method,
    };
  }
}

export class ReceiptCounterRepository extends BaseRepository<ReceiptCounter> {
  protected tableName = 'receipt_counters';
  protected primaryKey = 'id';
  protected columns = ['prefix', 'current_number', 'academic_year_id'];

  findByPrefixYear(prefix: string, academicYearId: string): ReceiptCounter | null {
    return this.findAll({ where: { prefix, academic_year_id: academicYearId }, limit: 1 })[0] || null;
  }
}