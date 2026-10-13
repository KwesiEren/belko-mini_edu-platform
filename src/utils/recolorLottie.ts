export function recolorLottie(
  animation: Record<string, unknown>,
  color: string,
  fallbackColor = '#6b7b7a'
): Record<string, unknown> {
  if (!animation || !animation.layers) {
    return animation;
  }

  const targetColor = color || fallbackColor;
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r / 255, g / 255, b / 255];
  };

  const [tr, tg, tb] = hexToRgb(targetColor);

  const walk = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(walk);
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        (key === 'c' || key === 'sc' || key === 'fc' || key === 'kc') &&
        Array.isArray(value) &&
        value.length >= 3 &&
        typeof value[0] === 'number'
      ) {
        result[key] = [tr, tg, tb, ...value.slice(3)];
      } else {
        result[key] = walk(value);
      }
    }
    return result;
  };

  return walk(animation) as Record<string, unknown>;
}

export function getSchoolPrimaryColor(): string {
  try {
    const stored = localStorage.getItem('schoolSettings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings?.primaryColor) {
        return settings.primaryColor;
      }
    }
  } catch {
    // ignore parse errors
  }
  return '#d8ed88';
}