import { LottieAnimation } from './LottieAnimation';

interface SetupStepAnimationProps {
  step: number;
  totalSteps: number;
  isComplete?: boolean;
  isFinal?: boolean;
  className?: string;
  size?: number;
}

export function SetupStepAnimation({
  step,
  totalSteps,
  isComplete = false,
  isFinal = false,
  className = '',
  size = 60,
}: SetupStepAnimationProps) {
  const progress = ((step + 1) / totalSteps) * 100;

  if (isFinal) {
    return (
      <div
        className={`setup-complete ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div style={{ width: size + 20, height: size + 20, flexShrink: 0 }}>
          <LottieAnimation keyName="setup-complete" style={{ width: '100%', height: '100%' }} />
        </div>
        <h3 style={{ margin: '0 0 8px', color: '#183237', fontSize: '22px', fontWeight: 600 }}>
          All Set!
        </h3>
        <p style={{ margin: 0, color: '#748482', fontSize: '14px', lineHeight: 1.5, maxWidth: '300px' }}>
          Belko is ready for your school. Click Finish to continue.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`setup-step-animation ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        textAlign: 'center',
      }}
    >
      <div style={{ width: size, height: size, flexShrink: 0 }}>
        <LottieAnimation keyName="setup-complete" style={{ width: '100%', height: '100%' }} />
      </div>
      <div
        style={{
          width: '100%',
          maxWidth: '300px',
          height: '4px',
          borderRadius: '99px',
          background: '#e2e7e1',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: 'inherit',
            background: '#2d827b',
            transition: 'width 0.35s ease',
          }}
        />
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#6b7b7a' }}>
        Step {step + 1} of {totalSteps}
      </p>
    </div>
  );
}