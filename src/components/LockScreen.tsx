import { useCallback, useState } from "react";
import { LockAnimation } from "./animations/LockAnimation";
import { Button } from "./Button";
import { Icon } from "./Icon";

// Demo unlock PIN. In a real deployment this would be stored/verified server-side.
const CORRECT_PIN = "123456";
const PIN_LENGTH = 6;

interface LockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export default function LockScreen({
  isLocked,
  onUnlock,
}: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const digits = pin.slice(0, PIN_LENGTH).split("");
  const isComplete = digits.length === PIN_LENGTH;

  const appendDigit = useCallback((digit: string) => {
    if (digits.length >= PIN_LENGTH) return;
    setError("");
    setPin((prev) => prev + digit);
  }, [digits.length]);

  const removeDigit = useCallback(() => {
    setError("");
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const clearPin = useCallback(() => {
    setError("");
    setPin("");
  }, []);

  const handleUnlock = useCallback(async () => {
    if (!isComplete) return;
    setUnlocking(true);
    try {
      if (pin === CORRECT_PIN) {
        onUnlock();
      } else {
        setError("Incorrect PIN. Try again.");
        setPin("");
      }
    } finally {
      setUnlocking(false);
    }
  }, [pin, isComplete, onUnlock]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (error) setError("");
      if (/^\d$/.test(event.key)) {
        appendDigit(event.key);
      } else if (event.key === "Backspace") {
        removeDigit();
      } else if (event.key === "Enter") {
        handleUnlock();
      }
    },
    [appendDigit, removeDigit, handleUnlock, error]
  );

  if (!isLocked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screen locked"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(16, 45, 50, 0.95)",
        backdropFilter: "blur(4px)",
        touchAction: "none",
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "32px 24px",
          borderRadius: "16px",
          background: "#fafbf9",
          boxShadow: "0 20px 60px #102d3255",
          textAlign: "center",
        }}
      >
        <LockAnimation
          message="Enter your 6-digit PIN to unlock the screen."
          size={110}
        />
        {error && (
          <div
            style={{
              margin: "12px 0 8px",
              padding: "8px 12px",
              borderRadius: "8px",
              background: "#fdecec",
              color: "#a33",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
        <div className="pin-inputs" style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "20px 0" }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: 48,
                borderRadius: 10,
                border: `2px solid ${digits.length > i ? "#1e6664" : "#d9e1dc"}`,
                background: digits.length > i ? "#e8f4f2" : "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "#183237",
              }}
            >
              {digits[i] !== undefined ? <span>{digits[i]}</span> : <span style={{ color: "#c7d2d0" }}>•</span>}
            </div>
          ))}
        </div>
        <div className="numpad" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          {[...Array(10).keys()].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => appendDigit(String(n))}
              disabled={unlocking || digits.length >= PIN_LENGTH}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid #e0e6e0",
                background: unlocking ? "#e8eae9" : "white",
                fontSize: 17,
                cursor: unlocking || digits.length >= PIN_LENGTH ? "not-allowed" : "pointer",
              }}
            >
              {n}
            </button>
          ))}
          <button type="button" onClick={clearPin} style={{ padding: 12, borderRadius: 10, border: "1px solid #e0e6e0", background: "white", fontSize: 17 }}>
            <Icon name="close" size={17} />
          </button>
          <button
            type="button"
            onClick={removeDigit}
            disabled={unlocking || digits.length === 0}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #e0e6e0",
              background: unlocking || digits.length === 0 ? "#e8eae9" : "white",
              fontSize: 17,
              cursor: unlocking || digits.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Icon name="chevron" size={17} />
          </button>
        </div>
        <div style={{ width: "100%" }}>
          <Button
            type="submit"
            onClick={handleUnlock}
            disabled={unlocking || !isComplete}
            className="lock-unlock-button"
          >
            {unlocking ? "Unlocking…" : "Unlock"}
          </Button>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#8a9795" }}>
          PIN: {CORRECT_PIN} (demo)
        </p>
      </div>
    </div>
  );
}
