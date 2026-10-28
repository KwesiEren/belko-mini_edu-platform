import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Icon } from "../components/Icon";
import type { ElectronAPI, IpcResult } from "../types/electron-api";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const electronAPI = window.electronAPI;

type Student = {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  status: string;
  class_id?: string | null;
};

const ALL_STATUSES: { value: string; label: string; color: string }[] = [
  { value: "active", label: "Active", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "graduated", label: "Graduated", color: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "transferred", label: "Transferred", color: "border-violet-200 bg-violet-50 text-violet-700" },
  { value: "suspended", label: "Suspended", color: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "withdrawn", label: "Withdrawn", color: "border-rose-200 bg-rose-50 text-rose-700" },
];

const statusByValue = (value: string) =>
  ALL_STATUSES.find((s) => s.value === value) ?? { value: "active", label: "Active", color: "" };

async function call<T>(promise: Promise<IpcResult<T>>): Promise<T | null> {
  const result = await promise;
  if (!result.ok) {
    console.error("IPC error:", result.code, result.error);
    return null;
  }
  return result.data;
}

/* ---------------------------------------------------------------- local UI */

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  ariaLabel,
  type,
  disabled,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button
      type={type ?? "button"}
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {hint && <span className="hint">{hint}</span>}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- StudentsPage */

function StudentsPage({ token }: { token: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    admission_number: "",
    first_name: "",
    last_name: "",
    class_id: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [statusMenu, setStatusMenu] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    const data = await call(electronAPI.students.list(token));
    if (data) setStudents(data);
    else setError("Could not load students. Please try again.");
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      s.admission_number.toLowerCase().includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.class_id && s.class_id.toLowerCase().includes(q))
    );
  }, [students, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ admission_number: "", first_name: "", last_name: "", class_id: "", status: "active" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingId(student.id);
    setForm({
      admission_number: student.admission_number,
      first_name: student.first_name,
      last_name: student.last_name,
      class_id: student.class_id ?? "",
      status: student.status,
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    let ok = false;
    if (editingId) {
      const data = await call(electronAPI.students.update(token, { id: editingId, ...form }));
      ok = data !== null;
    } else {
      const data = await call(electronAPI.students.create(token, form));
      ok = data !== null;
    }
    if (ok) {
      await loadStudents();
      setModalOpen(false);
    } else {
      setError("Save failed. Please try again.");
    }
    setSaving(false);
  };

  const handleChangeStatus = async (id: string, status: string, reason?: string) => {
    setStatusMenu(null);
    const data = await call(electronAPI.students.changeStatus(token, id, status, reason));
    if (data) {
      await loadStudents();
    } else {
      setError("Failed to change status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    const data = await call(electronAPI.students.delete(token, id));
    if (data) {
      await loadStudents();
    } else {
      setError("Failed to delete student.");
    }
  };

  const statusChip = (value: string) => {
    const status = statusByValue(value);
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold ${status.color}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
        {status.label}
      </span>
    );
  };

  return (
    <div className="students-page">
      <section className="hero">
        <div>
          <div className="eyebrow">Students</div>
          <h1>Student records</h1>
          <p>Manage admissions, enrolment status and class assignment.</p>
        </div>
        <div className="hero-actions">
          <Button onClick={openCreate}><Icon name="plus" size={16} /> Add student</Button>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-semibold mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-end mb-6">
        <div className="flex-1 min-w-0">
          <Field label="Search students">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={16} /></div>
              <input
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md bg-white text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Admission number or name…"
              />
            </div>
          </Field>
        </div>
        <span className="text-slate-500 text-xs font-semibold whitespace-nowrap">
          {filtered.length} of {students.length} students
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
          <Icon name="shield" size={24} />
          <p>Loading students…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500 text-center">
          <div className="rounded-full border border-slate-200 bg-slate-50 p-4 text-slate-400"><Icon name="students" size={32} /></div>
          <h2 className="text-slate-800 font-semibold text-sm">No students found</h2>
          <p>{search ? "Try adjusting your search." : "Add your first student to get started."}</p>
          {!search && (
            <Button variant="secondary" onClick={openCreate}><Icon name="plus" size={16} /> Add student</Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Admission no.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">First name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Last name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => {
                const statusMenuOpen = statusMenu === student.id;
                return (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-800">{student.admission_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{student.first_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{student.last_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="status-cell">
                        {statusMenuOpen ? (
                          <div className="flex flex-col gap-2">
                            <select
                              value={student.status}
                              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                const next = e.target.value;
                                const reason = window.prompt(
                                  `Reason for changing ${student.first_name} to ${statusByValue(next).label} (optional):`
                                );
                                handleChangeStatus(student.id, next, reason || undefined);
                              }}
                              className="w-full py-1.5 border border-slate-200 rounded-md bg-white text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}{s.value === student.status ? " — current" : ""}
                                </option>
                              ))}
                            </select>
                            <Button variant="ghost" className="text-xs" onClick={() => setStatusMenu(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            {statusChip(student.status)}
                            <Button
                              variant="ghost"
                              className="ml-2 text-xs text-slate-500 hover:text-emerald-700"
                              onClick={() => setStatusMenu(student.id)}
                              ariaLabel={`Change status for ${student.first_name} ${student.last_name}`}
                            >
                              Change status
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800">{student.class_id ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-sm">
                      <Button variant="secondary" className="text-xs" onClick={() => openEdit(student)}>
                        <Icon name="chevron" size={13} /> Edit
                      </Button>
                      <Button variant="ghost" className="ml-2 text-xs text-rose-600 hover:text-rose-800" onClick={() => handleDelete(student.id)}>
                        <Icon name="close" size={13} /> Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
          aria-hidden="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-800 font-semibold">{editingId ? "Edit student" : "Add student"}</h2>
              <Button variant="ghost" className="text-slate-400 hover:text-slate-800" onClick={() => setModalOpen(false)} ariaLabel="Close">
                <Icon name="close" size={17} />
              </Button>
            </div>
            {error && (
              <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs font-semibold">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Admission number" hint="Unique admission number for the student">
                <input
                  value={form.admission_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, admission_number: e.target.value }))}
                  placeholder="e.g. BEL/2026/001"
                  required
                />
              </Field>
              <Field label="First name">
                <input
                  value={form.first_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  placeholder="First name"
                  required
                />
              </Field>
              <Field label="Last name">
                <input
                  value={form.last_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Last name"
                  required
                />
              </Field>
              <Field label="Class" hint="Optional class identifier">
                <input
                  value={form.class_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value }))}
                  placeholder="e.g. JSS 1A"
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create student"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentsPage;
