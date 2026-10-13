import { LottieAnimation } from './LottieAnimation';

interface NetworkStatusAnimationProps {
  status: 'waiting' | 'connected' | 'disconnected';
  className?: string;
  size?: number;
  showQR?: boolean;
  qrCodeDataUrl?: string;
}

export function NetworkStatusAnimation({
  status,
  className = '',
  size = 100,
  showQR = false,
  qrCodeDataUrl,
}: NetworkStatusAnimationProps) {
  const isWaiting = status === 'waiting';
  const isConnected = status === 'connected';

  const animationKey = isWaiting ? 'network-waiting' : 'network-connected';
  const title = isWaiting ? 'Waiting for device…' : isConnected ? 'Device connected' : 'Disconnected';
  const description = isWaiting
    ? 'Open the Belko app on your phone and scan the QR code'
    : isConnected
    ? 'You can now work from your phone'
    : 'Connection lost. Please reconnect.';

  return (
    <div
      className={`network-status ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '32px',
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ width: size, height: size, flexShrink: 0 }}>
        <LottieAnimation keyName={animationKey} loop={isWaiting} style={{ width: '100%', height: '100%' }} />
      </div>
      <div>
        <h3 style={{ margin: '0 0 8px', color: '#183237', fontSize: '18px', fontWeight: 600 }}>
          {title}
        </h3>
        <p style={{ margin: 0, color: '#748482', fontSize: '13px', lineHeight: 1.5, maxWidth: '280px' }}>
          {description}
        </p>
      </div>
      {showQR && qrCodeDataUrl && isWaiting && (
        <div style={{ marginTop: '8px' }}>
          <img
            src={qrCodeDataUrl}
            alt="QR code for network connection"
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '12px',
              border: '1px solid #e0e6e0',
              background: 'white',
              padding: '12px',
              boxShadow: '0 4px 18px #183a2c08',
            }}
          />
          <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#8a9795' }}>
            Scan with Belko mobile app
          </p>
        </div>
      )}
    </div>
  );
}