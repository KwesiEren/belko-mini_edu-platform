import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import type { ElectronAPI, IpcResult } from "../types/electron-api";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const electronAPI = window.electronAPI;

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface ClassOption {
  id: string;
  name: string;
}

interface AttendanceSession {
  id: string;
  class_id: string;
  stream_id?: string | null;
  subject_id?: string | null;
  session_date: string;
  start_time?: string | null;
  status: "open" | "submitted" | "closed";
  teacher_id?: string | null;
}

interface AttendanceRecord {
  student_id: string;
  status: AttendanceStatus;
}

interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  status: string;
  class_id?: string;
}

const STATUS_GROUPS: { id: AttendanceStatus; label: string }[] = [
  { id: "present", label: "Present" },
  { id: "absent", label: "Absent" },
  { id: "late", label: "Late" },
  { id: "excused", label: "Excused" },
];

const STATUS_CLASSES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 border-emerald-200 text-emerald-800",
  absent: "bg-rose-50 border-rose-200 text-rose-800",
  late: "bg-amber-50 border-amber-200 text-amber-800",
  excused: "bg-slate-50 border-slate-200 text-slate-800",
};

const SESSION_STATUS_CLASSES: Record<string, string> = {
  open: "bg-emerald-50 border-emerald-200 text-emerald-800",
  submitted: "bg-amber-50 border-amber-200 text-amber-800",
  closed: "bg-slate-50 border-slate-200 text-slate-800",
};

/* ---------------------------------------------------------------- helpers */

async function call<T>(promise: Promise<IpcResult<T>>): Promise<T | null> {
  const result = await promise;
  if (!result.ok) {
    console.error("IPC error:", result.code, result.error);
    return null;
  }
  return result.data;
}

/* ---------------------------------------------------------------- Attendance */

export default function Attendance({ token }: { token: string }) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<Map<string, AttendanceStatus>>(new Map());

  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentClass = classes.find((c) => c.id === selectedClassId);

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const status of records.values()) tally[status] = (tally[status] ?? 0) + 1;
    return tally;
  }, [records]);

  const totalMarked = Object.values(counts).reduce((sum, value) => sum + value, 0);

  /* ---------------------------------------------------------------- loading */

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError("");
        const years = await call(electronAPI.academic.yearsList(token));
        if (!years || years.length === 0) {
          setError("No academic years found. Create an academic year first.");
          setLoading(false);
          return;
        }
        const currentYear = years.find((y) => y.is_current) ?? years[0];

        const classData = await call(electronAPI.classes.list(token, currentYear.id));
        setClasses(classData ?? []);
        if (classData?.length) setSelectedClassId(classData[0].id);
      } catch {
        setError("Failed to load classes.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSession(null);
      setRecords(new Map());
      return;
    }
    (async () => {
      const data = await call(electronAPI.students.list(token, { classId: selectedClassId }));
      setStudents(data ?? []);
      setSession(null);
      setRecords(new Map());
    })();
  }, [token, selectedClassId]);

  /* ---------------------------------------------------------------- session */

  async function loadSession(sessionId: string) {
    const data = await call(electronAPI.attendance.getSession(token, sessionId));
    if (!data) {
      setError("Could not load the session.");
      return;
    }
    setSession(data.session as AttendanceSession);
    const map = new Map<string, AttendanceStatus>();
    for (const record of (data.records ?? []) as AttendanceRecord[]) {
      map.set(record.student_id, record.status);
    }
    setRecords(map);
  }

  const handleOpenOrFind = async () => {
    if (!selectedClassId || !sessionDate) return;
    setSessionLoading(true);
    setError("");
    try {
      const existing = await call(electronAPI.attendance.sessionsByClassDate(token, selectedClassId, sessionDate));
      let sessionId: string | null = null;
      if (existing && existing.length > 0) {
        sessionId = existing[0].id;
      } else {
        const created = await call(
          electronAPI.attendance.openSession(token, {
            class_id: selectedClassId,
            session_date: sessionDate,
            start_time: new Date().toTimeString().slice(0, 5),
          })
        );
        if (!created) {
          setError("Could not open a new session.");
          setSessionLoading(false);
          return;
        }
        sessionId = created.id;
      }
      await loadSession(sessionId!);
    } catch {
      setError("Failed to open or find the session.");
    } finally {
      setSessionLoading(false);
    }
  };

  const handleMark = async (studentId: string, status: AttendanceStatus) => {
    if (!session || session.status !== "open") return;
    setSaving(true);
    setError("");
    const previous = records.get(studentId);
    const next = new Map(records);
    next.set(studentId, status);
    setRecords(next);
    try {
      const ok = await call(electronAPI.attendance.mark(token, session.id, [{ student_id: studentId, status }]));
      if (!ok) {
        if (previous === undefined) next.delete(studentId);
        else next.set(studentId, previous);
        setRecords(next);
        setError("Failed to save the mark. Please try again.");
      }
    } catch {
      if (previous === undefined) next.delete(studentId);
      else next.set(studentId, previous);
      setRecords(next);
      setError("Failed to save the mark. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!session || session.status !== "open" || students.length === 0) return;
    setSaving(true);
    setError("");
    const ok = await call(electronAPI.attendance.markAllPresent(token, session.id, students.map((s) => s.id)));
    if (!ok) {
      setError("Failed to mark all students present.");
    } else {
      const next = new Map(records);
      for (const student of students) next.set(student.id, "present");
      setRecords(next);
    }
    setSaving(false);
  };

  const handleCloseSession = async () => {
    if (!session || session.status !== "open") return;
    setSessionLoading(true);
    setError("");
    const ok = await call(electronAPI.attendance.closeSession(token, session.id));
    if (!ok) {
      setError("Failed to close the session.");
    } else {
      await loadSession(session.id);
    }
    setSessionLoading(false);
  };

  const handleSubmitSession = async () => {
    if (!session || session.status !== "open") return;
    setSessionLoading(true);
    setError("");
    const ok = await call(electronAPI.attendance.submitSession(token, session.id));
    if (!ok) {
      setError("Failed to submit the session.");
    } else {
      await loadSession(session.id);
    }
    setSessionLoading(false);
  };

  const handleResetSession = () => {
    setSession(null);
    setRecords(new Map());
    setError("");
  };

  /* ---------------------------------------------------------------- render */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-slate-500">
        <Icon name="shield" size={32} />
        <p>Loading classes…</p>
      </div>
    );
  }

  const isOpen = session?.status === "open";

  return (
    <div className="attendance-page">
      <section className="hero">
        <div>
          <span className="eyebrow">Attendance</span>
          <h1>Take attendance</h1>
          <p>Mark each student present, absent, late or excused for the session.</p>
        </div>
      </section>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="mt-2 text-xs text-rose-600 decoration-rose-200 underline underline-offset-4 hover:text-rose-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {!session ? (
        <section className="panel">
          <div className="panel-heading">
            <h2>Open or find a session</h2>
            <p>Select a class and date. An existing session for that day will be opened, otherwise a new one is created.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label>Class</label>
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  disabled={sessionLoading}
                >
                  <option value="">Select a class</option>
                  {classes.map((classOption) => (
                    <option key={classOption.id} value={classOption.id}>{classOption.name}</option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">No classes for the current academic year.</p>
                )}
              </div>
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  disabled={sessionLoading}
                />
              </div>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={handleOpenOrFind}
              disabled={sessionLoading || !selectedClassId || !sessionDate}
            >
              {sessionLoading ? "Opening…" : "Open or find session"}
            </button>
          </div>
        </section>
      ) : (
        <>
          <header className="session-header">
            <div>
              <h2>{currentClass?.name ?? "Class"}</h2>
              <p>{session.session_date || sessionDate} • {students.length} students</p>
            </div>
            <div className="session-controls">
              <span
                className={`status-badge inline-block px-3 py-1 rounded-md text-xs font-bold border capitalize ${SESSION_STATUS_CLASSES[session.status] ?? ""}`}
              >
                {session.status}
              </span>
              {isOpen ? (
                <>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleMarkAllPresent}
                    disabled={saving || students.length === 0}
                  >
                    <Icon name="check" size={14} /> Mark all present
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleCloseSession}
                    disabled={sessionLoading}
                  >
                    Close session
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleSubmitSession}
                    disabled={sessionLoading}
                  >
                    Submit session
                  </button>
                </>
              ) : (
                <button type="button" className="button button-ghost" onClick={handleResetSession}>
                  Choose another session
                </button>
              )}
            </div>
          </header>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Present</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800">{counts.present}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Absent</p>
              <p className="mt-1 text-2xl font-bold text-rose-800">{counts.absent}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Late</p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{counts.late}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Excused</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{counts.excused}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            {totalMarked} of {students.length} students marked
          </p>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Students</h2>
                <p className="text-xs text-slate-500">Select a status for each student.</p>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No students found for this class.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 pr-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="text-left py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Admission no.
                      </th>
                      <th className="text-right py-3 pr-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const marked = records.get(student.id);
                      return (
                        <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 pr-4">
                            <div className="text-sm font-medium text-slate-900">
                              {student.first_name} {student.last_name}
                            </div>
                          </td>
                          <td className="py-4 text-sm text-slate-600">{student.admission_number}</td>
                          <td className="py-4 text-right space-x-1">
                            {STATUS_GROUPS.map((group) => {
                              const active = marked === group.id;
                              return (
                                <button
                                  key={group.id}
                                  type="button"
                                  aria-pressed={active}
                                  className={`status-toggle px-2.5 py-1.5 rounded-md text-xs font-bold border transition-colors ${active ? STATUS_CLASSES[group.id] : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"}`}
                                  disabled={!isOpen || saving}
                                  onClick={() => handleMark(student.id, group.id)}
                                >
                                  {active && (
                                    <span className="mr-1"><Icon name="check" size={11} /></span>
                                  )}
                                  {group.label}
                                </button>
                              );
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
