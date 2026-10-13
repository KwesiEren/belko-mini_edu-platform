import { LottieAnimation } from './LottieAnimation';

interface ProgressAnimationProps {
  type: 'import' | 'export' | 'report' | 'backup';
  progress: number;
  recordCount?: number;
  totalRecords?: number;
  label?: string;
  className?: string;
  size?: number;
}

const animationMap: Record<ProgressAnimationProps['type'], string> = {
  import: 'import-progress',
  export: 'export-progress',
  report: 'report-progress',
  backup: 'import-progress',
};

const labelMap: Record<ProgressAnimationProps['type'], string> = {
  import: 'Importing students…',
  export: 'Exporting data…',
  report: 'Generating report cards…',
  backup: 'Creating backup…',
};

export function ProgressAnimation({
  type,
  progress,
  recordCount,
  totalRecords,
  label,
  className = '',
  size = 80,
}: ProgressAnimationProps) {
  const animationKey = animationMap[type];
  const defaultLabel = labelMap[type];
  const displayLabel = label || defaultLabel;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={`progress-animation ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ width: size, height: size, flexShrink: 0 }}>
        <LottieAnimation keyName={animationKey} loop style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
          <span style={{ color: '#30484b', fontWeight: 600 }}>{displayLabel}</span>
          <span style={{ color: '#6b7b7a' }}>{Math.round(clampedProgress)}%</span>
        </div>
        <div
          style={{
            height: '8px',
            borderRadius: '99px',
            background: '#e7ece6',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${clampedProgress}%`,
              borderRadius: 'inherit',
              background: '#2d827b',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        {(recordCount !== undefined || totalRecords !== undefined) && (
          <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#82908e' }}>
            {recordCount !== undefined ? `Processed: ${recordCount.toLocaleString()}` : ''}
            {totalRecords !== undefined && recordCount !== undefined ? ' / ' : ''}
            {totalRecords !== undefined ? `Total: ${totalRecords.toLocaleString()}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}