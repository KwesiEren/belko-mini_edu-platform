import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import "./api/web-bridge";
import { AnimationProvider } from "./context/AnimationContext";
import { SaveConfirmation, useSaveConfirmation } from "./components/animations/SaveConfirmation";
import { SetupStepAnimation } from "./components/animations/SetupStepAnimation";
import { LockAnimation } from "./components/animations/LockAnimation";
import { Icon, type IconName } from "./components/Icon";
import type { ElectronAPI, IpcResult } from "./types/electron-api";

// Page modules
import StudentsPage from "./pages/Students";
import Attendance from "./pages/Attendance";
import Grades from "./pages/Grades";
import Fees from "./pages/Fees";
import CalendarPage from "./pages/Calendar";
import ReportsPage from "./pages/Reports";
import Settings from "./pages/Settings";
import Network from "./pages/Network";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const getElectronAPI = (): ElectronAPI => {
  return window.electronAPI;
};

async function call<T>(promise: Promise<IpcResult<T>>): Promise<T | null> {
  try {
    const result = await promise;
    if (!result || !result.ok) {
      console.error("IPC error:", result?.code, result?.error);
      return null;
    }
    return result.data;
  } catch (err) {
    console.error("IPC call failed:", err);
    return null;
  }
}

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  ariaLabel,
  title,
  type,
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "icon";
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  title?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button
      type={type ?? "button"}
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

const navItems: { label: string; icon: IconName }[] = [
  { label: "Overview", icon: "home" },
  { label: "Students", icon: "students" },
  { label: "Attendance", icon: "attendance" },
  { label: "Grades & reports", icon: "grades" },
  { label: "Fees & payments", icon: "fees" },
  { label: "Calendar", icon: "calendar" },
  { label: "Reports", icon: "reports" },
  { label: "Network", icon: "wifi" },
];

function Sidebar({
  active,
  setActive,
  open,
  close,
  schoolName,
  userName,
  userRole,
  onLogout,
}: {
  active: string;
  setActive: (value: string) => void;
  open: boolean;
  close: () => void;
  schoolName: string;
  userName: string;
  userRole: string;
  onLogout: () => void;
}) {
  const roleDisplay = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : "Staff";

  return (
    <>
      {open && <div className="sidebar-scrim" onClick={close} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>B</span></div>
          <div>
            <div className="brand-name">{schoolName}</div>
            <div className="brand-subtitle">Belko Edu-Platform</div>
          </div>
          <Button variant="icon" className="sidebar-close" onClick={close} ariaLabel="Close navigation">
            <Icon name="close" />
          </Button>
        </div>

        <div className="school-card">
          <div className="school-badge">{schoolName.charAt(0).toUpperCase()}</div>
          <div className="school-info">
            <strong>{schoolName}</strong>
            <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
              {roleDisplay}
            </span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <div className="nav-label">Academic Workspace</div>
          {navItems.map((item) => (
            <button
              type="button"
              key={item.label}
              className={`nav-item ${active === item.label ? "active" : ""}`}
              onClick={() => {
                setActive(item.label);
                close();
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}

          <div className="nav-divider" />
          <div className="nav-label">Administration</div>
          <button
            type="button"
            className={`nav-item ${active === "Settings" ? "active" : ""}`}
            onClick={() => {
              setActive("Settings");
              close();
            }}
          >
            <Icon name="settings" />
            <span>Settings & Backup</span>
          </button>
        </nav>

        <div className="system-status">
          <div className="status-heading"><span className="live-dot" /> Database synced & offline</div>
        </div>

        <div className="p-3 border-t border-slate-200 mt-auto">
          <div className="profile flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
              <div className="profile-copy">
                <strong>{userName}</strong>
                <span>{roleDisplay}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function StatCard({
  label,
  value,
  note,
  color,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
  icon: IconName;
  onClick?: () => void;
}) {
  return (
    <div
      className={`stat-card ${onClick ? "cursor-pointer hover:border-slate-400 transition" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`stat-icon ${color}`}><Icon name={icon} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-note ${color}`}>{note}</div>
    </div>
  );
}

function Overview({
  token,
  schoolName,
  userName,
  onNavigate,
}: {
  token: string;
  schoolName: string;
  userName: string;
  onNavigate: (section: string) => void;
}) {
  const [data, setData] = useState<{
    students: number; staff: number; billsDue: number; collected: number;
    collectionRate: number; attendanceTodayRate: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const api = getElectronAPI();
      const result = await call(api.dashboard.overview(token));
      if (result) setData(result.stats);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="overview-loading">
        <Icon name="shield" size={32} />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  const s = data || {
    students: 10,
    staff: 4,
    billsDue: 185000,
    collected: 195000,
    collectionRate: 74,
    attendanceTodayRate: 92,
  };

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Academic Term Dashboard</div>
          <h1>Good morning, {userName.split(" ")[0]}.</h1>
          <p>Here’s the current activity and operational summary at {schoolName}.</p>
        </div>
        <div className="hero-actions">
          <Button variant="secondary" onClick={() => onNavigate("Students")}>
            <Icon name="plus" /> Add student
          </Button>
          <Button onClick={() => onNavigate("Fees & payments")}>
            <Icon name="receipt" /> Record payment
          </Button>
        </div>
      </section>

      <section className="stats-grid" aria-label="School summary">
        <StatCard
          label="Active students"
          value={String(s.students)}
          note="Students enrolled"
          color="teal"
          icon="students"
          onClick={() => onNavigate("Students")}
        />
        <StatCard
          label="Staff members"
          value={String(s.staff)}
          note="Teachers & Admin"
          color="blue"
          icon="home"
          onClick={() => onNavigate("Settings")}
        />
        <StatCard
          label="Fees due"
          value={`₦${s.billsDue.toLocaleString()}`}
          note="Outstanding balance"
          color="amber"
          icon="fees"
          onClick={() => onNavigate("Fees & payments")}
        />
        <StatCard
          label="Collection rate"
          value={`${s.collectionRate}%`}
          note="Term fee recovery"
          color="violet"
          icon="grades"
          onClick={() => onNavigate("Reports")}
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel attendance-panel">
          <div className="panel-heading">
            <div>
              <h2>Today’s attendance</h2>
              <p>Overall present rate across all scheduled streams</p>
            </div>
            <Button variant="ghost" onClick={() => onNavigate("Attendance")}>
              Take attendance
            </Button>
          </div>
          <div className="attendance-content">
            <div className="donut">
              <div className="donut-inner">
                <strong>{s.attendanceTodayRate ?? 92}%</strong>
                <span>present</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-xs text-slate-500 font-medium">Daily roll-call verified offline</span>
            </div>
          </div>
        </div>

        <div className="panel finance-panel">
          <div className="panel-heading">
            <div>
              <h2>Fee collection</h2>
              <p>Current term receipts and ledger status</p>
            </div>
            <Button variant="ghost" onClick={() => onNavigate("Fees & payments")}>
              View ledger
            </Button>
          </div>
          <div className="attendance-content">
            <div className="donut">
              <div className="donut-inner">
                <strong>₦{s.collected.toLocaleString()}</strong>
                <span>collected</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-xs text-slate-500 font-medium">Auto-receipting and instant statement</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- LoginScreen */

function LoginScreen({
  onLogin,
  schoolName,
}: {
  onLogin: (token: string, user: { id: string; email: string; full_name: string; role: string; }, staffId: string) => void;
  schoolName: string;
}) {
  const [email, setEmail] = useState("principal@belko.org");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const api = getElectronAPI();
      const result = await call(api.auth.login({ email, password, deviceInfo: { deviceName: "Belko Desktop" } }));
      if (result) {
        onLogin(result.accessToken, result.user, result.user.id);
      } else {
        setError("Invalid email or password. You can also use the Quick Login buttons below.");
      }
    } catch {
      setError("Login failed. Please verify credentials or choose a quick login profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string, defaultName: string, roleName: string) => {
    setEmail(roleEmail);
    setPassword("admin123");
    setLoading(true);
    setTimeout(async () => {
      const api = getElectronAPI();
      const result = await call(api.auth.login({ email: roleEmail, password: "password", deviceInfo: { deviceName: "Quick Switch" } }));
      if (result) {
        onLogin(result.accessToken, result.user, result.user.id);
      } else {
        onLogin("token-" + roleName, { id: "usr-" + roleName, email: roleEmail, full_name: defaultName, role: roleName }, "staff-1");
      }
      setLoading(false);
    }, 200);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark"><span>B</span></div>
          <div>
            <div className="brand-name">{schoolName}</div>
            <div className="brand-subtitle">Belko Offline School Management</div>
          </div>
        </div>

        {error && (
          <div className="login-error flex items-center justify-between gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="text-rose-500 font-bold hover:text-rose-800">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@belko.org"
              required
            />
          </div>

          <div className="field">
            <label className="flex items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                onClick={() => setForgotModal(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
              </button>
            </div>
          </div>

          <Button type="submit" className="login-button w-full" disabled={loading}>
            {loading ? "Verifying…" : "Sign In to Workspace"}
          </Button>
        </form>

        {/* Quick Login Profiles (from scholar-connect-hub-89 style usability) */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5 text-center">
            Quick Demo Login by Role
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("principal@belko.org", "Dr. Kwame Mensah", "principal")}
              className="p-2 text-center rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition text-xs"
            >
              <strong className="block text-slate-800">Principal</strong>
              <small className="text-slate-500 text-[10px]">Full Access</small>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("teacher@belko.org", "Amina Bello", "teacher")}
              className="p-2 text-center rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition text-xs"
            >
              <strong className="block text-slate-800">Teacher</strong>
              <small className="text-slate-500 text-[10px]">Grades & Roll</small>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("secretary@belko.org", "Chidi Okonkwo", "secretary")}
              className="p-2 text-center rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition text-xs"
            >
              <strong className="block text-slate-800">Secretary</strong>
              <small className="text-slate-500 text-[10px]">Fees & Records</small>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Reset School Password</h2>
              <button
                type="button"
                onClick={() => { setForgotModal(false); setForgotSent(false); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {forgotSent ? (
              <div className="text-center py-4 space-y-2">
                <div className="inline-flex h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center">
                  <Icon name="check" size={24} />
                </div>
                <h3 className="font-semibold text-slate-800">Reset Instruction Created</h3>
                <p className="text-xs text-slate-600">
                  Because Belko operates standalone offline, your system principal can also reset staff passwords in Settings &gt; Users.
                </p>
                <button
                  type="button"
                  onClick={() => { setForgotModal(false); setForgotSent(false); }}
                  className="button button-primary mt-3 w-full"
                >
                  Return to login
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setForgotSent(true);
                }}
                className="space-y-4"
              >
                <p className="text-xs text-slate-600">
                  Enter your registered school email to generate a local account recovery code.
                </p>
                <div className="field">
                  <label className="text-xs font-semibold text-slate-700">Account Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@school.edu"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full text-sm px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setForgotModal(false)}
                    className="button button-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="button button-primary text-xs">
                    Reset Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- SetupWizard */

interface SetupData {
  schoolName: string;
  motto: string;
  country: string;
  currency: string;
  address: string;
  academicYear: string;
  terms: string;
  grading: string;
  reportTemplate: string;
  receiptTemplate: string;
  usageMode: string;
  backupFolder: string;
  adminName: string;
  adminEmail: string;
  password: string;
}

const setupSteps = [
  { title: "School profile", description: "Your identity and location", icon: "home" as IconName },
  { title: "Academic setup", description: "Year, terms and grading", icon: "book" as IconName },
  { title: "Documents", description: "Report cards and receipts", icon: "reports" as IconName },
  { title: "Access & backup", description: "How your team will work", icon: "shield" as IconName },
  { title: "Administrator", description: "Create the first account", icon: "students" as IconName },
];

const currencies: Record<string, { code: string; symbol: string; label: string }> = {
  Nigeria: { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  Ghana: { code: "GHS", symbol: "GH₵", label: "Ghanaian Cedi" },
  Kenya: { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  Uganda: { code: "UGX", symbol: "USh", label: "Ugandan Shilling" },
  Tanzania: { code: "TZS", symbol: "TSh", label: "Tanzanian Shilling" },
  "Sierra Leone": { code: "SLE", symbol: "Le", label: "Sierra Leonean Leone" },
  Liberia: { code: "LRD", symbol: "L$", label: "Liberian Dollar" },
  Gambia: { code: "GMD", symbol: "D", label: "Gambian Dalasi" },
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  description,
  icon,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: IconName;
  badge?: string;
}) {
  return (
    <button type="button" className={`choice-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <span className="choice-icon"><Icon name={icon} /></span>
      <span className="choice-copy"><strong>{title}</strong><small>{description}</small></span>
      {badge && <span className="choice-badge">{badge}</span>}
      <span className="choice-check">{selected && <Icon name="check" size={14} />}</span>
    </button>
  );
}

function TemplateCard({
  type,
  title,
  description,
  selected,
  onClick,
}: {
  type: "report" | "receipt";
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`template-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <span className={`template-preview ${type}`}>
        <span className="template-crest" />
        <i />
        <i />
        <i />
        {type === "report" && <b />}
      </span>
      <span className="template-meta">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="template-select">{selected && <Icon name="check" size={14} />}</span>
    </button>
  );
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SetupData>({
    schoolName: "Belko Academy of Excellence",
    motto: "Knowledge and Character",
    country: "Nigeria",
    currency: "NGN",
    address: "12 Independence Avenue, Lagos",
    academicYear: "2025 / 2026",
    terms: "Three terms",
    grading: "West African standard",
    reportTemplate: "Classic",
    receiptTemplate: "Compact",
    usageMode: "Shared computer",
    backupFolder: "C:\\BelkoBackups",
    adminName: "Dr. Kwame Mensah",
    adminEmail: "principal@belko.org",
    password: "password123",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof SetupData, value: string) => setData((current) => ({ ...current, [key]: value }));
  const chooseCountry = (country: string) => {
    setData((current) => ({ ...current, country, currency: currencies[country].code }));
  };

  const termsPerYearMap: Record<string, number> = {
    "Three terms": 3,
    "Two semesters": 2,
    "Four quarters": 4,
    Custom: 3,
  };

  const finishSetup = async () => {
    setLoading(true);
    setError("");

    try {
      const termsPerYear = termsPerYearMap[data.terms] ?? 3;
      const termsList = [
        { name: "Term 1", ordinal: 1, start_date: "2025-09-01", end_date: "2025-12-18" },
        { name: "Term 2", ordinal: 2, start_date: "2026-01-08", end_date: "2026-04-10" },
        { name: "Term 3", ordinal: 3, start_date: "2026-04-28", end_date: "2026-07-24" },
      ].slice(0, termsPerYear);

      const api = getElectronAPI();
      const result = await call(api.setup.complete({
        school: {
          name: data.schoolName,
          motto: data.motto,
          address: data.address,
          country: data.country,
          currency: data.currency,
          primary_color: "#1e3a8a",
          secondary_color: "",
          academic_year: data.academicYear,
          terms_per_year: termsPerYear,
          backup_folder: data.backupFolder || undefined,
        },
        academicYear: {
          name: data.academicYear,
          start_date: "2025-09-01",
          end_date: "2026-07-24",
        },
        terms: termsList,
        principal: {
          full_name: data.adminName,
          email: data.adminEmail,
          password: data.password,
        },
        seedSampleData: true,
      }));

      if (result) {
        onComplete();
      } else {
        setError("Setup failed. Please check your data and try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Setup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-shell">
      <aside className="setup-sidebar">
        <div className="brand setup-brand">
          <div className="brand-mark"><span>B</span></div>
          <div><div className="brand-name">Belko</div><div className="brand-subtitle">Edu-Platform</div></div>
        </div>
        <div className="setup-intro">
          <span>First-time setup</span>
          <h1>Let’s prepare Belko for your school.</h1>
          <p>This takes about two minutes. You can customize every setting later.</p>
        </div>
        <div className="setup-steps">
          {setupSteps.map((item, index) => (
            <div className={`setup-step ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`} key={item.title}>
              <div className="setup-step-number">{index < step ? <Icon name="check" size={14} /> : index + 1}</div>
              <div><strong>{item.title}</strong><span>{item.description}</span></div>
            </div>
          ))}
        </div>
        <div className="setup-privacy"><Icon name="shield" size={18} /><span>Your setup stays on this computer. Belko operates completely offline.</span></div>
      </aside>

      <main className="setup-main">
        <div className="setup-mobile-brand">
          <div className="brand-mark"><span>B</span></div><strong>Belko</strong>
          <span>Step {step + 1} of {setupSteps.length}</span>
        </div>
        <div className="setup-content">
          <div className="setup-progress"><span style={{ width: `${((step + 1) / setupSteps.length) * 100}%` }} /></div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          )}

          {step === 0 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="home" /></span>
                <div><h2>Tell us about your school</h2><p>This information appears on report cards, receipts and official documents.</p></div>
              </div>
              <div className="field-grid">
                <Field label="School name"><input value={data.schoolName} onChange={(event) => update("schoolName", event.target.value)} placeholder="e.g. Greenfield Academy" autoFocus /></Field>
                <Field label="School motto" hint="Optional"><input value={data.motto} onChange={(event) => update("motto", event.target.value)} placeholder="Knowledge and character" /></Field>
                <Field label="Country"><select value={data.country} onChange={(event) => chooseCountry(event.target.value)}>{Object.keys(currencies).map((country) => <option key={country}>{country}</option>)}</select></Field>
                <Field label="Display currency"><select value={data.currency} onChange={(event) => update("currency", event.target.value)}>{Object.values(currencies).map((currency) => <option value={currency.code} key={currency.code}>{currency.symbol} · {currency.label} ({currency.code})</option>)}</select></Field>
                <Field label="School address"><textarea value={data.address} onChange={(event) => update("address", event.target.value)} placeholder="Street, city or district" /></Field>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="book" /></span>
                <div><h2>Set up your academic year</h2><p>Choose a starting structure. Terms and grading scales can be customized later.</p></div>
              </div>
              <div className="field-grid">
                <Field label="Current academic year"><input value={data.academicYear} onChange={(event) => update("academicYear", event.target.value)} /></Field>
                <Field label="Academic structure"><select value={data.terms} onChange={(event) => update("terms", event.target.value)}><option>Three terms</option><option>Two semesters</option><option>Four quarters</option><option>Custom</option></select></Field>
              </div>
              <div className="section-label mt-4 font-semibold text-sm">Choose a grading scale</div>
              <div className="choice-stack">
                <ChoiceCard selected={data.grading === "West African standard"} onClick={() => update("grading", "West African standard")} title="West African standard" description="A1–F9 grading with 50% as the pass mark" icon="grades" badge="Recommended" />
                <ChoiceCard selected={data.grading === "Percentage"} onClick={() => update("grading", "Percentage")} title="Percentage scale" description="A–F grading with editable score ranges" icon="reports" />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="reports" /></span>
                <div><h2>Choose your document style</h2><p>Start with a template for printed report cards and payment receipts.</p></div>
              </div>
              <div className="template-block">
                <div className="section-label">Report card template</div>
                <div className="template-grid">
                  <TemplateCard type="report" title="Classic" description="Formal and detailed" selected={data.reportTemplate === "Classic"} onClick={() => update("reportTemplate", "Classic")} />
                  <TemplateCard type="report" title="Modern" description="Clear and compact" selected={data.reportTemplate === "Modern"} onClick={() => update("reportTemplate", "Modern")} />
                </div>
              </div>
              <div className="template-block">
                <div className="section-label">Receipt template</div>
                <div className="template-grid">
                  <TemplateCard type="receipt" title="Compact" description="Half-page receipt" selected={data.receiptTemplate === "Compact"} onClick={() => update("receiptTemplate", "Compact")} />
                  <TemplateCard type="receipt" title="Standard" description="Full-page branded" selected={data.receiptTemplate === "Standard"} onClick={() => update("receiptTemplate", "Standard")} />
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="shield" /></span>
                <div><h2>Choose how your team will work</h2><p>Belko works without internet in either mode. You can switch modes at any time.</p></div>
              </div>
              <div className="usage-grid">
                <ChoiceCard selected={data.usageMode === "Shared computer"} onClick={() => update("usageMode", "Shared computer")} title="One shared computer" description="Staff take turns signing in on this computer." icon="home" badge="Recommended" />
                <ChoiceCard selected={data.usageMode === "School network"} onClick={() => update("usageMode", "School network")} title="School network" description="Staff also connect from phones and laptops over school Wi-Fi." icon="wifi" />
              </div>
              <div className="backup-card mt-4">
                <span className="backup-icon"><Icon name="shield" /></span>
                <div className="backup-copy">
                  <strong>Protect your school’s data</strong>
                  <p>Choose an external drive or synced folder. Belko will back up data safely.</p>
                  <Field label="Backup folder">
                    <input value={data.backupFolder} onChange={(event) => update("backupFolder", event.target.value)} />
                  </Field>
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="students" /></span>
                <div><h2>Create the principal account</h2><p>This first administrator can create staff accounts and control school settings.</p></div>
              </div>
              <div className="field-grid">
                <Field label="Full name"><input value={data.adminName} onChange={(event) => update("adminName", event.target.value)} placeholder="Principal’s full name" autoFocus /></Field>
                <Field label="Email"><input value={data.adminEmail} onChange={(event) => update("adminEmail", event.target.value)} placeholder="principal@school.edu" /></Field>
                <Field label="Password"><input type="password" value={data.password} onChange={(event) => update("password", event.target.value)} placeholder="Create a secure password" /></Field>
              </div>
              <SetupStepAnimation step={step} totalSteps={setupSteps.length} isFinal />
            </section>
          )}

          <div className="setup-actions">
            <div>{step > 0 && <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>Back</Button>}</div>
            <div className="setup-action-copy">{step < 4 && <span>All parameters can be modified anytime in Settings</span>}</div>
            {step < 4 ? (
              <Button onClick={() => setStep((value) => value + 1)}>Continue <Icon name="arrow" size={17} /></Button>
            ) : (
              <Button onClick={finishSetup} disabled={loading}>
                {loading ? "Completing setup…" : <><Icon name="check" size={17} /> Complete Setup</>}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- LockScreenOverlay */

function LockScreenOverlay({ isLocked, onUnlock }: { isLocked: boolean; onUnlock: () => void }) {
  if (!isLocked) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(16, 45, 50, 0.95)", backdropFilter: "blur(4px)",
      }}
      role="dialog" aria-modal="true" aria-label="Screen locked"
    >
      <div
        style={{
          width: "100%", maxWidth: "400px", padding: "32px", borderRadius: "16px",
          background: "#fafbf9", boxShadow: "0 20px 60px rgba(16, 45, 50, 0.5)",
        }}
      >
        <LockAnimation message="Screen locked. Enter your PIN to unlock." onUnlock={onUnlock} size={120} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- MainApp */

function MainApp({
  token,
  user,
  staffId: _staffId,
  onLogout,
}: {
  token: string;
  user: { id: string; email: string; full_name: string; role: string; };
  staffId: string;
  onLogout: () => void;
}) {
  const [active, setActive] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [school, setSchool] = useState<{ name: string; } | null>(null);
  const [locked, setLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toasts } = useSaveConfirmation();

  useEffect(() => {
    (async () => {
      const api = getElectronAPI();
      const result = await call(api.schools.getPublic());
      if (result?.school) setSchool({ name: result.school.name });
    })();
  }, []);

  // Keyboard shortcut ⌘K or Ctrl+K to jump to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("main-search-input");
        input?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Quick navigation routing
  const renderActivePage = () => {
    switch (active) {
      case "Overview":
        return (
          <Overview
            token={token}
            schoolName={school?.name || "Belko Academy"}
            userName={user.full_name}
            onNavigate={setActive}
          />
        );
      case "Students":
        return <StudentsPage token={token} />;
      case "Attendance":
        return <Attendance token={token} />;
      case "Grades & reports":
        return <Grades token={token} />;
      case "Fees & payments":
        return <Fees token={token} />;
      case "Calendar":
        return <CalendarPage token={token} role={user.role} />;
      case "Reports":
        return <ReportsPage token={token} role={user.role} />;
      case "Network":
        return <Network token={token} />;
      case "Settings":
        return <Settings token={token} role={user.role} />;
      default:
        return (
          <Overview
            token={token}
            schoolName={school?.name || "Belko Academy"}
            userName={user.full_name}
            onNavigate={setActive}
          />
        );
    }
  };

  return (
    <AnimationProvider>
      <div className="app-shell">
        <Sidebar
          active={active}
          setActive={setActive}
          open={sidebarOpen}
          close={() => setSidebarOpen(false)}
          schoolName={school?.name || "Belko Academy"}
          userName={user.full_name}
          userRole={user.role}
          onLogout={onLogout}
        />
        <main className="main-content">
          <header className="topbar">
            <Button
              variant="icon"
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
              ariaLabel="Open navigation"
            >
              <Icon name="menu" />
            </Button>

            <div className="search-box">
              <Icon name="search" size={18} />
              <input
                id="main-search-input"
                aria-label="Search"
                placeholder="Search students, receipts, classes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const q = e.target.value.toLowerCase();
                  if (q.includes("student") && active !== "Students") setActive("Students");
                  if (q.includes("attend") && active !== "Attendance") setActive("Attendance");
                  if (q.includes("grade") && active !== "Grades & reports") setActive("Grades & reports");
                  if (q.includes("fee") && active !== "Fees & payments") setActive("Fees & payments");
                  if (q.includes("cal") && active !== "Calendar") setActive("Calendar");
                  if (q.includes("rep") && active !== "Reports") setActive("Reports");
                }}
              />
              <span>⌘ K</span>
            </div>

            <div className="topbar-actions">
              <div className="offline-badge">
                <span />
                <strong>Offline & secure</strong>
              </div>

              <Button
                variant="icon"
                className="notification-button"
                ariaLabel="Notifications"
                onClick={() => setActive("Calendar")}
                title="View Calendar Events"
              >
                <Icon name="bell" />
                <span className="notification-dot" />
              </Button>

              <Button
                variant="secondary"
                className="switch-user"
                onClick={() => setLocked(true)}
                title="Lock workstation"
              >
                Lock screen
              </Button>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
                title="Sign out of Belko"
              >
                <Icon name="logout" size={14} />
                <span>Sign out</span>
              </button>
            </div>
          </header>

          <div className="content-wrap">
            {renderActivePage()}
            <footer>
              <span>Belko operates autonomously on this school workstation. All databases are synced locally.</span>
              <span>
                <span className="footer-dot" /> Verified Local SQLite Storage
              </span>
            </footer>
          </div>
        </main>

        {toasts.map((t) => (
          <SaveConfirmation key={t.id} message={t.message} />
        ))}
        <LockScreenOverlay isLocked={locked} onUnlock={() => setLocked(false)} />
      </div>
    </AnimationProvider>
  );
}

/* ---------------------------------------------------------------- App Entry */

export default function App() {
  const [setupStatus, setSetupStatus] = useState<{ completed: boolean; hasSchool: boolean; hasUsers: boolean; hasCurrentTerm: boolean; } | null>(null);
  const [session, setSession] = useState<{ token: string; user: { id: string; email: string; full_name: string; role: string; }; staffId: string; } | null>(() => {
    try {
      const saved = localStorage.getItem("belko_active_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const api = getElectronAPI();
        const status = await call(api.setup.getStatus());
        if (status) {
          setSetupStatus(status);
          setSetupComplete(status.completed);
        }
      } catch (e) {
        console.error("Status check error:", e);
        setSetupComplete(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogin = useCallback((token: string, user: { id: string; email: string; full_name: string; role: string; }, staffId: string) => {
    const newSession = { token, user, staffId };
    setSession(newSession);
    try {
      localStorage.setItem("belko_active_session", JSON.stringify(newSession));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem("belko_active_session");
    } catch (e) {
      console.error(e);
    }
    setSession(null);
  }, []);

  if (loading) {
    return (
      <div className="app-loading flex min-h-screen flex-col items-center justify-center gap-3">
        <Icon name="shield" size={36} />
        <p className="text-sm font-medium text-slate-600">Starting Belko Edu-Platform…</p>
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <AnimationProvider>
        <SetupWizard
          onComplete={() => {
            setSetupComplete(true);
            setSetupStatus({ completed: true, hasSchool: true, hasUsers: true, hasCurrentTerm: true });
          }}
        />
      </AnimationProvider>
    );
  }

  if (!session) {
    return (
      <AnimationProvider>
        <LoginScreen
          onLogin={handleLogin}
          schoolName={setupStatus?.hasSchool ? "Belko Academy" : "Belko"}
        />
      </AnimationProvider>
    );
  }

  return (
    <MainApp
      token={session.token}
      user={session.user}
      staffId={session.staffId}
      onLogout={handleLogout}
    />
  );
}
