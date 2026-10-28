import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon, type IconName } from "../components/Icon";
import type { ElectronAPI, IpcResult } from "../types/electron-api";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const electronAPI = window.electronAPI;

/* ---------------------------------------------------------------- helpers */

async function call<T>(promise: Promise<IpcResult<T>>): Promise<T | null> {
  const result = await promise;
  if (!result.ok) {
    console.error("IPC error:", result.code, result.error);
    return null;
  }
  return result.data;
}

/* ---------------------------------------------------------------- types */

type Year = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

type Term = {
  id: string;
  name: string;
  ordinal: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

type Student = {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  status: string;
  class_id?: string;
};

type Bill = {
  id: string;
  student_id: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: "pending" | "partial" | "paid" | "overdue" | "voided";
  due_date: string;
};

type Component = {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  is_mandatory: boolean;
};

type CollectionReport = {
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  by_class: Array<{
    class_id: string;
    class_name: string;
    billed: number;
    collected: number;
    outstanding: number;
  }>;
  by_method: Record<string, number>;
};

const PAYMENT_METHODS: Array<{
  value: "cash" | "bank_transfer" | "cheque" | "mobile_money" | "card" | "other";
  label: string;
}> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function formatMoney(amount: number) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-[#dcefee] text-[#2d827b]";
    case "partial":
      return "bg-[#e2eff6] text-[#45789c]";
    case "pending":
      return "bg-[#f8edd7] text-[#875e24]";
    case "overdue":
      return "bg-[#f4d9d2] text-[#88493e]";
    case "voided":
      return "bg-[#e6e9df] text-[#647875]";
    default:
      return "bg-[#e6e9df] text-[#647875]";
  }
}

/* ---------------------------------------------------------------- StatCard */

function StatCard({
  label,
  value,
  note,
  color,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
  icon: IconName;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon name={icon} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-note ${color}`}>{note}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- BillTable */

function BillTable({
  bills,
  studentById,
  onRecordPayment,
}: {
  bills: Bill[];
  studentById: Record<string, Student>;
  onRecordPayment: (billId: string) => void;
}) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full border-collapse border border-[#d6ded8]">
        <thead>
          <tr>
            <th className="border-b border-[#d6ded8] bg-[#f6f8f5] px-4 py-3 text-left text-[9px] font-bold text-[#647875]">
              Student
            </th>
            <th className="border-b border-[#d6ded8] bg-[#f6f8f5] px-4 py-3 text-right text-[9px] font-bold text-[#647875]">
              Total
            </th>
            <th className="border-b border-[#d6ded8] bg-[#f6f8f5] px-4 py-3 text-right text-[9px] font-bold text-[#647875]">
              Paid
            </th>
            <th className="border-b border-[#d6ded8] bg-[#f6f8f5] px-4 py-3 text-right text-[9px] font-bold text-[#647875]">
              Balance
            </th>
            <th className="border-b border-[#d6ded8] bg-[#f6f8f5] px-4 py-3 text-left text-[9px] font-bold text-[#647875]">
              Status
            </th>
            <th className="border-b border-[#d6ded8] bg-[#f6f8f5] px-4 py-3 text-right text-[9px] font-bold text-[#647875]">
              Due date
            </th>
            <th className="border-b border-[#d6ded8] bg-[#f6f8f5] px-4 py-3 text-right text-[9px] font-bold text-[#647875]">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {bills.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-4 text-center text-[12px] text-[#748482]">
                No bills generated for this term yet.
              </td>
            </tr>
          ) : (
            bills.map((bill) => {
              const student = studentById[bill.student_id];
              const name = student ? `${student.first_name} ${student.last_name}` : "Unknown student";
              const admission = student ? student.admission_number : "";
              const payable = bill.balance > 0 && bill.status !== "paid" && bill.status !== "voided";
              return (
                <tr key={bill.id} className="border-b border-[#d6ded8]">
                  <td className="px-4 py-3 text-[12px]">
                    <div className="font-bold">{name}</div>
                    {admission && <div className="text-[9px] text-[#748482]">{admission}</div>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-right font-bold">
                    {formatMoney(bill.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-right">{formatMoney(bill.paid_amount)}</td>
                  <td className="px-4 py-3 text-[12px] text-right font-bold">
                    {formatMoney(bill.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-transparent text-[9px] font-bold ${statusClasses(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#748482] text-right">
                    {formatDate(bill.due_date)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {payable ? (
                      <button
                        type="button"
                        className="border border-[#d6ded8] rounded px-3 py-1 text-[9px] font-bold text-[#1e6664] bg-white hover:bg-[#f5faf7]"
                        onClick={() => onRecordPayment(bill.id)}
                      >
                        Record payment
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-[#748482]">
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- Fees */

export default function Fees({ token }: { token: string }) {
  const [years, setYears] = useState<Year[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debtors, setDebtors] = useState<Bill[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [report, setReport] = useState<CollectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [payment, setPayment] = useState<{
    billId: string;
    amount: string;
    method: string;
    reference: string;
    paymentDate: string;
  }>({
    billId: "",
    amount: "",
    method: "cash",
    reference: "",
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  const studentById = useMemo(() => {
    const map: Record<string, Student> = {};
    for (const student of students) map[student.id] = student;
    return map;
  }, [students]);

  const year = years.find((y) => y.id === yearId);
  const term = terms.find((t) => t.id === termId);
  const selectedBill = bills.find((b) => b.id === payment.billId);
  const outstandingBills = bills.filter(
    (b) => b.balance > 0 && b.status !== "paid" && b.status !== "voided"
  );

  const totalBilled = report?.total_billed ?? 0;
  const totalCollected = report?.total_collected ?? 0;
  const outstandingBalance = report?.total_outstanding ?? Math.max(0, totalBilled - totalCollected);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const amountValue = Number(payment.amount);
  const amountValid =
    Number.isFinite(amountValue) &&
    amountValue >= 1 &&
    amountValue % 1 === 0 &&
    selectedBill != null &&
    amountValue <= selectedBill.balance;

  const loadData = useCallback(async () => {
    if (!yearId || !termId) return;
    setLoading(true);
    const [billsData, debtorsData, reportData] = await Promise.all([
      call(electronAPI.fees.billsList(token, { academic_year_id: yearId, term_id: termId })),
      call(electronAPI.fees.debtors(token, yearId, termId)),
      call(electronAPI.fees.collectionReport(token, { academic_year_id: yearId, term_id: termId })),
    ]);
    setBills((billsData ?? []) as Bill[]);
    setDebtors((debtorsData ?? []) as Bill[]);
    setReport(reportData as CollectionReport | null);
    if (billsData === null) {
      setNotice({ kind: "error", text: "Could not load bills. Please try again." });
    }
    setLoading(false);
  }, [token, yearId, termId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await call(electronAPI.academic.yearsList(token));
      if (!cancelled && data) setYears(data as Year[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const current = years.find((y) => y.is_current);
    if (current && yearId !== current.id) setYearId(current.id);
    else if (!yearId && years[0]) setYearId(years[0].id);
  }, [years, yearId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!yearId) return;
      const data = await call(electronAPI.academic.termsList(token, yearId));
      if (!cancelled && data) setTerms(data as Term[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, yearId]);

  useEffect(() => {
    const current = terms.find((t) => t.is_current);
    if (current && termId !== current.id) setTermId(current.id);
    else if (!termId && terms[0]) setTermId(terms[0].id);
  }, [terms, termId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!yearId) return;
      const data = await call(electronAPI.fees.componentsList(token, yearId));
      if (!cancelled && data) setComponents(data as Component[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, yearId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await call(electronAPI.students.list(token));
      if (!cancelled && data) setStudents(data as Student[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const selectBill = useCallback((billId: string) => {
    setPayment((prev) => ({ ...prev, billId }));
  }, []);

  const handleGenerateBills = useCallback(async () => {
    if (!yearId || !termId || !term) return;
    setGenerating(true);
    setNotice(null);
    const dueDate = term.end_date || new Date().toISOString().slice(0, 10);
    const structureData = await call(
      electronAPI.fees.structureGetOrDefault(token, {
        academic_year_id: yearId,
        term_id: termId,
      })
    );
    if (!structureData) {
      setGenerating(false);
      return;
    }
    const { structure } = structureData as { structure: { id: string } };
    const generated = await call(
      electronAPI.fees.billsGenerate(token, {
        structure_id: structure.id,
        academic_year_id: yearId,
        term_id: termId,
        due_date: dueDate,
      })
    );
    setGenerating(false);
    if (generated === null) return;
    setNotice({
      kind: "success",
      text: `Bills generated for ${generated.length} student${generated.length === 1 ? "" : "s"}`,
    });
    loadData();
  }, [token, yearId, termId, term, loadData]);

  const handleRecordPayment = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!payment.billId) {
        setNotice({ kind: "error", text: "Please select a bill." });
        return;
      }
      if (!amountValid) {
        setNotice({ kind: "error", text: "Enter a valid whole number amount within the outstanding balance." });
        return;
      }
      setRecording(true);
      const result = await call(
        electronAPI.fees.paymentRecord(token, {
          bill_id: payment.billId,
          amount: amountValue,
          method: payment.method,
          reference_number: payment.reference || undefined,
          payment_date: payment.paymentDate || new Date().toISOString().slice(0, 10),
        })
      );
      setRecording(false);
      if (result === null) return;
      setNotice({ kind: "success", text: "Payment recorded successfully." });
      setPayment({
        billId: "",
        amount: "",
        method: "cash",
        reference: "",
        paymentDate: new Date().toISOString().slice(0, 10),
      });
      loadData();
    },
    [token, payment, amountValid, loadData]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Icon name="shield" size={32} />
        <p className="text-[#748482] text-[12px]">Loading fees…</p>
      </div>
    );
  }

  const yearLabel = year?.name ?? "";
  const termLabel = term?.name ?? "";
  const componentTotal = components.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className="fees-page">
      {notice && (
        <div
          className={`rounded-lg border p-3 mb-4 text-[10px] font-bold ${
            notice.kind === "success"
              ? "border-[#d8eadc] bg-[#edf3eb] text-[#34725f]"
              : "border-[#e8c7c2] bg-[#f4d9d2] text-[#88493e]"
          }`}
          role="alert"
        >
          {notice.text}
        </div>
      )}

      <section className="hero">
        <div>
          <div className="eyebrow">Fees & payments</div>
          <h1>Fee collection</h1>
          <p>
            {yearLabel && termLabel
              ? `Manage bills and payments for ${termLabel}, ${yearLabel}.`
              : "Select an academic year and term to manage fees."}
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="button button-primary"
            disabled={generating || !yearId || !termId}
            onClick={handleGenerateBills}
          >
            {generating ? "Generating bills…" : (
              <>
                <Icon name="plus" size={17} /> Generate bills
              </>
            )}
          </button>
        </div>
      </section>

      <div className="flex gap-[16px] items-end">
        <div className="field" style={{ flex: 1 }}>
          <label>Academic year</label>
          <select
            value={yearId}
            onChange={(event) => setYearId(event.target.value)}
            disabled={loading || !yearId}
          >
            <option value="">Select a year</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Term</label>
          <select
            value={termId}
            onChange={(event) => setTermId(event.target.value)}
            disabled={loading || !yearId}
          >
            <option value="">Select a term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <span className="text-[9px] text-[#748482]">
          {components.length} fee component(s) · {formatMoney(componentTotal)} per student
        </span>
      </div>

      <section className="stats-grid" aria-label="Fee collection summary">
        <StatCard label="Total billed" value={formatMoney(totalBilled)} note="Fees billed this term" color="amber" icon="fees" />
        <StatCard label="Total collected" value={formatMoney(totalCollected)} note="Received this term" color="teal" icon="receipt" />
        <StatCard label="Outstanding" value={formatMoney(outstandingBalance)} note="Balance still owed" color="blue" icon="students" />
        <StatCard label="Collection rate" value={`${collectionRate}%`} note="Of total billed" color="violet" icon="grades" />
      </section>

      <section className="panel" aria-label="Bills">
        <div className="panel-heading">
          <div>
            <h2>Bills</h2>
            <p>{bills.length} bill{bills.length !== 1 ? "s" : ""} for {termLabel}</p>
          </div>
        </div>
        <BillTable bills={bills} studentById={studentById} onRecordPayment={selectBill} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Debtors</h2>
            <p>
              {debtors.length} of {bills.length} bill{bills.length !== 1 ? "s" : ""} carry an outstanding balance
            </p>
          </div>
        </div>
        {debtors.length === 0 ? (
          <div className="px-4 py-4 text-center text-[12px] text-[#748482]">
            No outstanding balances — all bills for this term are paid.
          </div>
        ) : (
          <BillTable bills={debtors} studentById={studentById} onRecordPayment={selectBill} />
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Record payment</h2>
            <p>Record a payment against an outstanding bill.</p>
          </div>
        </div>
        <form onSubmit={handleRecordPayment} className="field-grid">
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label>Bill</label>
            <select
              value={payment.billId}
              onChange={(event) => setPayment((prev) => ({ ...prev, billId: event.target.value }))}
            >
              <option value="">Select a bill</option>
              {outstandingBills.map((bill) => {
                const student = studentById[bill.student_id];
                const name = student ? `${student.first_name} ${student.last_name}` : "Unknown student";
                const admission = student ? student.admission_number : "";
                return (
                  <option key={bill.id} value={bill.id}>
                    {name}{admission ? ` (${admission})` : ""} — balance {formatMoney(bill.balance)}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="field">
            <label>Amount (₦)</label>
            <input
              type="number"
              min="0"
              step="1"
              max={selectedBill ? selectedBill.balance : 0}
              value={payment.amount}
              onChange={(event) => setPayment((prev) => ({ ...prev, amount: event.target.value }))}
            />
            {selectedBill && (
              <span className="text-[9px] text-[#748482]">Max {formatMoney(selectedBill.balance)}</span>
            )}
          </div>
          <div className="field">
            <label>Method</label>
            <select
              value={payment.method}
              onChange={(event) => setPayment((prev) => ({ ...prev, method: event.target.value }))}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Reference number (optional)</label>
            <input
              type="text"
              value={payment.reference}
              onChange={(event) => setPayment((prev) => ({ ...prev, reference: event.target.value }))}
              placeholder="e.g. cheque number"
            />
          </div>
          <div className="field">
            <label>Payment date</label>
            <input
              type="date"
              value={payment.paymentDate}
              onChange={(event) => setPayment((prev) => ({ ...prev, paymentDate: event.target.value }))}
            />
          </div>
          <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="button button-primary w-full"
              disabled={recording || !payment.billId || !amountValid}
            >
              {recording ? "Recording payment…" : (
                <>
                  <Icon name="receipt" size={17} /> Record payment
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
