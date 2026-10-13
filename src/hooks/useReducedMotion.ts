import { useEffect, useState } from 'react';

const STORAGE_KEY = 'reduceAnimations';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return JSON.parse(stored);
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        setReduced(e.matches);
      }
    };
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  const setReducedMotion = (value: boolean) => {
    setReduced(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  };

  return reduced;
}

export function useReducedMotionSetter(): (value: boolean) => void {
  const [, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return JSON.parse(stored);
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  return (value: boolean) => {
    setReduced(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  };
}