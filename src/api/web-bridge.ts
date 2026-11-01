import type { ElectronAPI, IpcResult } from "../types/electron-api";

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

function err<T = any>(error: string, code = "ERR_FAILED"): IpcResult<T> {
  return { ok: false, error, code };
}

const STORAGE_PREFIX = "belko_edu_platform_";

function loadStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

// ------------------------------------------------------------- Initial Seed Data
const SEED_SCHOOL = {
  id: "school-01",
  name: "Belko Academy of Excellence",
  motto: "Empowering Minds, Shaping Tomorrow",
  primary_color: "#1e3a8a",
  currency: "₦",
  email: "admin@belko-edu.org",
  phone: "+234 802 345 6789",
  address: "12 Independence Avenue, Lagos",
};

const SEED_USERS = [
  {
    id: "usr-principal",
    email: "principal@belko.org",
    full_name: "Dr. Kwame Mensah",
    role: "principal",
    is_active: true,
  },
  {
    id: "usr-teacher",
    email: "teacher@belko.org",
    full_name: "Amina Bello",
    role: "teacher",
    is_active: true,
  },
  {
    id: "usr-secretary",
    email: "secretary@belko.org",
    full_name: "Chidi Okonkwo",
    role: "secretary",
    is_active: true,
  },
  {
    id: "usr-admin",
    email: "admin@belko.org",
    full_name: "System Administrator",
    role: "super_admin",
    is_active: true,
  },
];

const SEED_YEARS = [
  {
    id: "ay-2025-2026",
    name: "2025/2026 Academic Session",
    start_date: "2025-09-01",
    end_date: "2026-07-31",
    is_current: true,
  },
];

const SEED_TERMS = [
  {
    id: "term-1",
    academic_year_id: "ay-2025-2026",
    name: "First Term",
    ordinal: 1,
    start_date: "2025-09-01",
    end_date: "2025-12-18",
    is_current: false,
  },
  {
    id: "term-2",
    academic_year_id: "ay-2025-2026",
    name: "Second Term",
    ordinal: 2,
    start_date: "2026-01-08",
    end_date: "2026-04-10",
    is_current: true,
  },
  {
    id: "term-3",
    academic_year_id: "ay-2025-2026",
    name: "Third Term",
    ordinal: 3,
    start_date: "2026-04-28",
    end_date: "2026-07-24",
    is_current: false,
  },
];

const SEED_CLASSES = [
  { id: "cls-jss1", name: "JSS 1 Green", academic_year_id: "ay-2025-2026" },
  { id: "cls-jss2", name: "JSS 2 Gold", academic_year_id: "ay-2025-2026" },
  { id: "cls-jss3", name: "JSS 3 Blue", academic_year_id: "ay-2025-2026" },
  { id: "cls-sss1", name: "SSS 1 Science", academic_year_id: "ay-2025-2026" },
  { id: "cls-sss2", name: "SSS 2 Arts", academic_year_id: "ay-2025-2026" },
  { id: "cls-sss3", name: "SSS 3 Commercial", academic_year_id: "ay-2025-2026" },
];

const SEED_SUBJECTS = [
  { id: "sub-math", code: "MTH101", name: "Mathematics" },
  { id: "sub-eng", code: "ENG101", name: "English Language" },
  { id: "sub-sci", code: "SCI101", name: "Basic Science & Technology" },
  { id: "sub-soc", code: "SOC101", name: "Social Studies & Civic Edu" },
  { id: "sub-phy", code: "PHY201", name: "Physics" },
  { id: "sub-chem", code: "CHM201", name: "Chemistry" },
  { id: "sub-econ", code: "ECN201", name: "Economics" },
  { id: "sub-ict", code: "ICT101", name: "Computer & Information Tech" },
];

const SEED_STUDENTS = [
  { id: "std-001", admission_number: "BEL/2026/001", first_name: "Chukwudi", last_name: "Eze", status: "active", class_id: "cls-jss1" },
  { id: "std-002", admission_number: "BEL/2026/002", first_name: "Fatima", last_name: "Abubakar", status: "active", class_id: "cls-jss1" },
  { id: "std-003", admission_number: "BEL/2026/003", first_name: "Kofi", last_name: "Ansah", status: "active", class_id: "cls-jss1" },
  { id: "std-004", admission_number: "BEL/2026/004", first_name: "Zainab", last_name: "Danjuma", status: "active", class_id: "cls-jss2" },
  { id: "std-005", admission_number: "BEL/2026/005", first_name: "Emeka", last_name: "Okafor", status: "active", class_id: "cls-jss2" },
  { id: "std-006", admission_number: "BEL/2026/006", first_name: "Blessing", last_name: "Adeyemi", status: "active", class_id: "cls-jss3" },
  { id: "std-007", admission_number: "BEL/2026/007", first_name: "Tariq", last_name: "Balogun", status: "active", class_id: "cls-sss1" },
  { id: "std-008", admission_number: "BEL/2026/008", first_name: "Aisha", last_name: "Mohammed", status: "active", class_id: "cls-sss1" },
  { id: "std-009", admission_number: "BEL/2026/009", first_name: "David", last_name: "Oluwaseun", status: "active", class_id: "cls-sss2" },
  { id: "std-010", admission_number: "BEL/2026/010", first_name: "Grace", last_name: "Nwosu", status: "active", class_id: "cls-sss3" },
];

const SEED_STAFF = [
  { id: "stf-01", employee_number: "EMP/001", first_name: "Kwame", last_name: "Mensah", role: "Principal" },
  { id: "stf-02", employee_number: "EMP/002", first_name: "Amina", last_name: "Bello", role: "Mathematics Teacher" },
  { id: "stf-03", employee_number: "EMP/003", first_name: "Chidi", last_name: "Okonkwo", role: "Bursar & Secretary" },
  { id: "stf-04", employee_number: "EMP/004", first_name: "Ngozi", last_name: "Adeyemi", role: "English Teacher" },
];

const SEED_FEE_COMPONENTS = [
  { id: "fc-1", name: "Term Tuition & Instruction", amount: 75000, frequency: "per_term", is_mandatory: true },
  { id: "fc-2", name: "Science Lab & ICT Levy", amount: 15000, frequency: "per_term", is_mandatory: true },
  { id: "fc-3", name: "PTA Development Levy", amount: 5000, frequency: "per_term", is_mandatory: false },
  { id: "fc-4", name: "Sports & Extra-Curricular", amount: 5000, frequency: "annual", is_mandatory: false },
];

const SEED_BILLS = [
  { id: "bill-001", student_id: "std-001", total_amount: 95000, paid_amount: 95000, balance: 0, status: "paid", due_date: "2026-02-15" },
  { id: "bill-002", student_id: "std-002", total_amount: 95000, paid_amount: 60000, balance: 35000, status: "partial", due_date: "2026-02-15" },
  { id: "bill-003", student_id: "std-003", total_amount: 95000, paid_amount: 0, balance: 95000, status: "pending", due_date: "2026-02-15" },
  { id: "bill-004", student_id: "std-004", total_amount: 95000, paid_amount: 95000, balance: 0, status: "paid", due_date: "2026-02-15" },
  { id: "bill-005", student_id: "std-005", total_amount: 95000, paid_amount: 40000, balance: 55000, status: "partial", due_date: "2026-02-15" },
];

const SEED_RECEIPTS = [
  {
    id: "rcpt-001",
    receipt_number: "RCP/2026/0101",
    student_id: "std-001",
    amount: 95000,
    payment_method: "Bank Transfer",
    created_at: "2026-01-15T10:30:00Z",
    reference: "REF-BK-9921",
    received_by: "Chidi Okonkwo",
  },
  {
    id: "rcpt-002",
    receipt_number: "RCP/2026/0102",
    student_id: "std-002",
    amount: 60000,
    payment_method: "POS / Card",
    created_at: "2026-01-22T14:15:00Z",
    reference: "REF-POS-4122",
    received_by: "Chidi Okonkwo",
  },
  {
    id: "rcpt-003",
    receipt_number: "RCP/2026/0103",
    student_id: "std-005",
    amount: 40000,
    payment_method: "Cash",
    created_at: "2026-02-01T09:00:00Z",
    reference: "REF-CSH-1108",
    received_by: "Chidi Okonkwo",
  },
];

// ------------------------------------------------------------- Create Mock API
export function createWebElectronAPI(): ElectronAPI {
  let school = loadStorage("school", SEED_SCHOOL);
  let users = loadStorage("users", SEED_USERS);
  let years = loadStorage("years", SEED_YEARS);
  let terms = loadStorage("terms", SEED_TERMS);
  let classes = loadStorage("classes", SEED_CLASSES);
  let subjects = loadStorage("subjects", SEED_SUBJECTS);
  let students = loadStorage("students", SEED_STUDENTS);
  let staff = loadStorage("staff", SEED_STAFF);
  let feeComponents = loadStorage("fee_components", SEED_FEE_COMPONENTS);
  let bills = loadStorage("bills", SEED_BILLS);
  let receipts = loadStorage("receipts", SEED_RECEIPTS);
  let attendanceSessions = loadStorage<any[]>("attendance_sessions", []);
  let attendanceRecords = loadStorage<Record<string, Array<{ student_id: string; status: string; remarks?: string }>>>("attendance_records", {});
  let gradesData = loadStorage<Record<string, any>>("grades_data", {});
  let settings = loadStorage<Array<{ key: string; value: string; description?: string; is_public: boolean }>>("settings", [
    { key: "school.name", value: "Belko Academy of Excellence", description: "Official name on report cards", is_public: true },
    { key: "currency", value: "₦", description: "Display currency", is_public: true },
    { key: "backup.folder", value: "C:\\BelkoBackups", description: "Folder path for backups", is_public: false },
    { key: "primary_color", value: "#1e3a8a", description: "Primary branding color", is_public: true },
    { key: "reduce_motion", value: "false", description: "System wide reduced motion", is_public: true },
  ]);

  return {
    app: {
      getVersion: async () => "1.0.1 (Web Preview)",
      getPath: async () => "/belko-storage",
    },

    auth: {
      login: async ({ email, password }) => {
        const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (found) {
          const token = "mock-jwt-token-" + found.id;
          return ok({
            user: found,
            accessToken: token,
            refreshToken: "mock-refresh-token",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          });
        }
        if (email.includes("principal")) {
          return ok({
            user: users[0],
            accessToken: "mock-jwt-principal",
            refreshToken: "mock-refresh",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          });
        }
        if (email.includes("teacher")) {
          return ok({
            user: users[1],
            accessToken: "mock-jwt-teacher",
            refreshToken: "mock-refresh",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          });
        }
        if (email.includes("secretary")) {
          return ok({
            user: users[2],
            accessToken: "mock-jwt-secretary",
            refreshToken: "mock-refresh",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          });
        }
        if (email && password) {
          const user = {
            id: "usr-" + Date.now(),
            email,
            full_name: email.split("@")[0].replace(".", " "),
            role: "principal",
            is_active: true,
          };
          users.push(user);
          saveStorage("users", users);
          return ok({
            user,
            accessToken: "mock-jwt-new",
            refreshToken: "mock-refresh",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          });
        }
        return err("Invalid credentials. Try principal@belko.org or use Quick Login.");
      },
      refresh: async () => ok({ accessToken: "mock-refreshed-jwt", expiresAt: new Date(Date.now() + 86400000).toISOString() }),
      logout: async () => ok(true),
      verify: async () => ok({ valid: true }),
      changePassword: async () => ok(true),
      resetPassword: async () => ok(true),
    },

    setup: {
      getStatus: async () => ok({ completed: true, hasSchool: true, hasUsers: true, hasCurrentTerm: true }),
      complete: async () => ok({
        schoolId: school.id,
        academicYearId: years[0]?.id || "ay-1",
        termIds: terms.map((t) => t.id),
        userId: users[0]?.id || "usr-1",
        staffId: staff[0]?.id || "stf-1",
      }),
    },

    dashboard: {
      overview: async () => {
        const totalBilled = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const totalCollected = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
        const totalDue = bills.reduce((sum, b) => sum + (b.balance || 0), 0);
        const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 74;

        return ok({
          school,
          currentYear: years.find((y) => y.is_current) || years[0],
          currentTerm: terms.find((t) => t.is_current) || terms[1],
          stats: {
            students: students.filter((s) => s.status === "active").length,
            staff: staff.length,
            billsDue: totalDue,
            collected: totalCollected,
            collectionRate,
            attendanceTodayRate: 92,
          },
          recentActivity: [
            { id: "act-1", action: "Payment recorded: ₦60,000 for Fatima Abubakar", entity_type: "fee", created_at: "Just now" },
            { id: "act-2", action: "Attendance marked for JSS 1 Green", entity_type: "attendance", created_at: "2 hours ago" },
            { id: "act-3", action: "Mid-Term Grades published for Mathematics", entity_type: "grade", created_at: "Yesterday" },
          ],
          lastBackup: "Today at 02:00 AM (Automated)",
        });
      },
    },

    schools: {
      getPublic: async () => ok({
        school,
        setupStatus: { completed: true, hasSchool: true, hasUsers: true, hasCurrentTerm: true },
      }),
      get: async () => ok(school),
      update: async (_token: string, updates: Record<string, unknown>) => {
        school = { ...school, ...updates };
        saveStorage("school", school);
        return ok(school);
      },
    },

    academic: {
      yearsList: async () => ok(years),
      termsList: async (_token: string, academicYearId?: string) => {
        const list = terms.filter((t) => !academicYearId || t.academic_year_id === academicYearId);
        return ok(list);
      },
      createYear: async (_token: string, data: Record<string, unknown>) => {
        const newYear = {
          id: "ay-" + Date.now(),
          name: (data.name as string) || "New Academic Year",
          start_date: (data.start_date as string) || "2026-09-01",
          end_date: (data.end_date as string) || "2027-07-31",
          is_current: false,
        };
        years.push(newYear);
        saveStorage("years", years);
        return ok(newYear);
      },
      setCurrentYear: async (_token: string, id: string) => {
        years = years.map((y) => ({ ...y, is_current: y.id === id }));
        saveStorage("years", years);
        return ok(true);
      },
      createTerm: async (_token: string, data: Record<string, unknown>) => {
        const newTerm = {
          id: "term-" + Date.now(),
          academic_year_id: (data.academic_year_id as string) || years[0]?.id,
          name: (data.name as string) || "New Term",
          ordinal: Number(data.ordinal) || 1,
          start_date: (data.start_date as string) || "2026-01-01",
          end_date: (data.end_date as string) || "2026-04-01",
          is_current: false,
        };
        terms.push(newTerm);
        saveStorage("terms", terms);
        return ok(newTerm);
      },
      setCurrentTerm: async (_token: string, id: string) => {
        terms = terms.map((t) => ({ ...t, is_current: t.id === id }));
        saveStorage("terms", terms);
        return ok(true);
      },
      closeTerm: async () => ok(true),
      reopenTerm: async () => ok(true),
    },

    students: {
      list: async (_token: string, params: Record<string, unknown> = {}) => {
        let result = [...students];
        if (params.classId) {
          result = result.filter((s) => s.class_id === params.classId);
        }
        if (params.search) {
          const q = (params.search as string).toLowerCase();
          result = result.filter((s) =>
            s.first_name.toLowerCase().includes(q) ||
            s.last_name.toLowerCase().includes(q) ||
            s.admission_number.toLowerCase().includes(q)
          );
        }
        return ok(result);
      },
      get: async (_token: string, id: string) => {
        const found = students.find((s) => s.id === id);
        return found ? ok(found) : err("Student not found");
      },
      create: async (_token: string, data: Record<string, unknown>) => {
        const newStudent = {
          id: "std-" + Date.now(),
          admission_number: (data.admission_number as string) || `BEL/${new Date().getFullYear()}/${String(students.length + 1).padStart(3, "0")}`,
          first_name: (data.first_name as string) || "New",
          last_name: (data.last_name as string) || "Student",
          status: (data.status as string) || "active",
          class_id: (data.class_id as string) || classes[0]?.id,
        };
        students.push(newStudent);
        saveStorage("students", students);
        return ok(newStudent);
      },
      update: async (_token: string, data: Record<string, unknown>) => {
        students = students.map((s) => (s.id === data.id ? { ...s, ...data } : s));
        saveStorage("students", students);
        return ok(data);
      },
      changeStatus: async (_token: string, id: string, status: string) => {
        students = students.map((s) => (s.id === id ? { ...s, status } : s));
        saveStorage("students", students);
        return ok(true);
      },
      delete: async (_token: string, id: string) => {
        students = students.filter((s) => s.id !== id);
        saveStorage("students", students);
        return ok(true);
      },
    },

    classes: {
      list: async () => ok(classes),
      create: async (_token: string, data: Record<string, unknown>) => {
        const newClass = { id: "cls-" + Date.now(), name: data.name as string, academic_year_id: years[0]?.id };
        classes.push(newClass);
        saveStorage("classes", classes);
        return ok(newClass);
      },
      update: async (_token: string, data: Record<string, unknown>) => {
        classes = classes.map((c) => (c.id === data.id ? { ...c, ...data } : c));
        saveStorage("classes", classes);
        return ok(data);
      },
      delete: async (_token: string, id: string) => {
        classes = classes.filter((c) => c.id !== id);
        saveStorage("classes", classes);
        return ok(true);
      },
    },

    subjects: {
      list: async () => ok(subjects),
      create: async (_token: string, data: Record<string, unknown>) => {
        const newSubject = { id: "sub-" + Date.now(), code: data.code as string, name: data.name as string };
        subjects.push(newSubject);
        saveStorage("subjects", subjects);
        return ok(newSubject);
      },
      update: async (_token: string, data: Record<string, unknown>) => {
        subjects = subjects.map((s) => (s.id === data.id ? { ...s, ...data } : s));
        saveStorage("subjects", subjects);
        return ok(data);
      },
      delete: async (_token: string, id: string) => {
        subjects = subjects.filter((s) => s.id !== id);
        saveStorage("subjects", subjects);
        return ok(true);
      },
    },

    staff: {
      list: async () => ok(staff),
      create: async (_token: string, data: Record<string, unknown>) => {
        const newStaff = {
          id: "stf-" + Date.now(),
          employee_number: (data.employee_number as string) || `EMP/${String(staff.length + 1).padStart(3, "0")}`,
          first_name: data.first_name as string,
          last_name: data.last_name as string,
          role: (data.role as string) || "Teacher",
        };
        staff.push(newStaff);
        saveStorage("staff", staff);
        return ok(newStaff);
      },
      update: async (_token: string, data: Record<string, unknown>) => {
        staff = staff.map((st) => (st.id === data.id ? { ...st, ...data } : st));
        saveStorage("staff", staff);
        return ok(data);
      },
    },

    users: {
      list: async () => ok(users),
      create: async (_token: string, data: Record<string, unknown>) => {
        const newUser = {
          id: "usr-" + Date.now(),
          email: data.email as string,
          full_name: data.full_name as string,
          role: (data.role as string) || "teacher",
          is_active: true,
        };
        users.push(newUser);
        saveStorage("users", users);
        return ok({ user: newUser, staffId: "stf-" + Date.now() });
      },
      setActive: async (_token: string, id: string, isActive: boolean) => {
        users = users.map((u) => (u.id === id ? { ...u, is_active: isActive } : u));
        saveStorage("users", users);
        return ok(true);
      },
      resetPassword: async () => ok(true),
    },

    attendance: {
      openSession: async (_token: string, data: Record<string, unknown>) => {
        const newSession = {
          id: "att-sess-" + Date.now(),
          class_id: data.class_id,
          session_date: data.session_date,
          start_time: data.start_time || "08:00",
          status: "open",
        };
        attendanceSessions.push(newSession);
        saveStorage("attendance_sessions", attendanceSessions);
        return ok(newSession);
      },
      getSession: async (_token: string, sessionId: string) => {
        const session = attendanceSessions.find((s) => s.id === sessionId);
        const records = attendanceRecords[sessionId] || [];
        return ok({ session: session || { id: sessionId, status: "open" }, records });
      },
      sessionsByClassDate: async (_token: string, classId: string, date: string) => {
        const matching = attendanceSessions.filter((s) => s.class_id === classId && s.session_date === date);
        return ok(matching);
      },
      mark: async (_token: string, sessionId: string, marks: Array<{ student_id: string; status: string; remarks?: string }>) => {
        const existing = attendanceRecords[sessionId] || [];
        const map = new Map(existing.map((r) => [r.student_id, r]));
        for (const m of marks) {
          map.set(m.student_id, m);
        }
        attendanceRecords[sessionId] = Array.from(map.values());
        saveStorage("attendance_records", attendanceRecords);
        return ok(attendanceRecords[sessionId]);
      },
      markAllPresent: async (_token: string, sessionId: string, studentIds: string[]) => {
        const existing = attendanceRecords[sessionId] || [];
        const map = new Map(existing.map((r) => [r.student_id, r]));
        for (const id of studentIds) {
          map.set(id, { student_id: id, status: "present" });
        }
        attendanceRecords[sessionId] = Array.from(map.values());
        saveStorage("attendance_records", attendanceRecords);
        return ok(attendanceRecords[sessionId]);
      },
      closeSession: async (_token: string, sessionId: string) => {
        attendanceSessions = attendanceSessions.map((s) => (s.id === sessionId ? { ...s, status: "closed" } : s));
        saveStorage("attendance_sessions", attendanceSessions);
        return ok(true);
      },
      submitSession: async (_token: string, sessionId: string) => {
        attendanceSessions = attendanceSessions.map((s) => (s.id === sessionId ? { ...s, status: "submitted" } : s));
        saveStorage("attendance_sessions", attendanceSessions);
        return ok(true);
      },
      stats: async () => ok({ total: 20, present: 18, absent: 1, late: 1, excused: 0, percentage: 90 }),
    },

    grades: {
      componentsList: async () => ok([
        { id: "gc-1", name: "Continuous Assessment (CA 1)", weight: 15, max_score: 15 },
        { id: "gc-2", name: "Mid-Term Project / Assignment", weight: 15, max_score: 15 },
        { id: "gc-3", name: "Final Examination", weight: 70, max_score: 70 },
      ]),
      sheetGetOrCreate: async (_token: string, data: Record<string, unknown>) => {
        const sheetId = `gs-${data.class_id}-${data.subject_id}-${data.term_id}`;
        let sheet = gradesData[sheetId]?.sheet || {
          id: sheetId,
          class_id: data.class_id,
          subject_id: data.subject_id,
          term_id: data.term_id,
          status: "draft",
        };
        const classStudents = students
          .filter((s) => !data.class_id || s.class_id === data.class_id)
          .map((s) => ({
            id: s.id,
            full_name: `${s.first_name} ${s.last_name}`,
            admission_number: s.admission_number,
          }));
        return ok({ sheet, students: classStudents });
      },
      entriesGet: async (_token: string, gradeSheetId: string) => {
        return ok(gradesData[gradeSheetId]?.entries || []);
      },
      entriesBulkUpsert: async (_token: string, gradeSheetId: string, entries: Record<string, unknown>[]) => {
        if (!gradesData[gradeSheetId]) {
          gradesData[gradeSheetId] = { sheet: { id: gradeSheetId, status: "draft" }, entries: [] };
        }
        const existingEntries: any[] = gradesData[gradeSheetId].entries || [];
        const entryMap = new Map(existingEntries.map((e) => [`${e.student_id}-${e.component_id}`, e]));
        for (const e of entries) {
          entryMap.set(`${e.student_id}-${e.component_id}`, e);
        }
        gradesData[gradeSheetId].entries = Array.from(entryMap.values());
        saveStorage("grades_data", gradesData);
        return ok(gradesData[gradeSheetId].entries);
      },
      totals: async (_token: string, gradeSheetId: string) => {
        const entries = gradesData[gradeSheetId]?.entries || [];
        const byStudent = new Map<string, number>();
        for (const e of entries) {
          const prev = byStudent.get(e.student_id) || 0;
          byStudent.set(e.student_id, prev + (Number(e.score) || 0));
        }
        const totals = Array.from(byStudent.entries()).map(([studentId, total]) => ({
          studentId,
          caTotal: Math.round(total * 0.3),
          examScore: Math.round(total * 0.7),
          total,
        }));
        return ok(totals);
      },
      sheetSubmit: async (_token: string, sheetId: string) => {
        if (gradesData[sheetId]) gradesData[sheetId].sheet.status = "submitted";
        saveStorage("grades_data", gradesData);
        return ok(true);
      },
      sheetReview: async (_token: string, sheetId: string) => {
        if (gradesData[sheetId]) gradesData[sheetId].sheet.status = "reviewed";
        saveStorage("grades_data", gradesData);
        return ok(true);
      },
      sheetApprove: async (_token: string, sheetId: string) => {
        if (gradesData[sheetId]) gradesData[sheetId].sheet.status = "approved";
        saveStorage("grades_data", gradesData);
        return ok(true);
      },
      sheetPublish: async (_token: string, sheetId: string) => {
        if (gradesData[sheetId]) gradesData[sheetId].sheet.status = "published";
        saveStorage("grades_data", gradesData);
        return ok(true);
      },
      sheetUnlock: async () => ok(true),
      sheetsByTeacher: async () => ok([]),
      reportCard: async () => ok({}),
    },

    fees: {
      componentsList: async () => ok(feeComponents),
      componentCreate: async (_token: string, data: Record<string, unknown>) => {
        const comp = {
          id: "fc-" + Date.now(),
          name: (data.name as string) || "New Component",
          amount: Number(data.amount) || 0,
          frequency: (data.frequency as string) || "per_term",
          is_mandatory: Boolean(data.is_mandatory),
        };
        feeComponents.push(comp);
        saveStorage("fee_components", feeComponents);
        return ok(comp);
      },
      structureGetOrDefault: async () => ok({ structure: {}, components: feeComponents }),
      structureAddComponent: async () => ok(feeComponents),
      billsGenerate: async () => ok(bills),
      billsList: async (_token: string, params: Record<string, unknown> = {}) => {
        let result = [...bills];
        if (params.studentId) result = result.filter((b) => b.student_id === params.studentId);
        return ok(result);
      },
      paymentsList: async (_token: string, billId: string) => {
        const foundBill = bills.find((b) => b.id === billId);
        if (!foundBill) return ok([]);
        const filtered = receipts.filter((r) => r.student_id === foundBill.student_id);
        return ok(filtered);
      },
      paymentRecord: async (_token: string, data: Record<string, unknown>) => {
        const amount = Number(data.amount) || 0;
        const studentId = String(data.student_id || "");
        const newReceipt = {
          id: "rcpt-" + Date.now(),
          receipt_number: `RCP/${new Date().getFullYear()}/${String(receipts.length + 101).padStart(4, "0")}`,
          student_id: studentId,
          amount,
          payment_method: String(data.payment_method || "Bank Transfer"),
          created_at: new Date().toISOString(),
          reference: String(data.reference || `REF-${Math.floor(1000 + Math.random() * 9000)}`),
          received_by: "Chidi Okonkwo (Bursar)",
        };
        receipts.unshift(newReceipt);
        saveStorage("receipts", receipts);

        let updatedBill = null;
        bills = bills.map((b) => {
          if (b.student_id === data.student_id) {
            const newPaid = (b.paid_amount || 0) + amount;
            const newBalance = Math.max(0, (b.total_amount || 0) - newPaid);
            const status = newBalance <= 0 ? "paid" : "partial";
            updatedBill = { ...b, paid_amount: newPaid, balance: newBalance, status };
            return updatedBill;
          }
          return b;
        });
        saveStorage("bills", bills);

        return ok({ payment: newReceipt, bill: updatedBill || bills[0] });
      },
      paymentVoid: async () => ok(true),
      debtors: async () => ok([]),
      collectionReport: async () => {
        const totalBilled = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const totalCollected = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
        const totalOutstanding = bills.reduce((sum, b) => sum + (b.balance || 0), 0);
        return ok({
          total_billed: totalBilled,
          total_collected: totalCollected,
          total_outstanding: totalOutstanding,
          by_class: classes.map((c, i) => ({
            class_id: c.id,
            class_name: c.name,
            billed: 190000 + i * 20000,
            collected: 140000 + i * 15000,
            outstanding: 50000 + i * 5000,
          })),
        });
      },
    },

    settings: {
      getAll: async () => ok(settings),
      set: async (_token: string, key: string, value: string, description?: string, isPublic = true) => {
        const existing = settings.find((s) => s.key === key);
        if (existing) {
          existing.value = String(value);
          if (description) existing.description = description;
        } else {
          settings.push({ key, value: String(value), description, is_public: isPublic });
        }
        saveStorage("settings", settings);
        return ok(true);
      },
    },

    backup: {
      create: async () => ok({ backupPath: "C:\\BelkoBackups\\belko-manual-backup.db", timestamp: new Date().toISOString() }),
      scheduleGet: async () => ok([
        {
          id: "sched-1",
          frequency: "daily",
          time: "02:00",
          retention_daily: 30,
          retention_monthly: 12,
          is_enabled: true,
        },
      ]),
      scheduleSet: async () => ok(true),
    },

    db: {
      restore: async () => ok(true),
      verifyBackup: async () => ok({ valid: true, checksum: "sha256-verified" }),
      backupHistory: async () => ok([
        { id: "bk-1", filename: "belko-auto-2026-02-01.db", size_bytes: 4829104, created_at: "2026-02-01T02:00:00Z" },
        { id: "bk-2", filename: "belko-auto-2026-01-31.db", size_bytes: 4791024, created_at: "2026-01-31T02:00:00Z" },
      ]),
      exportBackup: async () => ok(true),
      importBackup: async () => ok(true),
    },

    network: {
      status: async () => ok({ status: "connected", url: "http://192.168.1.100:8443", port: 8443, deviceCount: 3 }),
      devices: async () => ok([
        { id: "dev-1", name: "Staff Room Tablet (Admin)", ip: "192.168.1.102", connectedAt: "10 mins ago" },
        { id: "dev-2", name: "Principal Office Laptop", ip: "192.168.1.105", connectedAt: "1 hour ago" },
        { id: "dev-3", name: "Library Desktop Terminal", ip: "192.168.1.110", connectedAt: "25 mins ago" },
      ]),
      start: async () => ok(true),
      stop: async () => ok(true),
    },

    exportData: {
      data: async () => ok({ exported: true }),
      template: async () => ok(""),
      fullBackup: async () => ok(true),
    },

    importData: {
      data: async () => ok({ imported: 10 }),
      fullBackup: async () => ok(true),
    },

    dialog: {
      showSave: async () => ({ filePath: "C:\\BelkoBackups\\export.xlsx" }),
      showOpen: async () => ({ filePaths: [] }),
      showMessage: async () => ({ response: 0 }),
    },

    shell: {
      openExternal: async () => {},
      openPath: async () => {},
    },

    audit: {
      trail: async () => ok([]),
      userActivity: async () => ok([]),
      export: async () => ok(true),
    },
  };
}

/**
 * Initializes the global window.electronAPI with fallback if running in browser / Vite preview
 */
export function ensureElectronAPI(): ElectronAPI {
  if (typeof window !== "undefined") {
    if (!window.electronAPI) {
      console.info("⚡ Belko Web Bridge: initializing web mock API for browser / preview environment.");
      window.electronAPI = createWebElectronAPI();
    }
    return window.electronAPI;
  }
  return createWebElectronAPI();
}

// Auto-run on import to safeguard all modules
if (typeof window !== "undefined" && !window.electronAPI) {
  window.electronAPI = createWebElectronAPI();
}
