import { useEffect, useState } from 'react';
import { LottieAnimation } from './LottieAnimation';
import { Icon } from '../Icon';

interface SaveConfirmationProps {
  message: string;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

export function SaveConfirmation({
  message,
  onClose,
  duration = 3000,
  className = '',
}: SaveConfirmationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 250);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`toast save-confirmation ${className}`}
      role="status"
      aria-live="polite"
    >
      <div style={{ width: '32px', height: '32px', flexShrink: 0 }}>
        <LottieAnimation keyName="save-success" style={{ width: '100%', height: '100%' }} />
      </div>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={() => { setVisible(false); onClose?.(); }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Dismiss"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

export function useSaveConfirmation() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);

  const show = (message: string, duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration + 300);
  };

  return { toasts, show };
}