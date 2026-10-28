import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Icon } from "../components/Icon";
import { Button } from "../components/Button";
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

interface Setting {
  key: string;
  value: string;
  description?: string;
  is_public: boolean;
}

interface BackupSchedule {
  id?: string;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  retention_daily: number;
  retention_monthly: number;
  is_enabled: boolean;
}

const DEFAULT_SCHEDULE: BackupSchedule = {
  frequency: "daily",
  time: "02:00",
  retention_daily: 30,
  retention_monthly: 12,
  is_enabled: true,
};

export default function Settings({
  token,
  role,
}: {
  token: string;
  role: string;
}) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [backupFolder, setBackupFolder] = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#d8ed88");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const isPrincipal = role === "principal";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [all, sched] = await Promise.all([
        call(electronAPI.settings.getAll(token)),
        call(electronAPI.backup.scheduleGet()),
      ]);
      if (all) {
        setSettings(all);
        const byKey: Record<string, string> = {};
        for (const s of all) byKey[s.key] = s.value;
        setBackupFolder(byKey["backup.folder"] ?? "");
        setReduceMotion(byKey["reduce_motion"] === "true");
        setPrimaryColor(byKey["primary_color"] ?? "#d8ed88");
        setSecondaryColor(byKey["secondary_color"] ?? "");
      }
      if (sched && Array.isArray(sched) && sched.length > 0) {
        setSchedule(sched[0] as BackupSchedule);
      } else {
        setSchedule({ ...DEFAULT_SCHEDULE });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSaving = (key: string) => saving[key] === true;

  const setSetting = async (key: string, value: string, description?: string, isPublic = false) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    setError("");
    try {
      const result = await call(
        electronAPI.settings.set(token, key, value, description, isPublic),
      );
      if (result) {
        await refresh();
      } else {
        setError(`Failed to save ${key}.`);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to save ${key}.`);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleBackupFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    await setSetting("backup.folder", event.target.value, "Backup storage folder", true);
  };

  const handleReduceMotion = async () => {
    if (!isPrincipal) return;
    const next = !reduceMotion;
    await setSetting("reduce_motion", next ? "true" : "false", "Reduce animations across the app", false);
  };

  const handlePrimaryColor = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await setSetting("primary_color", event.target.value, "School primary brand color", true);
  };

  const handleSecondaryColor = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await setSetting("secondary_color", event.target.value, "School secondary brand color", true);
  };

  const handleScheduleSave = async () => {
    if (!schedule) return;
    setSaving((prev) => ({ ...prev, schedule: true }));
    setError("");
    try {
      const result = await call(electronAPI.backup.scheduleSet(Object.fromEntries(Object.entries(schedule))));
      if (result) {
        await refresh();
      } else {
        setError("Failed to save backup schedule.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save backup schedule.");
    } finally {
      setSaving((prev) => ({ ...prev, schedule: false }));
    }
  };

  if (loading) {
    return (
      <div className="settings-page settings-loading">
        <Icon name="shield" size={32} />
        <p>Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Manage school-wide settings, branding, and backups.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <section className="panel settings-section">
        <div className="panel-heading">
          <h3>Backup folder</h3>
          <p>Where database backups are stored on this computer.</p>
        </div>
        <div className="field-grid">
          <Field
            label="Backup folder"
            hint={backupFolder || "Default (app data folder)"}
          >
            <input
              value={backupFolder}
              onChange={handleBackupFolder}
              placeholder="Default (app data folder)"
              disabled={isSaving("backup.folder")}
            />
          </Field>
          {isSaving("backup.folder") ? (
            <span className="saving">Saving…</span>
          ) : null}
        </div>
      </section>

      <section className="panel settings-section">
        <div className="panel-heading">
          <h3>Animations</h3>
          <p>Reduce motion across the app. Machine-wide setting.</p>
        </div>
        <div className="field-grid">
          <Field label="Reduce animations">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={handleReduceMotion}
                disabled={!isPrincipal || isSaving("reduce_motion")}
              />
              <span>
                <strong>Reduce animations</strong>
                {isPrincipal ? "" : " (principal only)"}
              </span>
            </label>
          </Field>
          {isSaving("reduce_motion") ? (
            <span className="saving">Saving…</span>
          ) : null}
          {!isPrincipal && (
            <p className="hint">
              Only the principal can change machine-wide animation settings.
            </p>
          )}
        </div>
      </section>

      <section className="panel settings-section">
        <div className="panel-heading">
          <h3>Branding colors</h3>
          <p>Primary and secondary colors used across the school branding.</p>
        </div>
        <div className="field-grid color-grid">
          <Field label="Primary color">
            <input
              type="color"
              value={primaryColor}
              onChange={handlePrimaryColor}
              disabled={isSaving("primary_color")}
            />
          </Field>
          <Field label="Secondary color">
            <input
              type="color"
              value={secondaryColor}
              onChange={handleSecondaryColor}
              disabled={isSaving("secondary_color")}
            />
          </Field>
          {isSaving("primary_color") || isSaving("secondary_color") ? (
            <span className="saving">Saving…</span>
          ) : null}
        </div>
      </section>

      <section className="panel settings-section">
        <div className="panel-heading">
          <h3>Backup schedule</h3>
          <p>Automatic backups run on a schedule you set.</p>
        </div>
        {schedule ? (
          <div className="field-grid">
            <Field label="Frequency">
              <select
                value={schedule.frequency}
                onChange={(e) =>
                  setSchedule({ ...schedule, frequency: e.target.value as BackupSchedule["frequency"] })
                }
                disabled={isSaving("schedule")}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            <Field label="Time">
              <input
                type="time"
                value={schedule.time}
                onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                disabled={isSaving("schedule")}
              />
            </Field>
            <Field label="Retention (daily)">
              <input
                type="number"
                min="1"
                value={String(schedule.retention_daily)}
                onChange={(e) =>
                  setSchedule({ ...schedule, retention_daily: Number(e.target.value) || 30 })
                }
                disabled={isSaving("schedule")}
              />
            </Field>
            <Field label="Retention (monthly)">
              <input
                type="number"
                min="1"
                value={String(schedule.retention_monthly)}
                onChange={(e) =>
                  setSchedule({ ...schedule, retention_monthly: Number(e.target.value) || 12 })
                }
                disabled={isSaving("schedule")}
              />
            </Field>
            <Field label="Enabled">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={schedule.is_enabled}
                  onChange={() =>
                    setSchedule({ ...schedule, is_enabled: !schedule.is_enabled })
                  }
                  disabled={isSaving("schedule")}
                />
                <span>Enable scheduled backups</span>
              </label>
            </Field>
            {isSaving("schedule") ? (
              <span className="saving">Saving…</span>
            ) : (
              <Button onClick={handleScheduleSave} disabled={isSaving("schedule")}>
                Save schedule
              </Button>
            )}
          </div>
        ) : null}
      </section>
    </div>
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
