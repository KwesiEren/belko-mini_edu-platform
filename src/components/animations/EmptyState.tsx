import { LottieAnimation } from './LottieAnimation';
import { Icon } from '../Icon';

interface EmptyStateProps {
  type: 'students' | 'attendance' | 'fees';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const animationMap: Record<EmptyStateProps['type'], string> = {
  students: 'empty-students',
  attendance: 'empty-attendance',
  fees: 'empty-fees',
};

const iconMap: Record<EmptyStateProps['type'], string> = {
  students: 'students',
  attendance: 'attendance',
  fees: 'fees',
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const animationKey = animationMap[type];
  const iconName = iconMap[type];

  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: '16px',
        minHeight: '200px',
      }}
    >
      <div style={{ width: '120px', height: '120px', flexShrink: 0 }}>
        <LottieAnimation keyName={animationKey} loop style={{ width: '100%', height: '100%' }} />
      </div>
      <div>
        <h3 style={{ margin: '0 0 8px', color: '#183237', fontSize: '18px', fontWeight: 600 }}>
          {title}
        </h3>
        <p style={{ margin: 0, color: '#748482', fontSize: '13px', lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="button button-primary"
          style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Icon name="plus" size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}