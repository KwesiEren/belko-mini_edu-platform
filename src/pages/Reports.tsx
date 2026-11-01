import { useState } from "react";
import { Icon } from "../components/Icon";

type ReportTab = "report_card" | "attendance_summary" | "finance_summary";

interface StudentReport {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  class: string;
  term: string;
  attendancePresent: number;
  attendanceTotal: number;
  subjects: Array<{
    name: string;
    ca: number;
    exam: number;
    total: number;
    grade: string;
    remark: string;
  }>;
  principalRemark: string;
  classTeacherRemark: string;
}

const SAMPLE_STUDENTS: StudentReport[] = [
  {
    studentId: "std-001",
    studentName: "Chukwudi Eze",
    admissionNumber: "BEL/2026/001",
    class: "JSS 1 Green",
    term: "Second Term (2025/2026)",
    attendancePresent: 58,
    attendanceTotal: 60,
    subjects: [
      { name: "Mathematics", ca: 28, exam: 62, total: 90, grade: "A+", remark: "Exceptional mastery of algebraic concepts" },
      { name: "English Language", ca: 25, exam: 58, total: 83, grade: "A", remark: "Very expressive vocabulary and composition" },
      { name: "Basic Science & Technology", ca: 27, exam: 60, total: 87, grade: "A", remark: "High aptitude in laboratory investigations" },
      { name: "Social Studies & Civic Education", ca: 26, exam: 55, total: 81, grade: "A", remark: "Active participant in civic discussions" },
      { name: "Computer & Information Tech", ca: 29, exam: 65, total: 94, grade: "A+", remark: "Outstanding programming and practical skill" },
    ],
    classTeacherRemark: "Chukwudi is an exceptionally diligent, disciplined, and brilliant pupil.",
    principalRemark: "Commendable performance. Recommended for academic honors list.",
  },
  {
    studentId: "std-002",
    studentName: "Fatima Abubakar",
    admissionNumber: "BEL/2026/002",
    class: "JSS 1 Green",
    term: "Second Term (2025/2026)",
    attendancePresent: 59,
    attendanceTotal: 60,
    subjects: [
      { name: "Mathematics", ca: 24, exam: 52, total: 76, grade: "B+", remark: "Good performance, can improve with more practice" },
      { name: "English Language", ca: 29, exam: 64, total: 93, grade: "A+", remark: "Superb analytical reading and essay writing" },
      { name: "Basic Science & Technology", ca: 25, exam: 57, total: 82, grade: "A", remark: "Consistent and curious scientific mindset" },
      { name: "Social Studies & Civic Education", ca: 28, exam: 61, total: 89, grade: "A", remark: "Exemplary leader in group assignments" },
      { name: "Computer & Information Tech", ca: 27, exam: 58, total: 85, grade: "A", remark: "Skilled in computer applications" },
    ],
    classTeacherRemark: "A well-rounded student who excels across humanities and science.",
    principalRemark: "An admirable term result. Maintain the focus and determination.",
  },
  {
    studentId: "std-003",
    studentName: "Kofi Ansah",
    admissionNumber: "BEL/2026/003",
    class: "JSS 1 Green",
    term: "Second Term (2025/2026)",
    attendancePresent: 54,
    attendanceTotal: 60,
    subjects: [
      { name: "Mathematics", ca: 22, exam: 48, total: 70, grade: "B", remark: "Demonstrates satisfactory understanding" },
      { name: "English Language", ca: 23, exam: 51, total: 74, grade: "B", remark: "Good grasp of comprehension questions" },
      { name: "Basic Science & Technology", ca: 24, exam: 52, total: 76, grade: "B+", remark: "Shows keen interest in natural sciences" },
      { name: "Social Studies & Civic Education", ca: 25, exam: 53, total: 78, grade: "B+", remark: "Sound understanding of governance" },
      { name: "Computer & Information Tech", ca: 28, exam: 60, total: 88, grade: "A", remark: "Great natural affinity for computer systems" },
    ],
    classTeacherRemark: "Kofi is polite and attentive. Capable of higher distinctions.",
    principalRemark: "Good overall progress. More effort in core mathematics advised.",
  },
];

export default function ReportsPage({
  token: _token,
  role = "principal",
}: {
  token: string;
  role?: string;
}) {
  const [activeTab, setActiveTab] = useState<ReportTab>("report_card");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("std-001");

  const currentReport = SAMPLE_STUDENTS.find((s) => s.studentId === selectedStudentId) || SAMPLE_STUDENTS[0];

  const handlePrint = () => {
    window.print();
  };

  const calculateAverage = (report: StudentReport) => {
    const sum = report.subjects.reduce((acc, sub) => acc + sub.total, 0);
    return Math.round(sum / report.subjects.length);
  };

  return (
    <div className="reports-page space-y-6">
      {/* Hero */}
      <section className="hero print:hidden">
        <div>
          <span className="eyebrow">Academic & Administrative Analytics</span>
          <h1>Reports & Statements</h1>
          <p>Generate terminal report cards, attendance statistics, and fee collection ledgers.</p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={handlePrint}
          >
            <Icon name="printer" /> Print Report
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("report_card")}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
            activeTab === "report_card"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Icon name="book" size={16} />
          Student Terminal Report Card
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attendance_summary")}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
            activeTab === "attendance_summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Icon name="attendance" size={16} />
          Attendance Rate Analysis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("finance_summary")}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
            activeTab === "finance_summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Icon name="fees" size={16} />
          Fee Collection Summary
        </button>
      </div>

      {/* TAB 1: REPORT CARD */}
      {activeTab === "report_card" && (
        <section className="space-y-6">
          {/* Selector */}
          <div className="panel p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700">Select Student:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="rounded-lg border border-slate-300 text-sm px-3 py-1.5 bg-white text-slate-900"
              >
                {SAMPLE_STUDENTS.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentName} ({s.admissionNumber}) - {s.class}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500">
              Terminal Assessment • Academic Session 2025/2026
            </div>
          </div>

          {/* Printable Report Card Sheet */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 print:p-0 print:border-none print:shadow-none space-y-6">
            {/* Header / Crest */}
            <div className="flex items-center justify-between border-b pb-6 border-slate-200">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center text-2xl font-black">
                  B
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide text-slate-900">
                    Belko Academy of Excellence
                  </h2>
                  <p className="text-xs text-slate-600 italic">"Empowering Minds, Shaping Tomorrow"</p>
                  <p className="text-xs text-slate-500 mt-1">12 Independence Avenue, Lagos • admin@belko-edu.org</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-full text-xs uppercase tracking-wider border border-blue-200">
                  Official Terminal Report
                </span>
                <p className="text-xs text-slate-500 mt-2 font-mono">{currentReport.term}</p>
              </div>
            </div>

            {/* Student Metadata Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block">Student Name</span>
                <strong className="text-slate-900">{currentReport.studentName}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block">Admission No</span>
                <span className="font-mono text-slate-800">{currentReport.admissionNumber}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block">Class & Stream</span>
                <span className="text-slate-800">{currentReport.class}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block">Attendance Score</span>
                <span className="text-emerald-700 font-semibold">
                  {currentReport.attendancePresent} / {currentReport.attendanceTotal} days (
                  {Math.round((currentReport.attendancePresent / currentReport.attendanceTotal) * 100)}%)
                </span>
              </div>
            </div>

            {/* Subject Grade Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                    <th className="py-3 px-3">Subject</th>
                    <th className="py-3 px-3 text-center">CA (30)</th>
                    <th className="py-3 px-3 text-center">Exam (70)</th>
                    <th className="py-3 px-3 text-center">Total (100)</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-3">Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {currentReport.subjects.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{sub.name}</td>
                      <td className="py-3 px-3 text-center">{sub.ca}</td>
                      <td className="py-3 px-3 text-center">{sub.exam}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">{sub.total}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {sub.grade}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">{sub.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center flex flex-col justify-center">
                <span className="text-xs uppercase font-bold text-blue-700">Overall Term Average</span>
                <span className="text-3xl font-black text-blue-900 mt-1">{calculateAverage(currentReport)}%</span>
                <span className="text-xs text-blue-600 mt-0.5 font-medium">Class Standing: Distinction</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-3 text-xs">
                <div>
                  <strong className="text-slate-800 uppercase block">Class Teacher's Remark:</strong>
                  <p className="text-slate-600 mt-0.5 italic">"{currentReport.classTeacherRemark}"</p>
                </div>
                <div>
                  <strong className="text-slate-800 uppercase block">Principal's Final Remark:</strong>
                  <p className="text-slate-600 mt-0.5 italic">"{currentReport.principalRemark}"</p>
                </div>
              </div>
            </div>

            {/* Signature Block */}
            <div className="flex justify-between items-end pt-8 border-t border-slate-200 text-xs text-slate-500">
              <div>
                <div className="h-8 border-b border-slate-400 w-48 mb-1"></div>
                <span>Class Teacher's Signature</span>
              </div>
              <div className="text-center">
                <div className="h-10 w-24 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400 mb-1 mx-auto">
                  OFFICIAL STAMP
                </div>
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
              <div className="text-right">
                <div className="h-8 border-b border-slate-400 w-48 mb-1 ml-auto"></div>
                <span>Principal's Signature</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: ATTENDANCE SUMMARY */}
      {activeTab === "attendance_summary" && (
        <section className="space-y-6">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon teal"><Icon name="attendance" /></div>
              <div className="stat-label">Average Attendance</div>
              <div className="stat-value">93.4%</div>
              <div className="stat-note teal">+2.1% from last term</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><Icon name="students" /></div>
              <div className="stat-label">Total Student Days</div>
              <div className="stat-value">1,420</div>
              <div className="stat-note blue">Accumulated this term</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber"><Icon name="clock" /></div>
              <div className="stat-label">Late Arrivals</div>
              <div className="stat-value">14</div>
              <div className="stat-note amber">Across all cohorts</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>Class-by-Class Attendance Metrics</h2>
              <p>Roll-up comparison across junior and senior secondary levels.</p>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 uppercase">
                    <th className="p-3">Class Name</th>
                    <th className="p-3 text-center">Enrolled</th>
                    <th className="p-3 text-center">Present</th>
                    <th className="p-3 text-center">Absent</th>
                    <th className="p-3 text-center">Rate</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {[
                    { name: "JSS 1 Green", enrolled: 35, present: 33, absent: 2, rate: "94.3%", status: "Good" },
                    { name: "JSS 2 Gold", enrolled: 32, present: 30, absent: 2, rate: "93.8%", status: "Good" },
                    { name: "JSS 3 Blue", enrolled: 28, present: 27, absent: 1, rate: "96.4%", status: "Excellent" },
                    { name: "SSS 1 Science", enrolled: 30, present: 28, absent: 2, rate: "93.3%", status: "Good" },
                    { name: "SSS 2 Arts", enrolled: 26, present: 23, absent: 3, rate: "88.5%", status: "Attention" },
                    { name: "SSS 3 Commercial", enrolled: 24, present: 23, absent: 1, rate: "95.8%", status: "Excellent" },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="p-3 text-center">{row.enrolled}</td>
                      <td className="p-3 text-center text-emerald-700 font-semibold">{row.present}</td>
                      <td className="p-3 text-center text-rose-700 font-semibold">{row.absent}</td>
                      <td className="p-3 text-center font-bold text-slate-900">{row.rate}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            row.status === "Excellent"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : row.status === "Good"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: FINANCE SUMMARY */}
      {activeTab === "finance_summary" && (
        <section className="space-y-6">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon teal"><Icon name="receipt" /></div>
              <div className="stat-label">Total Fee Collections</div>
              <div className="stat-value">₦4,850,000</div>
              <div className="stat-note teal">Received to date</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber"><Icon name="fees" /></div>
              <div className="stat-label">Outstanding Balances</div>
              <div className="stat-value">₦1,120,000</div>
              <div className="stat-note amber">Pending payments</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon violet"><Icon name="grades" /></div>
              <div className="stat-label">Collection Rate</div>
              <div className="stat-value">81.2%</div>
              <div className="stat-note violet">Above 75% target</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>Revenue by Fee Component</h2>
              <p>Breakdown across tuition, lab levies, PTA and sports levies.</p>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 uppercase">
                    <th className="p-3">Component</th>
                    <th className="p-3 text-right">Billed (₦)</th>
                    <th className="p-3 text-right">Collected (₦)</th>
                    <th className="p-3 text-right">Outstanding (₦)</th>
                    <th className="p-3 text-center">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {[
                    { component: "Term Tuition & Instruction", billed: "3,750,000", collected: "3,120,000", due: "630,000", rate: "83.2%" },
                    { component: "Science Lab & ICT Levy", billed: "1,200,000", collected: "980,000", due: "220,000", rate: "81.6%" },
                    { component: "PTA Development Levy", billed: "520,000", collected: "410,000", due: "110,000", rate: "78.8%" },
                    { component: "Sports & Extra-Curricular", billed: "500,000", collected: "340,000", due: "160,000", rate: "68.0%" },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{row.component}</td>
                      <td className="p-3 text-right font-mono">{row.billed}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-semibold">{row.collected}</td>
                      <td className="p-3 text-right font-mono text-amber-700">{row.due}</td>
                      <td className="p-3 text-center font-bold text-slate-900">{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
