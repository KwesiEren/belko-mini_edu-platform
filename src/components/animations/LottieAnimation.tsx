import { useEffect, useRef, useState, memo } from 'react';
import { Lottie } from 'lottie-react';
import { useAnimation } from '../../context/AnimationContext';
import { recolorLottie, getSchoolPrimaryColor } from '../../utils/recolorLottie';
import { getAnimationMeta } from '../../utils/animationRegistry';

// Pre-import all animation files to satisfy Vite's static analysis
import boxesUnloading from '../../assets/animations/boxes-unloading.json';
import packageBoxTracking from '../../assets/animations/package-box-tracking.json';
import conveyorBeltUnloading from '../../assets/animations/conveyor-belt-unloading.json';
import successfulAnimation from '../../assets/animations/successful-animation.json';
import cloudDataBackup from '../../assets/animations/cloud-data-backup.json';
import digitalNetworking from '../../assets/animations/digital-networking.json';
import questions from '../../assets/animations/questions.json';
import secureDocument from '../../assets/animations/secure-document.json';
import emailSent from '../../assets/animations/email-sent.json';
import radioTowerSignal from '../../assets/animations/radio-tower-signal.json';
import wirelessCharger from '../../assets/animations/wireless-charger.json';
import securityPock from '../../assets/animations/security-pock.json';

const animationModules: Record<string, Record<string, unknown>> = {
  'boxes-unloading.json': boxesUnloading,
  'package-box-tracking.json': packageBoxTracking,
  'conveyor-belt-unloading.json': conveyorBeltUnloading,
  'successful-animation.json': successfulAnimation,
  'cloud-data-backup.json': cloudDataBackup,
  'digital-networking.json': digitalNetworking,
  'questions.json': questions,
  'secure-document.json': secureDocument,
  'email-sent.json': emailSent,
  'radio-tower-signal.json': radioTowerSignal,
  'wireless-charger.json': wirelessCharger,
  'security-pock.json': securityPock,
};

interface LottieAnimationProps {
  keyName: string;
  className?: string;
  style?: React.CSSProperties;
  loop?: boolean;
  autoplay?: boolean;
  onComplete?: () => void;
  recolor?: boolean;
  speed?: number;
}

export const LottieAnimation = memo(function LottieAnimation({
  keyName,
  className = '',
  style,
  loop,
  autoplay = true,
  onComplete,
  recolor = true,
  speed = 1,
}: LottieAnimationProps) {
  const { reducedMotion, animationSpeed } = useAnimation();
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const lottieRef = useRef<Lottie>(null);
  const meta = getAnimationMeta(keyName);
  const effectiveLoop = loop ?? meta?.defaultLoop ?? false;
  const effectiveSpeed = speed * animationSpeed;

  useEffect(() => {
    if (reducedMotion) {
      setAnimationData(null);
      return;
    }

    let cancelled = false;
    const fileName = meta?.fileName;
    const loadAnimation = async () => {
      try {
        const data = animationModules[fileName];
        if (!data) {
          throw new Error(`Animation not found: ${fileName}`);
        }
        let processedData = data;
        if (recolor) {
          const schoolColor = getSchoolPrimaryColor();
          processedData = recolorLottie(data, schoolColor);
        }
        if (!cancelled) {
          setAnimationData(processedData);
          setLoadError(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setAnimationData(null);
        }
      }
    };

    loadAnimation();
    return () => {
      cancelled = true;
    };
  }, [keyName, recolor, reducedMotion]);

  useEffect(() => {
    if (lottieRef.current && animationData) {
      lottieRef.current.goToAndPlay(0, true);
    }
  }, [animationData, autoplay]);

  const handleComplete = () => {
    if (!effectiveLoop) {
      onComplete?.();
    }
  };

  const handleVisibilityChange = () => {
    if (!lottieRef.current) return;
    if (document.hidden) {
      lottieRef.current.pause();
    } else if (autoplay && !reducedMotion) {
      lottieRef.current.play();
    }
  };

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoplay, reducedMotion]);

  if (reducedMotion || loadError || !animationData) {
    return (
      <div
        className={`lottie-placeholder ${className}`}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <Lottie
      ref={lottieRef}
      animationData={animationData}
      loop={effectiveLoop}
      autoplay={autoplay}
      style={{
        width: '100%',
        height: '100%',
        ...style,
      }}
      className={className}
      speed={effectiveSpeed}
      onComplete={handleComplete}
      aria-hidden="true"
    />
  );
});

LottieAnimation.displayName = 'LottieAnimation';