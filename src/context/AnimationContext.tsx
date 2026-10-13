import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useReducedMotion, useReducedMotionSetter } from '../hooks/useReducedMotion';

interface AnimationContextValue {
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  animationSpeed: number;
  setAnimationSpeed: (speed: number) => void;
}

const AnimationContext = createContext<AnimationContextValue | undefined>(undefined);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const setReducedMotion = useReducedMotionSetter();
  const [animationSpeed, setAnimationSpeed] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const stored = localStorage.getItem('animationSpeed');
    return stored ? parseFloat(stored) : 1;
  });

  useEffect(() => {
    localStorage.setItem('animationSpeed', String(animationSpeed));
  }, [animationSpeed]);

  return (
    <AnimationContext.Provider
      value={{
        reducedMotion,
        setReducedMotion,
        animationSpeed,
        setAnimationSpeed,
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within AnimationProvider');
  }
  return context;
}