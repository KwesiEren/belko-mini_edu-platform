import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Icon } from "../components/Icon";
import type { ElectronAPI, IpcResult } from "../types/electron-api";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const electronAPI = window.electronAPI;

async function call<T>(promise: Promise<IpcResult<T>>): Promise<T | null> {
  const result = await promise;
  if (!result.ok) {
    console.error("IPC error:", result.code, result.error);
    return null;
  }
  return result.data;
}

/* ---------------------------------------------------------------- types */

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface Term {
  id: string;
  name: string;
  ordinal: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface SchoolClass {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface GradeStudent {
  id: string;
  full_name: string;
  admission_number: string;
}

interface GradeComponent {
  id: string;
  name: string;
  code?: string;
}

interface GradeSheet {
  id: string;
  status: "draft" | "submitted" | "reviewed" | "approved" | "published";
  class_id?: string;
  stream_id?: string;
  subject_id?: string;
  academic_year_id?: string;
  term_id?: string;
  teacher_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface GradeTotal {
  studentId: string;
  caTotal: number;
  examScore: number | null;
  total: number;
}

type StatusLabel = Record<string, { label: string; color: string }>;

const STATUS_LABELS: StatusLabel = {
  draft: { label: "Draft", color: "#94a8b3" },
  submitted: { label: "Submitted", color: "#45789c" },
  reviewed: { label: "Reviewed", color: "#7454a5" },
  approved: { label: "Approved", color: "#3e725f" },
  published: { label: "Published", color: "#2d827b" },
};

/* ---------------------------------------------------------------- small UI bits */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {hint && <span className="hint">{hint}</span>}
      {children}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: GradeSheet["status"] }) {
  const info = STATUS_LABELS[status];
  return (
    <span
      className="status-pill"
      style={{
        color: info.color,
        border: `1px solid ${info.color}`,
        background: `${info.color}14`,
      }}
    >
      {info.label}
    </span>
  );
}

/* ---------------------------------------------------------------- Grades */

export default function Grades({ token }: { token: string }) {
  /* ---------- selector state ---------- */
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selections, setSelections] = useState<{
    academicYearId: string;
    academicYearName: string;
    termId: string;
    termName: string;
    classId: string;
    subjectId: string;
  }>({
    academicYearId: "", academicYearName: "",
    termId: "", termName: "",
    classId: "", subjectId: "",
  });

  /* ---------- sheet state ---------- */
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [students, setStudents] = useState<GradeStudent[]>([]);
  const [components, setComponents] = useState<GradeComponent[]>([]);
  const [scores, setScores] = useState<Record<string, Record<string, number | null>>>({});
  const [totalsMap, setTotalsMap] = useState<Record<string, GradeTotal>>({});

  /* ---------- UI state ---------- */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [view, setView] = useState<"entry" | "sheets">("entry");

  /* review dialog */
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSheetId, setReviewSheetId] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "returned">("approved");
  const [reviewRemarks, setReviewRemarks] = useState("");

  /* unlock dialog */
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockSheetId, setUnlockSheetId] = useState("");
  const [unlockReason, setUnlockReason] = useState("");

  /* teacher sheets */
  const [teacherSheets, setTeacherSheets] = useState<GradeSheet[]>([]);
  const [loadingTeacherSheets, setLoadingTeacherSheets] = useState(false);

  /* ---------- data loading ---------- */

  useEffect(() => {
    (async () => {
      const result = await call(electronAPI.academic.yearsList(token));
      if (result) {
        setYears(result);
        const current = result.find((y) => y.is_current);
        if (current) {
          setSelections((prev) => ({ ...prev, academicYearId: current.id, academicYearName: current.name }));
        }
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!selections.academicYearId) return;
    (async () => {
      const [termsResult, classesResult] = await Promise.all([
        call(electronAPI.academic.termsList(token, selections.academicYearId)),
        call(electronAPI.classes.list(token, selections.academicYearId)),
      ]);
      if (termsResult) setTerms(termsResult);
      if (classesResult) setClassesList(classesResult);
      const currentTerm = termsResult?.find((t) => t.is_current);
      if (currentTerm) {
        setSelections((prev) => ({ ...prev, termId: currentTerm.id, termName: currentTerm.name }));
      }
    })();
  }, [token, selections.academicYearId]);

  useEffect(() => {
    (async () => {
      const result = await call(electronAPI.subjects.list(token));
      if (result) setSubjects(result);
    })();
  }, [token]);

  /* ---------- sheet actions ---------- */

  const openSheet = useCallback(async () => {
    if (!selections.classId || !selections.subjectId || !selections.termId) {
      setError("Please select a class, subject and term.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    const sheetResult = await call(electronAPI.grades.sheetGetOrCreate(token, {
      class_id: selections.classId,
      subject_id: selections.subjectId,
      academic_year_id: selections.academicYearId,
      term_id: selections.termId,
    }));
    if (!sheetResult) {
      setError("Could not get or create the grade sheet.");
      setLoading(false);
      return;
    }

    setSheet(sheetResult.sheet);
    setStudents(sheetResult.students);
    setScores({});

    const componentsResult = await call(electronAPI.grades.componentsList(token, {
      subject_id: selections.subjectId,
      academic_year_id: selections.academicYearId,
      term_id: selections.termId,
    }));
    if (componentsResult) setComponents(componentsResult);

    const entriesResult = await call(electronAPI.grades.entriesGet(token, sheetResult.sheet.id));
    if (entriesResult) {
      const next: Record<string, Record<string, number | null>> = {};
      for (const entry of entriesResult) {
        if (!next[entry.student_id]) next[entry.student_id] = {};
        next[entry.student_id][entry.component_id] = entry.score ?? null;
      }
      setScores(next);
    }

    const totalsResult = await call(electronAPI.grades.totals(token, sheetResult.sheet.id));
    if (totalsResult) {
      const map: Record<string, GradeTotal> = {};
      for (const t of totalsResult) map[t.studentId] = t;
      setTotalsMap(map);
    }

    setLoading(false);
  }, [token, selections]);

  const saveGrades = useCallback(async () => {
    if (!sheet) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const entries: Array<{
      student_id: string;
      component_id: string;
      score: number | null;
      is_draft: boolean;
    }> = [];
    for (const student of students) {
      for (const component of components) {
        entries.push({
          student_id: student.id,
          component_id: component.id,
          score: scores[student.id]?.[component.id] ?? null,
          is_draft: true,
        });
      }
    }

    const result = await call(electronAPI.grades.entriesBulkUpsert(token, sheet.id, entries));
    setSaving(false);
    if (result) {
      setSuccess("Grades saved.");
      const totalsResult = await call(electronAPI.grades.totals(token, sheet.id));
      if (totalsResult) {
        const map: Record<string, GradeTotal> = {};
        for (const t of totalsResult) map[t.studentId] = t;
        setTotalsMap(map);
      }
    } else {
      setError("Failed to save grades.");
    }
  }, [token, sheet, students, components, scores]);

  const submitSheet = useCallback(async () => {
    if (!sheet) return;
    setLoading(true);
    const result = await call(electronAPI.grades.sheetSubmit(token, sheet.id));
    setLoading(false);
    if (result) {
      setSuccess("Sheet submitted.");
      setSheet((prev) => (prev ? { ...prev, status: "submitted" } : prev));
    } else {
      setError("Failed to submit sheet.");
    }
  }, [token, sheet]);

  const reviewSheet = useCallback(async (action: "approved" | "returned") => {
    if (!reviewSheetId) return;
    setLoading(true);
    const result = await call(electronAPI.grades.sheetReview(token, reviewSheetId, action, reviewRemarks || undefined));
    setLoading(false);
    setReviewOpen(false);
    if (result) {
      setSuccess(`Sheet ${action === "approved" ? "approved" : "returned"}.`);
      setSheet((prev) =>
        prev && prev.id === reviewSheetId ? { ...prev, status: (action === "approved" ? "reviewed" : "draft") } : prev
      );
    } else {
      setError("Review failed.");
    }
  }, [token, reviewSheetId, reviewRemarks]);

  const approveSheet = useCallback(async () => {
    if (!sheet) return;
    setLoading(true);
    const result = await call(electronAPI.grades.sheetApprove(token, sheet.id));
    setLoading(false);
    if (result) {
      setSuccess("Sheet approved.");
      setSheet((prev) => (prev ? { ...prev, status: "approved" } : prev));
    } else {
      setError("Failed to approve sheet.");
    }
  }, [token, sheet]);

  const publishSheet = useCallback(async () => {
    if (!sheet) return;
    setLoading(true);
    const result = await call(electronAPI.grades.sheetPublish(token, sheet.id));
    setLoading(false);
    if (result) {
      setSuccess("Sheet published.");
      setSheet((prev) => (prev ? { ...prev, status: "published" } : prev));
    } else {
      setError("Failed to publish sheet.");
    }
  }, [token, sheet]);

  const unlockSheet = useCallback(async () => {
    if (!unlockSheetId || !unlockReason) return;
    setLoading(true);
    const result = await call(electronAPI.grades.sheetUnlock(token, unlockSheetId, unlockReason));
    setLoading(false);
    setUnlockOpen(false);
    setUnlockReason("");
    if (result) {
      setSuccess("Sheet unlocked — back to draft.");
      setSheet((prev) => (prev && prev.id === unlockSheetId ? { ...prev, status: "draft" } : prev));
    } else {
      setError("Failed to unlock sheet.");
    }
  }, [token, unlockSheetId, unlockReason]);

  const loadTeacherSheets = useCallback(async () => {
    setLoadingTeacherSheets(true);
    const result = await call(electronAPI.grades.sheetsByTeacher(token, selections.academicYearId, selections.termId || undefined));
    setLoadingTeacherSheets(false);
    if (result) setTeacherSheets(result);
  }, [token, selections]);

  /* ---------- derived ---------- */

  const totalFor = (studentId: string): string => {
    const t = totalsMap[studentId];
    return t ? String(t.total) : "—";
  };

  const canEdit = sheet?.status === "draft";
  const statusInfo = sheet ? STATUS_LABELS[sheet.status] : null;

  const selectorDisabled = !selections.academicYearId || !selections.termId || !selections.classId || !selections.subjectId;

  /* ---------- render ---------- */

  return (
    <div className="grades-page">
      <section className="hero">
        <div>
          <div className="eyebrow">Grades & reports</div>
          <h1>Grade sheets</h1>
          <p>Record and manage student scores by class, subject and term.</p>
        </div>
        <div className="hero-actions">
          <Button variant="secondary" onClick={() => setView("sheets")} disabled={loadingTeacherSheets}>
            <Icon name="book" size={16} /> Sheets by teacher
          </Button>
        </div>
      </section>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "9px", background: "#fdecea", color: "#88493e", fontSize: "11px", fontWeight: 700, marginBottom: 14 }}>{error}</div>
      )}
      {success && (
        <div style={{ padding: "10px 14px", borderRadius: "9px", background: "#e9f4ea", color: "#3e725f", fontSize: "11px", fontWeight: 700, marginBottom: 14 }}>{success}</div>
      )}

      {/* ---------------------------------------------------------- selector */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Select class, subject & term</h2>
            <p>Choose where to record grades.</p>
          </div>
        </div>
        <div className="field-grid" style={{ padding: "0 20px 18px 20px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "17px" }}>
          <Field label="Academic year">
            <select
              value={selections.academicYearId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const id = e.target.value;
                const year = years.find((y) => y.id === id);
                setSelections((prev) => ({ ...prev, academicYearId: id, academicYearName: year ? year.name : prev.academicYearName }));
              }}
              disabled={loading}
            >
              <option value="">Choose a year</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Term">
            <select
              value={selections.termId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const id = e.target.value;
                const term = terms.find((t) => t.id === id);
                setSelections((prev) => ({ ...prev, termId: id, termName: term ? term.name : prev.termName }));
              }}
              disabled={loading || !selections.academicYearId}
            >
              <option value="">Choose a term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select
              value={selections.classId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelections((prev) => ({ ...prev, classId: e.target.value }))}
              disabled={loading || !selections.academicYearId}
            >
              <option value="">Choose a class</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <select
              value={selections.subjectId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelections((prev) => ({ ...prev, subjectId: e.target.value }))}
              disabled={loading}
            >
              <option value="">Choose a subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <div style={{ alignSelf: "end", display: "flex", gap: "9px" }}>
            <Button onClick={openSheet} disabled={loading || selectorDisabled}>
              {loading ? "Loading…" : "Get or create sheet"}
            </Button>
            {sheet && <Button variant="secondary" onClick={() => setScores({})} disabled={saving || !canEdit}>Clear</Button>}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- entry view */}
      {view === "entry" && (
        <>
          {sheet && (
            <section className="panel">
              <div className="panel-heading" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "18px 20px 13px" }}>
                <div>
                  <h2 style={{ margin: "0 0 5px 0", color: "#263d41", fontSize: "13px" }}>Grade sheet</h2>
                  <p style={{ margin: 0, color: "#85928f", fontSize: "10px" }}>
                    {students.length} student{students.length !== 1 ? "s" : ""} • status{" "}
                    <StatusPill status={sheet.status} />
                  </p>
                </div>
                <div className="workflow" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {sheet.status === "draft" && (
                    <>
                      <Button onClick={saveGrades} disabled={saving || !canEdit}>
                        <Icon name="check" size={16} /> Save grades
                      </Button>
                      <Button variant="secondary" onClick={submitSheet} disabled={loading || !canEdit}>Submit sheet</Button>
                    </>
                  )}
                  {sheet.status === "submitted" && (
                    <Button variant="secondary" onClick={() => { setReviewOpen(true); setReviewSheetId(sheet.id); setReviewAction("approved"); setReviewRemarks(""); }} disabled={loading}>
                      Review sheet
                    </Button>
                  )}
                  {sheet.status === "reviewed" && (
                    <Button variant="secondary" onClick={approveSheet} disabled={loading}>Approve sheet</Button>
                  )}
                  {sheet.status === "approved" && (
                    <Button variant="secondary" onClick={publishSheet} disabled={loading}>Publish sheet</Button>
                  )}
                  {sheet.status === "published" && (
                    <Button variant="secondary" onClick={() => { setUnlockOpen(true); setUnlockSheetId(sheet.id); setUnlockReason(""); }} disabled={loading}>
                      Unlock sheet
                    </Button>
                  )}
                </div>
              </div>
              <div style={{ padding: "0 20px 10px 20px", overflowX: "auto" }}>
                <table className="grades-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px 12px", color: "#71817e", fontSize: "9px", fontWeight: 800, borderBottom: "1px solid #e0e6e0" }}>Student</th>
                      {components.map((component) => (
                        <th key={component.id} style={{ textAlign: "center", padding: "10px 8px", color: "#71817e", fontSize: "9px", fontWeight: 800, borderBottom: "1px solid #e0e6e0", borderRight: "1px solid #e0e6e0" }}>
                          {component.name}
                        </th>
                      ))}
                      <th style={{ textAlign: "center", padding: "10px 8px", color: "#71817e", fontSize: "9px", fontWeight: 800, borderBottom: "1px solid #e0e6e0" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} style={{ borderBottom: "1px solid #e8ece7" }}>
                        <td style={{ padding: "10px 12px", color: "#30484b", fontSize: "11px" }}>
                          <div style={{ fontWeight: 600 }}>{student.admission_number}</div>
                          <div style={{ color: "#879491", fontSize: "10px", marginTop: 2 }}>{student.full_name}</div>
                        </td>
                        {components.map((component) => (
                          <td key={component.id} style={{ padding: "10px 8px", textAlign: "center", borderRight: "1px solid #e0e6e0" }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={scores[student.id]?.[component.id] ?? ""}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                setScores((prev) => {
                                  const byStudent = { ...(prev[student.id] || {}) };
                                  byStudent[component.id] = value;
                                  return { ...prev, [student.id]: byStudent };
                                });
                              }}
                              disabled={!canEdit || saving}
                            />
                          </td>
                        ))}
                        <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 600, color: "#183b3d" }}>
                          {totalFor(student.id)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {students.length === 0 && (
                  <p style={{ padding: "10px 12px", color: "#85928f", fontSize: "11px", textAlign: "center" }}>No students found in this class.</p>
                )}
              </div>
              <div style={{ padding: "0 20px 18px 20px", display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={saveGrades} disabled={saving || !canEdit || students.length === 0}>
                  {saving ? "Saving…" : <><Icon name="check" size={16} /> Save grades</>}
                </Button>
              </div>
            </section>
          )}
          {!sheet && (
            <div className="placeholder-page" style={{ minHeight: "40vh" }}>
              <p style={{ color: "#85928f", fontSize: "13px" }}>Select a class, subject and term above, then create or open a grade sheet.</p>
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------------- teacher sheets view */}
      {view === "sheets" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2 style={{ margin: "0 0 5px 0", color: "#263d41", fontSize: "13px" }}>Sheets by teacher</h2>
              <p style={{ margin: 0, color: "#85928f", fontSize: "10px" }}>All grade sheets you own for the selected year and term.</p>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Button variant="secondary" onClick={loadTeacherSheets} disabled={loadingTeacherSheets}>
                {loadingTeacherSheets ? "Loading…" : "Refresh"}
              </Button>
            </div>
          </div>
          <div style={{ padding: "0 20px 18px 20px" }}>
            {teacherSheets.length === 0 && !loadingTeacherSheets && (
              <p style={{ color: "#85928f", fontSize: "11px", textAlign: "center" }}>No grade sheets found for this year and term.</p>
            )}
            <table className="grades-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#71817e", fontSize: "9px", fontWeight: 800, borderBottom: "1px solid #e0e6e0" }}>Subject</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#71817e", fontSize: "9px", fontWeight: 800, borderBottom: "1px solid #e0e6e0" }}>Class</th>
                  <th style={{ textAlign: "center", padding: "10px 8px", color: "#71817e", fontSize: "9px", fontWeight: 800, borderBottom: "1px solid #e0e6e0" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#71817e", fontSize: "9px", fontWeight: 800, borderBottom: "1px solid #e0e6e0" }}>Updated</th>
                  <th style={{ textAlign: "center", padding: "10px 8px", color: "#71817e", fontSize: "9px", fontWeight: 800, borderBottom: "1px solid #e0e6e0" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teacherSheets.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #e8ece7" }}>
                    <td style={{ padding: "10px 12px", color: "#30484b", fontSize: "11px" }}>{s.subject_id || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#30484b", fontSize: "11px" }}>{s.class_id || "—"}</td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}><StatusPill status={s.status} /></td>
                    <td style={{ padding: "10px 12px", color: "#879491", fontSize: "10px" }}>{s.updated_at || s.created_at || "—"}</td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      {s.status === "draft" && <Button variant="ghost" onClick={() => { setSheet(s); setView("entry"); }} >Open</Button>}
                      {s.status === "submitted" && <Button variant="secondary" onClick={() => { setReviewOpen(true); setReviewSheetId(s.id); setReviewAction("approved"); setReviewRemarks(""); }}>Review</Button>}
                      {s.status === "reviewed" && <Button variant="secondary" onClick={() => { setSheet(s); setView("entry"); approveSheet(); }}>Approve</Button>}
                      {s.status === "approved" && <Button variant="secondary" onClick={() => { setSheet(s); setView("entry"); publishSheet(); }}>Publish</Button>}
                      {s.status === "published" && <Button variant="secondary" onClick={() => { setUnlockOpen(true); setUnlockSheetId(s.id); setUnlockReason(""); }}>Unlock</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- review dialog */}
      {reviewOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "#00000088",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setReviewOpen(false)}
        >
          <div
            style={{
              width: "min(420px, 92vw)",
              padding: 18,
              borderRadius: 11,
              background: "#fafbf9",
              border: "1px solid #e0e6e0",
              boxShadow: "0 20px 60px #102d3244",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, fontSize: "11px", color: "#30484b", marginBottom: 10 }}>Review grade sheet</div>
            <div className="field">
              <label>Action</label>
              <select
                value={reviewAction}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setReviewAction(e.target.value as "approved" | "returned")}
              >
                <option value="approved">Approve</option>
                <option value="returned">Return to teacher</option>
              </select>
            </div>
            {reviewAction === "returned" && (
              <div className="field">
                <label>Remarks (why returned)</label>
                <textarea value={reviewRemarks} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReviewRemarks(e.target.value)} />
              </div>
            )}
            <div style={{ display: "flex", gap: "9px", justifyContent: "flex-end", marginTop: 14 }}>
              <Button variant="secondary" onClick={() => setReviewOpen(false)}>Cancel</Button>
              <Button onClick={() => reviewSheet(reviewAction)} disabled={loading}>Confirm review</Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- unlock dialog */}
      {unlockOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "#00000088",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setUnlockOpen(false)}
        >
          <div
            style={{
              width: "min(420px, 92vw)",
              padding: 18,
              borderRadius: 11,
              background: "#fafbf9",
              border: "1px solid #e0e6e0",
              boxShadow: "0 20px 60px #102d3244",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, fontSize: "11px", color: "#30484b", marginBottom: 10 }}>Unlock grade sheet</div>
            <p style={{ color: "#85928f", fontSize: "10px", margin: "0 0 10px 0" }}>Unlocking returns the sheet to draft so scores can be edited again.</p>
            <div className="field">
              <label>Reason</label>
              <input value={unlockReason} onChange={(e: ChangeEvent<HTMLInputElement>) => setUnlockReason(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "9px", justifyContent: "flex-end", marginTop: 14 }}>
              <Button variant="secondary" onClick={() => setUnlockOpen(false)}>Cancel</Button>
              <Button onClick={unlockSheet} disabled={loading || !unlockReason}>Unlock</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
