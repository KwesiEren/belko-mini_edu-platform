import { useCallback, useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { Button } from "../components/Button";
import { NetworkStatusAnimation } from "../components/animations/NetworkStatusAnimation";
import type { ElectronAPI, IpcResult } from "../types/electron-api";
import * as QRCode from "qrcode";

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

interface NetworkStatusData {
  status?: "waiting" | "connected" | "disconnected";
  url?: string;
  port?: number;
  deviceCount?: number;
}

interface NetworkDevice {
  id?: string;
  name?: string;
  ip?: string;
  connectedAt?: string;
}

const DEFAULT_PIN = "123456";

export default function Network({ token }: { token: string }) {
  const [status, setStatus] = useState<NetworkStatusData>({});
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connectionUrl, setConnectionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, d] = await Promise.all([
        call(electronAPI.network.status()),
        call(electronAPI.network.devices()),
      ]);
      if (s) {
        setStatus(s as NetworkStatusData);
        const url = (s as NetworkStatusData).url || null;
        setConnectionUrl(url);
        if (url) {
          try {
            setQrDataUrl(await QRCode.toDataURL(url));
          } catch {
            setQrDataUrl(null);
          }
        } else {
          setQrDataUrl(null);
        }
      }
      if (d) setDevices(d as NetworkDevice[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load network status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleStart = async () => {
    setError("");
    setActionLoading(true);
    try {
      await call(electronAPI.network.start(token));
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to start network sharing.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setError("");
    setActionLoading(true);
    try {
      await call(electronAPI.network.stop());
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to stop network sharing.");
    } finally {
      setActionLoading(false);
    }
  };

  const isConnected = status.status === "connected";
  const isWaiting = status.status === "waiting";
  const statusLabel = isConnected
    ? "Connected"
    : isWaiting
    ? "Waiting for device…"
    : "Disconnected";

  return (
    <div className="network-page">
      <div className="page-header">
        <h2>Network Sharing</h2>
        <p>
          Share Belko over the school Wi-Fi so staff can connect from their phones
          and laptops without internet.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <section className="panel network-status-panel">
        <div className="panel-heading">
          <h3>Connection status</h3>
        </div>
        <NetworkStatusAnimation
          status={(isConnected ? "connected" : isWaiting ? "waiting" : "disconnected") as
            | "waiting"
            | "connected"
            | "disconnected"}
          size={140}
          showQR={isWaiting || isConnected}
          qrCodeDataUrl={qrDataUrl ?? undefined}
        />
        {connectionUrl && (
          <div className="connection-url">
            <label>Connection URL</label>
            <div className="url-row">
              <code title={connectionUrl}>{connectionUrl}</code>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(connectionUrl ?? "");
                }}
                ariaLabel="Copy connection URL"
              >
                Copy
              </Button>
            </div>
            <p className="url-hint">
              Open this URL on any device on the same Wi-Fi network.
            </p>
          </div>
        )}
      </section>

      <section className="panel devices-panel">
        <div className="panel-heading">
          <h3>Connected devices ({devices.length})</h3>
        </div>
        {loading ? (
          <div className="empty-state">Loading devices…</div>
        ) : devices.length === 0 ? (
          <div className="empty-state">
            <Icon name="shield" size={32} />
            <p>No devices connected yet.</p>
            <p className="hint">
              Start sharing, then open the connection URL on a phone or laptop.
            </p>
          </div>
        ) : (
          <ul className="device-list">
            {devices.map((device) => (
              <li key={device.id || device.ip} className="device-item">
                <div className="device-info">
                  <strong>{device.name || "Unknown device"}</strong>
                  <span>{device.ip || "—"}</span>
                </div>
                <span className="device-time">{device.connectedAt || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel actions-panel">
        <div className="panel-actions">
          {isConnected ? (
            <Button onClick={handleStop} disabled={actionLoading} ariaLabel="Stop network sharing">
              {actionLoading ? "Stopping…" : "Stop network sharing"}
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={actionLoading} ariaLabel="Start network sharing">
              {actionLoading ? "Starting…" : "Start network sharing"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
