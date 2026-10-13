import { LottieAnimation } from './LottieAnimation';
import { Icon } from '../Icon';

interface WarningAlertProps {
  message: string;
  type?: 'warning' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
  persistent?: boolean;
}

export function WarningAlert({
  message,
  type = 'warning',
  actionLabel,
  onAction,
  onDismiss,
  className = '',
  persistent = false,
}: WarningAlertProps) {
  const bgColor = type === 'warning' ? '#fff8ed' : '#edf3ef';
  const borderColor = type === 'warning' ? '#f3c96d' : '#2d827b';
  const textColor = type === 'warning' ? '#a5702b' : '#24736f';
  const iconColor = type === 'warning' ? '#e7b654' : '#2d827b';

  return (
    <div
      className={`warning-alert ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        background: bgColor,
        color: textColor,
        fontSize: '13px',
        lineHeight: 1.5,
        maxWidth: '480px',
      }}
      role="alert"
    >
      <div style={{ width: '40px', height: '40px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LottieAnimation keyName="warning" loop style={{ width: '28px', height: '28px' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 12px' }}>{message}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="button button-secondary"
            style={{ minHeight: '32px', padding: '0 12px', fontSize: '10px' }}
          >
            {actionLabel}
          </button>
        )}
      </div>
      {!persistent && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
          }}
          aria-label="Dismiss"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}