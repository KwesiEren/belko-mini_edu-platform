import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AnimationProvider } from "./context/AnimationContext";
import { EmptyState } from "./components/animations/EmptyState";
import { SaveConfirmation, useSaveConfirmation } from "./components/animations/SaveConfirmation";
import { SetupStepAnimation } from "./components/animations/SetupStepAnimation";
import { Icon, type IconName } from "./components/Icon";

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "icon";
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
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

const stats = [
  { label: "Active students", value: "1,284", note: "+32 this term", color: "teal", icon: "students" as IconName },
  { label: "Attendance today", value: "94.6%", note: "1,215 present", color: "blue", icon: "attendance" as IconName },
  { label: "Fees collected", value: "₦18.4m", note: "72% of term target", color: "amber", icon: "fees" as IconName },
  { label: "Pending approvals", value: "7", note: "Grade submissions", color: "violet", icon: "grades" as IconName },
];

const activities = [
  { initials: "AO", name: "Amaka Okafor", action: "recorded 14 fee payments", time: "12 min ago", color: "coral" },
  { initials: "DI", name: "David Ibrahim", action: "submitted JSS 2A Mathematics grades", time: "28 min ago", color: "blue" },
  { initials: "FA", name: "Fatima Abdullahi", action: "completed attendance for Primary 5B", time: "41 min ago", color: "green" },
];

function Sidebar({
  active,
  setActive,
  open,
  close,
  schoolName,
}: {
  active: string;
  setActive: (value: string) => void;
  open: boolean;
  close: () => void;
  schoolName: string;
}) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={close} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>B</span></div>
          <div>
            <div className="brand-name">Belko</div>
            <div className="brand-subtitle">Edu-Platform</div>
          </div>
          <Button variant="icon" className="sidebar-close" onClick={close} ariaLabel="Close navigation"><Icon name="close" /></Button>
        </div>

        <div className="school-card">
          <div className="school-badge">GA</div>
          <div className="school-info">
            <strong>{schoolName}</strong>
            <span>2026 / 2027 · Term 1</span>
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
              {item.label === "Grades & reports" && <span className="nav-count">7</span>}
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
          <div className="status-row"><Icon name="wifi" size={16} /><span>Network mode on</span></div>
          <div className="status-row"><Icon name="shield" size={16} /><span>Backup: Today, 6:00 AM</span></div>
        </div>

        <div className="profile">
          <div className="avatar">CN</div>
          <div className="profile-copy"><strong>Chidinma Nwosu</strong><span>Principal</span></div>
          <Icon name="chevron" size={16} />
        </div>
      </aside>
    </>
  );
}

function StatCard({ item }: { item: (typeof stats)[number] }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${item.color}`}><Icon name={item.icon} /></div>
      <div className="stat-label">{item.label}</div>
      <div className="stat-value">{item.value}</div>
      <div className={`stat-note ${item.color}`}>{item.note}</div>
    </div>
  );
}

function Overview({ showToast, schoolName }: { showToast: (message: string) => void; schoolName: string }) {
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Monday, 12 October</div>
          <h1>Good morning, Chidinma.</h1>
          <p>Here’s what’s happening at {schoolName} today.</p>
        </div>
        <div className="hero-actions">
          <Button variant="secondary" onClick={() => showToast("Student admission form opened")}><Icon name="plus" /> Add student</Button>
          <Button onClick={() => showToast("Payment recording form opened")}><Icon name="receipt" /> Record payment</Button>
        </div>
      </section>

      <section className="stats-grid" aria-label="School summary">
        {stats.map((item) => <StatCard key={item.label} item={item} />)}
      </section>

      <section className="dashboard-grid">
        <div className="panel attendance-panel">
          <div className="panel-heading">
            <div><h2>Today’s attendance</h2><p>Across all 28 classes</p></div>
            <Button variant="ghost" onClick={() => showToast("Attendance report opened")}>View report <Icon name="arrow" size={17} /></Button>
          </div>
          <div className="attendance-content">
            <div className="donut">
              <div className="donut-inner"><strong>94.6%</strong><span>present</span></div>
            </div>
            <div className="attendance-legend">
              <div><span className="legend-dot present" /><span>Present</span><strong>1,215</strong></div>
              <div><span className="legend-dot absent" /><span>Absent</span><strong>43</strong></div>
              <div><span className="legend-dot late" /><span>Late</span><strong>19</strong></div>
              <div><span className="legend-dot excused" /><span>Excused</span><strong>7</strong></div>
            </div>
          </div>
          <div className="panel-footnote"><Icon name="clock" size={16} /> 24 of 28 classes have completed attendance</div>
        </div>

        <div className="panel finance-panel">
          <div className="panel-heading">
            <div><h2>Fee collection</h2><p>Term 1 · 2026 / 2027</p></div>
            <Button variant="icon" ariaLabel="Open fee collection"><Icon name="arrow" /></Button>
          </div>
          <div className="fee-number">₦18,420,500</div>
          <div className="fee-target"><span>Collected</span><strong>₦25.5m target</strong></div>
          <div className="progress"><span /></div>
          <div className="fee-split">
            <div><span>Outstanding</span><strong>₦7.08m</strong></div>
            <div><span>Today</span><strong>₦684k</strong></div>
          </div>
          <div className="collection-up"><span>↗ 8.4%</span> ahead of last term</div>
        </div>

        <div className="panel actions-panel">
          <div className="panel-heading">
            <div><h2>Needs your attention</h2><p>Tasks waiting for review</p></div>
            <span className="pending-pill">7 pending</span>
          </div>
          <div className="task-list">
            <button type="button" onClick={() => showToast("JSS 2 grade review opened")}>
              <div className="task-icon violet"><Icon name="book" /></div>
              <div><strong>Approve JSS 2 results</strong><span>5 subjects submitted for review</span></div>
              <Icon name="chevron" size={17} />
            </button>
            <button type="button" onClick={() => showToast("Receipt exception opened")}>
              <div className="task-icon amber"><Icon name="receipt" /></div>
              <div><strong>Review voided payment</strong><span>Receipt #GF-2026-0148</span></div>
              <Icon name="chevron" size={17} />
            </button>
            <button type="button" onClick={() => showToast("Backup settings opened")}>
              <div className="task-icon blue"><Icon name="shield" /></div>
              <div><strong>Test your monthly backup</strong><span>Last restore test was 32 days ago</span></div>
              <Icon name="chevron" size={17} />
            </button>
          </div>
        </div>

        <div className="panel activity-panel">
          <div className="panel-heading">
            <div><h2>Recent activity</h2><p>Live updates from your team</p></div>
            <Button variant="ghost">View audit log</Button>
          </div>
          <div className="activity-list">
            {activities.map((activity) => (
              <div className="activity-row" key={activity.name}>
                <div className={`activity-avatar ${activity.color}`}>{activity.initials}</div>
                <div><p><strong>{activity.name}</strong> {activity.action}</p><span>{activity.time}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  if (title === "Students") {
    return (
      <EmptyState
        type="students"
        title="No students yet"
        description="Import your student list from Excel to get started."
        actionLabel="Import students from Excel"
        onAction={() => console.log("Import students clicked")}
      />
    );
  }
  if (title === "Attendance") {
    return (
      <EmptyState
        type="attendance"
        title="No attendance recorded today"
        description="Select a class and mark attendance for today."
        actionLabel="Mark attendance"
        onAction={() => console.log("Mark attendance clicked")}
      />
    );
  }
  if (title === "Fees & payments") {
    return (
      <EmptyState
        type="fees"
        title="No fee records yet"
        description="Record payments or import fee data to begin tracking."
        actionLabel="Record payment"
        onAction={() => console.log("Record payment clicked")}
      />
    );
  }
  return (
    <div className="placeholder-page">
      <div className="placeholder-icon"><Icon name={navItems.find((item) => item.label === title)?.icon ?? "settings"} size={30} /></div>
      <h1>{title}</h1>
      <p>This workspace is ready for the next Belko module.</p>
    </div>
  );
}

type SetupData = {
  schoolName: string;
  schoolLogo: string;
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
};

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

function Onboarding({ onComplete }: { onComplete: (data: SetupData) => void }) {
  const [step, setStep] = useState(0);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<SetupData>({
    schoolName: "",
    schoolLogo: "",
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

  const update = (key: keyof SetupData, value: string) => setData((current) => ({ ...current, [key]: value }));
  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Choose an image smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          setLogoError("Belko could not process that image. Please try another file.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const optimizedImage = canvas.toDataURL("image/jpeg", 0.85);
        update("schoolLogo", optimizedImage);
        setLogoPreview(optimizedImage);
        setLogoError("");
      };
      image.onerror = () => setLogoError("Belko could not open that image. Please try another file.");
      image.src = reader.result;
    };
    reader.onerror = () => setLogoError("Belko could not read that image. Please try another file.");
    reader.readAsDataURL(file);
  };
  const chooseCountry = (country: string) => {
    setData((current) => ({ ...current, country, currency: currencies[country].code }));
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
                <div className="logo-placeholder">{logoPreview ? <img src={logoPreview} alt="School logo preview" /> : <Icon name="plus" />}</div>
                <div><strong>{logoPreview ? "School logo selected" : "Add your school logo"}</strong><span>Image file · Up to 5 MB</span><Button variant="secondary" onClick={() => logoInputRef.current?.click()}>{logoPreview ? "Change image" : "Choose image"}</Button><input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} hidden />{logoError && <span role="alert">{logoError}</span>}</div>
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
              <Button onClick={() => onComplete(data)}><Icon name="check" size={17} /> Finish setup</Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [setupComplete, setSetupComplete] = useState(false);
  const [schoolName, setSchoolName] = useState("Greenfield Academy");
  const [active, setActive] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, show } = useSaveConfirmation();

  const showToast = (message: string) => {
    show(message);
  };

  const finishSetup = (data: SetupData) => {
    setSchoolName(data.schoolName || "Your School");
    try {
      const previous = JSON.parse(localStorage.getItem("schoolSettings") || "{}");
      localStorage.setItem("schoolSettings", JSON.stringify({
        ...previous,
        schoolName: data.schoolName,
        logo: data.schoolLogo || previous.logo,
      }));
    } catch (error) {
      console.error("Could not save school branding locally.", error);
    }
    setSetupComplete(true);
  };

  if (!setupComplete) {
    return (
      <AnimationProvider>
        <Onboarding onComplete={finishSetup} />
      </AnimationProvider>
    );
  }

  return (
    <AnimationProvider>
      <div className="app-shell">
        <Sidebar active={active} setActive={setActive} open={sidebarOpen} close={() => setSidebarOpen(false)} schoolName={schoolName} />
        <main className="main-content">
          <header className="topbar">
            <Button variant="icon" className="mobile-menu" onClick={() => setSidebarOpen(true)} ariaLabel="Open navigation"><Icon name="menu" /></Button>
            <div className="search-box"><Icon name="search" size={18} /><input aria-label="Search" placeholder="Search students, receipts, classes..." /><span>⌘ K</span></div>
            <div className="topbar-actions">
              <div className="offline-badge"><span /><strong>Offline & secure</strong></div>
              <Button variant="icon" className="notification-button" ariaLabel="Notifications"><Icon name="bell" /><span className="notification-dot" /></Button>
              <Button variant="secondary" className="switch-user" onClick={() => showToast("Your work is saved. Ready to switch user.")}>Switch user</Button>
            </div>
          </header>
          <div className="content-wrap">
            {active === "Overview" ? <Overview showToast={showToast} schoolName={schoolName} /> : <PlaceholderPage title={active} />}
            <footer><span>Belko works entirely on this school computer.</span><span><span className="footer-dot" /> All changes saved</span></footer>
          </div>
        </main>
        {toasts.map((t) => <SaveConfirmation key={t.id} message={t.message} />)}
      </div>
    </AnimationProvider>
  );
}
