import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AnimationProvider } from "./context/AnimationContext";
import { EmptyState } from "./components/animations/EmptyState";
import { SaveConfirmation, useSaveConfirmation } from "./components/animations/SaveConfirmation";
import { SetupStepAnimation } from "./components/animations/SetupStepAnimation";
import { LockAnimation } from "./components/animations/LockAnimation";
import { Icon, type IconName } from "./components/Icon";
import type { ElectronAPI, IpcResult } from "./types/electron-api";

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

const navItems: { label: string; icon: IconName }[] = [
  { label: "Overview", icon: "home" },
  { label: "Students", icon: "students" },
  { label: "Attendance", icon: "attendance" },
  { label: "Grades & reports", icon: "grades" },
  { label: "Fees & payments", icon: "fees" },
  { label: "Calendar", icon: "calendar" },
  { label: "Reports", icon: "reports" },
];

function Sidebar({
  active,
  setActive,
  open,
  close,
  schoolName,
  userName,
  userRole,
}: {
  active: string;
  setActive: (value: string) => void;
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

function Overview({ token, schoolName, userName }: { token: string; schoolName: string; userName: string }) {
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
          <h1>Good morning, {userName.split(" ")[0]}.</h1>
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

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-icon"><Icon name={navItems.find((item) => item.label === title)?.icon ?? "settings"} size={30} /></div>
      <h1>{title}</h1>
      <p>This workspace is ready for the next Belko module.</p>
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

  const handleSubmit = async (event: React.FormEvent) => {
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
    schoolName: "",
    motto: "",
    country: "Nigeria",
    currency: "NGN",
    address: "",
    academicYear: "2026 / 2027",
    terms: "Three terms",
    grading: "West African standard",
    reportTemplate: "Classic",
    receiptTemplate: "Compact",
    usageMode: "Shared computer",
    backupFolder: "",
    adminName: "",
    adminEmail: "",
    password: "",
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
        { name: "Term 1", ordinal: 1, start_date: "2026-09-14", end_date: "2026-12-18" },
        { name: "Term 2", ordinal: 2, start_date: "2027-01-11", end_date: "2027-04-02" },
        { name: "Term 3", ordinal: 3, start_date: "2027-04-26", end_date: "2027-07-23" },
      ].slice(0, termsPerYear);

      const result = await call(electronAPI.setup.complete({
        school: {
          name: data.schoolName,
          motto: data.motto,
          address: data.address,
          country: data.country,
          currency: data.currency,
          primary_color: "#d8ed88",
          secondary_color: "",
          academic_year: data.academicYear,
          terms_per_year: termsPerYear,
          backup_folder: data.backupFolder || undefined,
        },
        academicYear: {
          name: data.academicYear,
          start_date: "2026-09-14",
          end_date: "2027-07-23",
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
          <p>This takes about five minutes. You can change every setting later.</p>
        </div>
        <div className="setup-steps">
          {setupSteps.map((item, index) => (
            <div className={`setup-step ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`} key={item.title}>
              <div className="setup-step-number">{index < step ? <Icon name="check" size={14} /> : index + 1}</div>
              <div><strong>{item.title}</strong><span>{item.description}</span></div>
            </div>
          ))}
        </div>
        <div className="setup-privacy"><Icon name="shield" size={18} /><span>Your setup stays on this computer. Belko never sends school data online.</span></div>
      </aside>

      <main className="setup-main">
        <div className="setup-mobile-brand">
          <div className="brand-mark"><span>B</span></div><strong>Belko</strong>
          <span>Step {step + 1} of {setupSteps.length}</span>
        </div>
        <div className="setup-content">
          <div className="setup-progress"><span style={{ width: `${((step + 1) / setupSteps.length) * 100}%` }} /></div>

          {step === 0 && (
            <section className="setup-section">
              <div className="setup-heading"><span className="setup-heading-icon"><Icon name="home" /></span><div><h2>Tell us about your school</h2><p>This information appears on report cards, receipts and official documents.</p></div></div>
              <div className="logo-uploader">
                <div className="logo-placeholder"><Icon name="plus" /></div>
                <div><strong>Add your school logo</strong><span>PNG or JPG · Recommended square image</span><Button variant="secondary">Choose image</Button></div>
              </div>
              <div className="field-grid">
                <Field label="School name"><input value={data.schoolName} onChange={(event) => update("schoolName", event.target.value)} placeholder="e.g. Greenfield Academy" autoFocus /></Field>
                <Field label="School motto" hint="Optional"><input value={data.motto} onChange={(event) => update("motto", event.target.value)} placeholder="Knowledge and character" /></Field>
                <Field label="Country"><select value={data.country} onChange={(event) => chooseCountry(event.target.value)}>{Object.keys(currencies).map((country) => <option key={country}>{country}</option>)}</select></Field>
                <Field label="Display currency"><select value={data.currency} onChange={(event) => update("currency", event.target.value)}>{Object.values(currencies).map((currency) => <option value={currency.code} key={currency.code}>{currency.symbol} · {currency.label} ({currency.code})</option>)}</select></Field>
                <Field label="School address"><textarea value={data.address} onChange={(event) => update("address", event.target.value)} placeholder="Street, city or district" /></Field>
                <div className="locale-note"><span>{currencies[data.country]?.symbol ?? data.currency}</span><div><strong>Currency formatting preview</strong><small>{currencies[data.country]?.symbol ?? ""} 125,000.00 · English · DD/MM/YYYY</small></div></div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="setup-section">
              <div className="setup-heading"><span className="setup-heading-icon"><Icon name="book" /></span><div><h2>Set up your academic year</h2><p>Choose a starting structure. Terms and grading scales can be customized later.</p></div></div>
              <div className="field-grid">
                <Field label="Current academic year"><input value={data.academicYear} onChange={(event) => update("academicYear", event.target.value)} /></Field>
                <Field label="Academic structure"><select value={data.terms} onChange={(event) => update("terms", event.target.value)}><option>Three terms</option><option>Two semesters</option><option>Four quarters</option><option>Custom</option></select></Field>
                <Field label="Term starts"><input type="date" defaultValue="2026-09-14" /></Field>
                <Field label="Term ends"><input type="date" defaultValue="2026-12-18" /></Field>
              </div>
              <div className="section-label">Choose a grading scale</div>
              <div className="choice-stack">
                <ChoiceCard selected={data.grading === "West African standard"} onClick={() => update("grading", "West African standard")} title="West African standard" description="A1–F9 grading with 50% as the pass mark" icon="grades" badge="Recommended" />
                <ChoiceCard selected={data.grading === "Percentage"} onClick={() => update("grading", "Percentage")} title="Percentage scale" description="A–F grading with editable score ranges" icon="reports" />
                <ChoiceCard selected={data.grading === "Custom"} onClick={() => update("grading", "Custom")} title="Build my own scale" description="Define grades, score ranges and automatic remarks" icon="settings" />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="setup-section">
              <div className="setup-heading"><span className="setup-heading-icon"><Icon name="reports" /></span><div><h2>Choose your document style</h2><p>Start with a template for printed report cards and payment receipts.</p></div></div>
              <div className="template-block">
                <div className="section-label">Report card template</div>
                <div className="template-grid">
                  <TemplateCard type="report" title="Classic" description="Formal and detailed" selected={data.reportTemplate === "Classic"} onClick={() => update("reportTemplate", "Classic")} />
                  <TemplateCard type="report" title="Modern" description="Clear and compact" selected={data.reportTemplate === "Modern"} onClick={() => update("reportTemplate", "Modern")} />
                  <TemplateCard type="report" title="Minimal" description="Ink-saving layout" selected={data.reportTemplate === "Minimal"} onClick={() => update("reportTemplate", "Minimal")} />
                </div>
              </div>
              <div className="template-block">
                <div className="section-label">Receipt template</div>
                <div className="template-grid">
                  <TemplateCard type="receipt" title="Compact" description="Half-page receipt" selected={data.receiptTemplate === "Compact"} onClick={() => update("receiptTemplate", "Compact")} />
                  <TemplateCard type="receipt" title="Standard" description="Full-page branded" selected={data.receiptTemplate === "Standard"} onClick={() => update("receiptTemplate", "Standard")} />
                </div>
              </div>
              <div className="customize-note"><Icon name="settings" /><div><strong>Fully customizable later</strong><span>Add your crest, school colors, signatures, grading legend and the fields your education authority requires.</span></div></div>
            </section>
          )}

          {step === 3 && (
            <section className="setup-section">
              <div className="setup-heading"><span className="setup-heading-icon"><Icon name="shield" /></span><div><h2>Choose how your team will work</h2><p>Belko works without internet in either mode. You can switch modes at any time.</p></div></div>
              <div className="usage-grid">
                <ChoiceCard selected={data.usageMode === "Shared computer"} onClick={() => update("usageMode", "Shared computer")} title="One shared computer" description="Staff take turns signing in on this computer. Simple and recommended to start." icon="home" badge="Recommended" />
                <ChoiceCard selected={data.usageMode === "School network"} onClick={() => update("usageMode", "School network")} title="School network" description="Staff also connect from phones and laptops over your school Wi-Fi." icon="wifi" />
              </div>
              <div className="backup-card">
                <span className="backup-icon"><Icon name="shield" /></span>
                <div className="backup-copy"><strong>Protect your school’s data</strong><p>Choose an external drive or synced folder. Belko will create and verify a backup every day.</p>
                  <Field label="Backup folder"><div className="folder-field"><input value={data.backupFolder} onChange={(event) => update("backupFolder", event.target.value)} placeholder="No folder selected" /><Button variant="secondary">Browse</Button></div></Field>
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="setup-section">
              <div className="setup-heading"><span className="setup-heading-icon"><Icon name="students" /></span><div><h2>Create the principal account</h2><p>This first administrator can create staff accounts and control school settings.</p></div></div>
              <div className="admin-avatar">CN<span><Icon name="plus" size={13} /></span></div>
              <div className="field-grid">
                <Field label="Full name"><input value={data.adminName} onChange={(event) => update("adminName", event.target.value)} placeholder="Principal’s full name" autoFocus /></Field>
                <Field label="Email or username"><input value={data.adminEmail} onChange={(event) => update("adminEmail", event.target.value)} placeholder="principal@school.edu" /></Field>
                <Field label="Password" hint="Use at least 8 characters"><input type="password" value={data.password} onChange={(event) => update("password", event.target.value)} placeholder="Create a secure password" /></Field>
                <Field label="Confirm password"><input type="password" placeholder="Enter the password again" /></Field>
              </div>
              <label className="sample-option"><input type="checkbox" defaultChecked /><span><strong>Add practice data</strong><small>Explore Belko with a sample class, students and payments. Remove it when you’re ready.</small></span></label>
              <div className="setup-summary">
                <div><span>School</span><strong>{data.schoolName || "Your school"}</strong></div>
                <div><span>Currency</span><strong>{data.currency}</strong></div>
                <div><span>Academic year</span><strong>{data.academicYear}</strong></div>
                <div><span>Usage</span><strong>{data.usageMode}</strong></div>
              </div>
              <SetupStepAnimation step={step} totalSteps={setupSteps.length} isFinal />
            </section>
          )}

          <div className="setup-actions">
            <div>{step > 0 && <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>Back</Button>}</div>
            <div className="setup-action-copy">{step < 4 && <span>You can edit this later in Settings</span>}</div>
            {step < 4 ? (
              <Button onClick={() => setStep((value) => value + 1)}>Continue <Icon name="arrow" size={17} /></Button>
            ) : (
              <Button onClick={finishSetup} disabled={loading}>
                {loading ? "Setting up…" : <><Icon name="check" size={17} /> Finish setup</>}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- SettingsPage */

function SettingsPage({ token, role }: { token: string; role: string }) {
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

  const isPrincipal = role === "principal";

  return (
    <div className="settings-page">
      <h2>Settings</h2>
      <div className="settings-section">
        <h3>Branding & appearance</h3>
        {settings.map((s) => (
          <div key={s.key} className="setting-row">
            <label>{s.key}</label>
            {s.key === "primary_color" || s.key === "secondary_color" ? (
              <input type="color" value={s.value} readOnly disabled={!isPrincipal} />
            ) : (
              <input value={s.value} readOnly disabled={!isPrincipal} />
            )}
            <span className="setting-description">{s.description || ""}</span>
          </div>
        ))}
        {!isPrincipal && (
          <div className="notice">Note: School branding and appearance settings can only be changed by the principal.</div>
        )}
      </div>
      <div className="settings-section">
        <h3>Reduce animations</h3>
        <div className="setting-row">
          <label>Reduce motion (machine-wide)</label>
          <input type="checkbox" readOnly disabled={!isPrincipal} />
          <span className="setting-description">Available to principals only. Applies machine-wide via OS prefers-reduced-motion.</span>
        </div>
        {!isPrincipal && (
          <div className="notice">Note: Animation preferences are principal-only and machine-wide.</div>
        )}
      </div>
      <div className="settings-section">
        <h3>Backup</h3>
        {settings.map((s) => (
          <div key={s.key} className="setting-row">
            <label>{s.key}</label>
            <input value={s.value} readOnly disabled={!isPrincipal} />
          </div>
        ))}
      </div>
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
  staffId,
}: {
  token: string;
  user: { id: string; email: string; full_name: string; role: string; };
  staffId: string;
}) {
  const [active, setActive] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [school, setSchool] = useState<{ name: string; } | null>(null);
  const [locked, setLocked] = useState(false);
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
              <Button variant="secondary" className="switch-user" onClick={() => setLocked(true)}>Lock screen</Button>
            </div>
          </header>
          <div className="content-wrap">
            {active === "Overview" ? <Overview token={token} schoolName={school?.name || "Belko School"} userName={user.full_name} /> : <PlaceholderPage title={active} />}
            <footer><span>Belko works entirely on this school computer.</span><span><span className="footer-dot" /> All changes saved</span></footer>
          </div>
        </main>
        {toasts.map((t) => <SaveConfirmation key={t.id} message={t.message} />)}
        <LockScreenOverlay isLocked={locked} onUnlock={() => setLocked(false)} />
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
