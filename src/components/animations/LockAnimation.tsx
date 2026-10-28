import { LottieAnimation } from './LottieAnimation';
import { Icon } from '../Icon';

interface LockAnimationProps {
  message?: string;
  className?: string;
  size?: number;
  onUnlock?: () => void;
}

export function LockAnimation({
  message = 'Your work is saved. Enter your PIN to unlock.',
  className = '',
  size = 100,
  onUnlock,
}: LockAnimationProps) {
  return (
    <div
      className={`lock-animation ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '32px',
        textAlign: 'center',
        minHeight: '300px',
      }}
    >
      <div style={{ width: size, height: size, flexShrink: 0 }}>
        <LottieAnimation keyName="lock-screen" style={{ width: '100%', height: '100%' }} />
      </div>
      <div>
        <div style={{ color: '#2d827b', marginBottom: '12px' }}>
          <Icon name="shield" size={28} />
        </div>
        <p style={{ margin: '0 0 8px', color: '#183237', fontSize: '16px', fontWeight: 600 }}>
          Screen Locked
        </p>
        <p style={{ margin: 0, color: '#748482', fontSize: '13px', maxWidth: '280px' }}>
          {message}
        </p>
      </div>
      {onUnlock && (
        <button
          type="button"
          onClick={onUnlock}
          className="button button-primary"
          style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Icon name="arrow" size={17} />
          Unlock
        </button>
      )}
    </div>
  );
}

export function LockScreenOverlay({
  isLocked,
  onUnlock,
  message,
}: {
  isLocked: boolean;
  onUnlock: () => void;
  message?: string;
}) {
  if (!isLocked) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(16, 45, 50, 0.95)',
        backdropFilter: 'blur(4px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Screen locked"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px',
          borderRadius: '16px',
          background: '#fafbf9',
          boxShadow: '0 20px 60px #102d3255',
        }}
      >
        <LockAnimation message={message} onUnlock={onUnlock} size={120} />
      </div>
    </div>
  );
}