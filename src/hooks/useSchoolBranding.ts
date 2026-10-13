import { useEffect, useState } from 'react';

export interface SchoolBranding {
  primaryColor: string;
  schoolName: string;
  logo?: string;
}

const DEFAULT_COLOR = '#d8ed88';
const STORAGE_KEY = 'schoolSettings';

export function useSchoolBranding(): SchoolBranding {
  const [branding, setBranding] = useState<SchoolBranding>(() => {
    if (typeof window === 'undefined') {
      return { primaryColor: DEFAULT_COLOR, schoolName: '' };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          primaryColor: parsed.primaryColor || DEFAULT_COLOR,
          schoolName: parsed.schoolName || '',
          logo: parsed.logo,
        };
      }
    } catch {
      // ignore parse errors
    }
    return { primaryColor: DEFAULT_COLOR, schoolName: '' };
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setBranding({
            primaryColor: parsed.primaryColor || DEFAULT_COLOR,
            schoolName: parsed.schoolName || '',
            logo: parsed.logo,
          });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateBranding = (partial: Partial<SchoolBranding>) => {
    setBranding((prev) => {
      const next = { ...prev, ...partial };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  return { ...branding, updateBranding };
}

export function getSchoolPrimaryColor(): string {
  if (typeof window === 'undefined') return DEFAULT_COLOR;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.primaryColor || DEFAULT_COLOR;
    }
  } catch {
    // ignore
  }
  return DEFAULT_COLOR;
}