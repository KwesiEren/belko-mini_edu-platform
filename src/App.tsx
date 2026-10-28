import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AnimationProvider } from "./context/AnimationContext";
import { EmptyState } from "./components/animations/EmptyState";
import { SaveConfirmation, useSaveConfirmation } from "./components/animations/SaveConfirmation";
import { SetupStepAnimation } from "./components/animations/SetupStepAnimation";
import { Icon, type IconName } from "./components/Icon";
import type { ElectronAPI, IpcResult } from "./types/electron-api";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const electronAPI = window.electronAPI;

type NavLabel = "Overview" | "Students" | "Attendance" | "Grades & reports" | "Fees & payments" | "Calendar" | "Reports" | "Settings";

const navItems: { label: NavLabel; icon: IconName }[] = [
  { label: "Overview", icon: "home" },
  { label: "Students", icon: "students" },
  { label: "Attendance", icon: "attendance" },
  { label: "Grades & reports", icon: "grades" },
  { label: "Fees & payments", icon: "fees" },
  { label: "Calendar", icon: "calendar" },
  { label: "Reports", icon: "reports" },
];

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  ariaLabel,
  type,
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "icon";
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

/* ---------------------------------------------------------------- helpers */

async function call<T>(promise: Promise<IpcResult<T>>): Promise<T | null> {
  const result = await promise;
  if (!result.ok) {
    console.error("IPC error:", result.code, result.error);
    return null;
  }
  return result.data;
}

/* ---------------------------------------------------------------- Sidebar */

function Sidebar({
  active,
  setActive,
  open,
  close,
  schoolName,
  userName,
  userRole,
}: {
  active: NavLabel;
  setActive: (value: NavLabel) => void;
  open: boolean;
  close: () => void;
  schoolName: string;
  userName: string;
  userRole: string;
}) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={close} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>B</span></div>
          <div>
            <div className="brand-name">{schoolName}</div>
            <div className="brand-subtitle">Edu-Platform</div>
          </div>
          <Button variant="icon" className="sidebar-close" onClick={close} ariaLabel="Close navigation"><Icon name="close" /></Button>
        </div>

        <div className="school-card">
          <div className="school-badge">{schoolName.charAt(0).toUpperCase()}</div>
          <div className="school-info">
            <strong>{schoolName}</strong>
            <span>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
          </div>
          <Icon name="chevron" size={16} />
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <div className="nav-label">Workspace</div>
          {navItems.map((item) => (
            <button
              type="button"
              key={item.label}
              className={`nav-item ${active === item.label ? "active" : ""}`}
              onClick={() => { setActive(item.label); close(); }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
          <div className="nav-divider" />
          <div className="nav-label">System</div>
          <button type="button" className="nav-item" onClick={() => setActive("Settings")}>
            <Icon name="settings" /><span>Settings</span>
          </button>
        </nav>

        <div className="system-status">
          <div className="status-heading"><span className="live-dot" /> System ready</div>
        </div>

        <div className="profile">
          <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
          <div className="profile-copy"><strong>{userName}</strong><span>{userRole}</span></div>
          <Icon name="chevron" size={16} />
        </div>
      </aside>
    </>
  );
}

/* ---------------------------------------------------------------- StatCard */

function StatCard({ label, value, note, color, icon }: { label: string; value: string; note: string; color: string; icon: IconName }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon name={icon} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-note ${color}`}>{note}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- Overview */

function Overview({ token, schoolName }: { token: string; schoolName: string }) {
  const [data, setData] = useState<{
    students: number; staff: number; billsDue: number; collected: number;
    collectionRate: number; attendanceTodayRate: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await call(electronAPI.dashboard.overview(token));
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

  const s = data!;
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Overview</div>
          <h1>Good morning.</h1>
          <p>Here’s what’s happening at {schoolName} today.</p>
        </div>
        <div className="hero-actions">
          <Button variant="secondary" onClick={() => {}}><Icon name="plus" /> Add student</Button>
          <Button onClick={() => {}}><Icon name="receipt" /> Record payment</Button>
        </div>
      </section>

      <section className="stats-grid" aria-label="School summary">
        <StatCard label="Active students" value={String(s.students)} note="Students enrolled" color="teal" icon="students" />
        <StatCard label="Staff" value={String(s.staff)} note="Active staff members" color="blue" icon="home" />
        <StatCard label="Fees due" value={`₦${s.billsDue.toLocaleString()}`} note="Outstanding balance" color="amber" icon="fees" />
        <StatCard label="Collection rate" value={`${s.collectionRate}%`} note="Of term billing" color="violet" icon="grades" />
      </section>

      <section className="dashboard-grid">
        <div className="panel attendance-panel">
          <div className="panel-heading">
            <div><h2>Today’s attendance</h2><p>Across all classes</p></div>
            <Button variant="ghost">View report</Button>
          </div>
          <div className="attendance-content">
            <div className="donut">
              <div className="donut-inner"><strong>{s.attendanceTodayRate ?? 0}%</strong><span>present</span></div>
            </div>
          </div>
        </div>

        <div className="panel finance-panel">
          <div className="panel-heading">
            <div><h2>Fee collection</h2><p>This term</p></div>
            <Button variant="ghost">View report</Button>
          </div>
          <div className="attendance-content">
            <div className="donut">
              <div className="donut-inner"><strong>₦{s.collected.toLocaleString()}</strong><span>collected</span></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- PlaceholderPage */

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <Icon name="shield" size={48} />
      <h2>{title}</h2>
      <p>This section is wired to the backend via IPC. Select a feature to implement its UI.</p>
    </div>
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await call(electronAPI.auth.login({ email, password, deviceInfo: { deviceName: "Belko Desktop" } }));
      if (result) {
        onLogin(result.accessToken, result.user, result.user.id);
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark"><span>B</span></div>
          <div>
            <div className="brand-name">{schoolName}</div>
            <div className="brand-subtitle">Sign in to continue</div>
          </div>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- SetupWizard */

interface SetupData {
  schoolName: string;
  motto: string;
  address: string;
  country: string;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  academicYear: string;
  termsPerYear: number;
  academicYearName: string;
  academicYearStart: string;
  academicYearEnd: string;
  terms: Array<{ name: string; ordinal: number; start: string; end: string }>;
  adminName: string;
  adminEmail: string;
  password: string;
  usageMode: "shared" | "network";
  backupFolder: string;
  seedSampleData: boolean;
}

const defaultSetupData: SetupData = {
  schoolName: "", motto: "", address: "", country: "Nigeria", currency: "NGN",
  primaryColor: "#d8ed88", secondaryColor: "", academicYear: "2026/2027",
  termsPerYear: 3, academicYearName: "2026/2027",
  academicYearStart: "", academicYearEnd: "",
  terms: [
    { name: "Term 1", ordinal: 1, start: "", end: "" },
    { name: "Term 2", ordinal: 2, start: "", end: "" },
    { name: "Term 3", ordinal: 3, start: "", end: "" },
  ],
  adminName: "", adminEmail: "", password: "", usageMode: "shared",
  backupFolder: "", seedSampleData: false,
};

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SetupData>(defaultSetupData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setupSteps = ["School profile", "Academic year & terms", "Usage & backup", "Principal account"];
  const [field, setField] = useState<{ key: string; value: string } | null>(null);

  const update = (key: string, value: string) => {
    setData(prev => ({ ...prev, [key]: value }));
    setField({ key, value });
  };

  const finishSetup = async () => {
    setLoading(true);
    setError("");

    try {
      const terms = data.terms.map((t, i) => ({
        name: t.name,
        ordinal: i + 1,
        start_date: t.start,
        end_date: t.end,
      }));

      const result = await call(electronAPI.setup.complete({
        school: {
          name: data.schoolName,
          motto: data.motto,
          address: data.address,
          country: data.country,
          currency: data.currency,
          primary_color: data.primaryColor,
          secondary_color: data.secondaryColor,
          academic_year: data.academicYear,
          terms_per_year: data.termsPerYear,
          backup_folder: data.backupFolder || undefined,
        },
        academicYear: {
          name: data.academicYearName,
          start_date: data.academicYearStart,
          end_date: data.academicYearEnd,
        },
        terms,
        principal: {
          full_name: data.adminName,
          email: data.adminEmail,
          password: data.password,
        },
        seedSampleData: data.seedSampleData,
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
    <div className="setup-wizard">
      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-brand">
            <div className="brand-mark"><span>B</span></div>
            <div>
              <div className="brand-name">Belko</div>
              <div className="brand-subtitle">Edu-Platform — School Setup</div>
            </div>
          </div>
          <div className="setup-progress">
            {setupSteps.map((s, i) => (
              <div key={s} className={`step ${i < step ? "done" : i === step ? "active" : ""}`}>{i + 1}</div>
            ))}
          </div>
        </div>

        {error && <div className="setup-error">{error}</div>}

        <div className="setup-body">
          {/* Step 1: School profile */}
          {step === 0 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="home" /></span>
                <div>
                  <h2>School profile</h2>
                  <p>Tell us about your school. This appears on reports and receipts.</p>
                </div>
              </div>
              <div className="field-grid">
                <Field label="School name"><input value={data.schoolName} onChange={(e) => update("schoolName", e.target.value)} placeholder="e.g. Greenfield Academy" autoFocus /></Field>
                <Field label="Motto"><input value={data.motto} onChange={(e) => update("motto", e.target.value)} placeholder="Optional" /></Field>
                <Field label="Address"><input value={data.address} onChange={(e) => update("address", e.target.value)} placeholder="Optional" /></Field>
                <Field label="Country"><input value={data.country} onChange={(e) => update("country", e.target.value)} /></Field>
                <Field label="Currency"><input value={data.currency} onChange={(e) => update("currency", e.target.value)} /></Field>
                <Field label="Primary color"><input type="color" value={data.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} /></Field>
                <Field label="Secondary color"><input type="color" value={data.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} /></Field>
              </div>
            </section>
          )}

          {/* Step 2: Academic year & terms */}
          {step === 1 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="calendar" /></span>
                <div>
                  <h2>Academic year & terms</h2>
                  <p>Set up your academic year and terms.</p>
                </div>
              </div>
              <div className="field-grid">
                <Field label="Academic year name"><input value={data.academicYearName} onChange={(e) => update("academicYearName", e.target.value)} /></Field>
                <Field label="Start date"><input type="date" value={data.academicYearStart} onChange={(e) => update("academicYearStart", e.target.value)} /></Field>
                <Field label="End date"><input type="date" value={data.academicYearEnd} onChange={(e) => update("academicYearEnd", e.target.value)} /></Field>
                <Field label="Terms per year">
                  <select value={String(data.termsPerYear)} onChange={(e) => update("termsPerYear", e.target.value)}>
                    <option value="1">1 term</option>
                    <option value="2">2 terms</option>
                    <option value="3">3 terms</option>
                    <option value="4">4 terms</option>
                  </select>
                </Field>
              </div>
              <div className="terms-list">
                <h3>Terms</h3>
                {data.terms.map((term, i) => (
                  <div key={i} className="term-row">
                    <Field label={`Term ${term.ordinal} name`}><input value={term.name} onChange={(e) => { const t = [...data.terms]; t[i] = { ...t[i], name: e.target.value }; setData({ ...data, terms: t }); }} /></Field>
                    <Field label="Start date"><input type="date" value={term.start} onChange={(e) => { const t = [...data.terms]; t[i] = { ...t[i], start: e.target.value }; setData({ ...data, terms: t }); }} /></Field>
                    <Field label="End date"><input type="date" value={term.end} onChange={(e) => { const t = [...data.terms]; t[i] = { ...t[i], end: e.target.value }; setData({ ...data, terms: t }); }} /></Field>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Step 3: Usage & backup */}
          {step === 2 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="shield" /></span>
                <div>
                  <h2>Choose how your team will work</h2>
                  <p>Belko works without internet in either mode.</p>
                </div>
              </div>
              <div className="usage-grid">
                <ChoiceCard selected={data.usageMode === "shared"} onClick={() => update("usageMode", "shared")} title="One shared computer" description="Staff take turns signing in on this computer." icon="home" badge="Recommended" />
                <ChoiceCard selected={data.usageMode === "network"} onClick={() => update("usageMode", "network")} title="School network" description="Staff connect from phones and laptops over Wi-Fi." icon="wifi" />
              </div>
              <div className="backup-card">
                <span className="backup-icon"><Icon name="shield" /></span>
                <div className="backup-copy"><strong>Backup folder</strong><p>Choose where backups are stored.</p>
                  <Field label="Backup folder"><input value={data.backupFolder} onChange={(e) => update("backupFolder", e.target.value)} placeholder="Default (app data folder)" /><Button variant="secondary">Browse</Button></Field>
                </div>
              </div>
              <Field label="Add practice data">
                <label className="sample-option">
                  <input type="checkbox" checked={data.seedSampleData} onChange={(e) => update("seedSampleData", e.target.checked ? "true" : "false")} />
                  <span><strong>Add practice data</strong><small>Explore with sample classes and students.</small></span>
                </label>
              </Field>
            </section>
          )}

          {/* Step 4: Principal account */}
          {step === 3 && (
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon"><Icon name="students" /></span>
                <div>
                  <h2>Create the principal account</h2>
                  <p>This first administrator can create staff accounts and control school settings.</p>
                </div>
              </div>
              <div className="field-grid">
                <Field label="Full name"><input value={data.adminName} onChange={(e) => update("adminName", e.target.value)} placeholder="Principal’s full name" autoFocus /></Field>
                <Field label="Email"><input value={data.adminEmail} onChange={(e) => update("adminEmail", e.target.value)} placeholder="principal@school.edu" /></Field>
                <Field label="Password" hint="Use at least 8 characters"><input type="password" value={data.password} onChange={(e) => update("password", e.target.value)} placeholder="Create a secure password" /></Field>
              </div>
              <SetupStepAnimation step={step + 1} totalSteps={setupSteps.length} isFinal />
            </section>
          )}
        </div>

        <div className="setup-actions">
          <div>{step > 0 && <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>Back</Button>}</div>
          {step < 3 ? (
            <div className="setup-action-copy"><span>You can edit this later in Settings</span></div>
          ) : null}
          {step < 3 ? (
            <Button onClick={() => setStep((value) => value + 1)}>Continue <Icon name="arrow" size={17} /></Button>
          ) : (
            <Button onClick={finishSetup} disabled={loading}>
              {loading ? "Setting up…" : <><Icon name="check" size={17} /> Finish setup</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Field */

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {hint && <span className="hint">{hint}</span>}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- ChoiceCard */

function ChoiceCard({ selected, onClick, title, description, icon, badge }: { selected: boolean; onClick: () => void; title: string; description: string; icon: IconName; badge?: string }) {
  return (
    <button type="button" className={`choice-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <Icon name={icon} size={24} />
      <div className="choice-copy">
        <strong>{title}</strong>
        <p>{description}</p>
        {badge && <span className="badge">{badge}</span>}
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------- SettingsPage */

function SettingsPage({ token }: { token: string }) {
  const [settings, setSettings] = useState<Array<{ key: string; value: string; description?: string; is_public: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await call(electronAPI.settings.getAll(token));
      if (result) setSettings(result);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="settings-loading">Loading settings…</div>;

  return (
    <div className="settings-page">
      <h2>Settings</h2>
      <table className="settings-table">
        <thead>
          <tr><th>Key</th><th>Value</th><th>Public</th></tr>
        </thead>
        <tbody>
          {settings.map((s) => (
            <tr key={s.key}>
              <td>{s.key}</td>
              <td>{s.value}</td>
              <td>{s.is_public ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- MainApp */

function MainApp({
  token,
  user,
  staffId,
}: {
  token: string;
  user: { id: string; email: string; full_name: string; role: string; };
  staffId: string;
}) {
  const [active, setActive] = useState<NavLabel>("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [school, setSchool] = useState<{ name: string; } | null>(null);
  const { toasts, show } = useSaveConfirmation();

  const showToast = (message: string) => show(message);

  useEffect(() => {
    (async () => {
      const result = await call(electronAPI.schools.getPublic());
      if (result?.school) setSchool({ name: result.school.name });
    })();
  }, []);

  return (
    <AnimationProvider>
      <div className="app-shell">
        <Sidebar
          active={active}
          setActive={setActive}
          open={sidebarOpen}
          close={() => setSidebarOpen(false)}
          schoolName={school?.name || "Belko School"}
          userName={user.full_name}
          userRole={user.role}
        />
        <main className="main-content">
          <header className="topbar">
            <Button variant="icon" className="mobile-menu" onClick={() => setSidebarOpen(true)} ariaLabel="Open navigation"><Icon name="menu" /></Button>
            <div className="search-box"><Icon name="search" size={18} /><input aria-label="Search" placeholder="Search students, receipts, classes..." /><span>⌘ K</span></div>
            <div className="topbar-actions">
              <div className="offline-badge"><span /><strong>Offline & secure</strong></div>
              <Button variant="icon" className="notification-button" ariaLabel="Notifications"><Icon name="bell" /><span className="notification-dot" /></Button>
              <Button variant="secondary" className="switch-user" onClick={() => showToast("Switch user not yet implemented")}>Switch user</Button>
            </div>
          </header>
          <div className="content-wrap">
            {active === "Overview" ? <Overview token={token} schoolName={school?.name || "Belko School"} /> : <PlaceholderPage title={active} />}
            <footer><span>Belko works entirely on this school computer.</span><span><span className="footer-dot" /> All changes saved</span></footer>
          </div>
        </main>
        {toasts.map((t) => <SaveConfirmation key={t.id} message={t.message} />)}
      </div>
    </AnimationProvider>
  );
}

/* ---------------------------------------------------------------- App */

export default function App() {
  const [setupStatus, setSetupStatus] = useState<{ completed: boolean; hasSchool: boolean; hasUsers: boolean; hasCurrentTerm: boolean; } | null>(null);
  const [session, setSession] = useState<{ token: string; user: { id: string; email: string; full_name: string; role: string; }; staffId: string; } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await call(electronAPI.setup.getStatus());
      if (status) {
        setSetupStatus(status);
        setSetupComplete(status.completed);
      }
      setLoading(false);
    })();
  }, []);

  const handleLogin = useCallback((token: string, user: { id: string; email: string; full_name: string; role: string; }, staffId: string) => {
    setSession({ token, user, staffId });
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <Icon name="shield" size={32} />
        <p>Loading Belko…</p>
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <AnimationProvider>
        <SetupWizard onComplete={() => {
          setSetupComplete(true);
          setSetupStatus({ completed: true, hasSchool: true, hasUsers: true, hasCurrentTerm: true });
        }} />
      </AnimationProvider>
    );
  }

  if (!session) {
    return (
      <AnimationProvider>
        <LoginScreen
          onLogin={handleLogin}
          schoolName={setupStatus?.hasSchool ? "Belko School" : "Belko"}
        />
      </AnimationProvider>
    );
  }

  return <MainApp token={session.token} user={session.user} staffId={session.staffId} />;
}
