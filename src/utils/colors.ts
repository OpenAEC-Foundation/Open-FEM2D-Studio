export function getStressColor(value: number, min: number, max: number): string {
  if (max === min) return 'rgb(0, 128, 255)';

  const normalized = (value - min) / (max - min);

  // Blue -> Cyan -> Green -> Yellow -> Red
  let r: number, g: number, b: number;

  if (normalized < 0.25) {
    const t = normalized / 0.25;
    r = 0;
    g = Math.round(255 * t);
    b = 255;
  } else if (normalized < 0.5) {
    const t = (normalized - 0.25) / 0.25;
    r = 0;
    g = 255;
    b = Math.round(255 * (1 - t));
  } else if (normalized < 0.75) {
    const t = (normalized - 0.5) / 0.25;
    r = Math.round(255 * t);
    g = 255;
    b = 0;
  } else {
    const t = (normalized - 0.75) / 0.25;
    r = 255;
    g = Math.round(255 * (1 - t));
    b = 0;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export function generateColorScale(min: number, max: number, steps: number = 10): { value: number; color: string }[] {
  const scale: { value: number; color: string }[] = [];

  for (let i = 0; i <= steps; i++) {
    const value = min + (max - min) * (i / steps);
    const color = getStressColor(value, min, max);
    scale.push({ value, color });
  }

  return scale;
}

export function formatStress(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(2)} GPa`;
  } else if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(2)} MPa`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(2)} kPa`;
  }
  return `${value.toFixed(2)} Pa`;
}

export function formatMomentPerLength(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(2)} MNm/m`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(2)} kNm/m`;
  }
  return `${value.toFixed(2)} Nm/m`;
}

export function formatForcePerLength(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(2)} MN/m`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(2)} kN/m`;
  }
  return `${value.toFixed(2)} N/m`;
}

/** Format a result value using the appropriate unit for the given stress type */
export function formatResultValue(value: number, stressType: string): string {
  switch (stressType) {
    case 'mx': case 'my': case 'mxy':
      return formatMomentPerLength(value);
    case 'vx': case 'vy':
    case 'nx': case 'ny': case 'nxy':
      return formatForcePerLength(value);
    default:
      return formatStress(value);
  }
}

export function formatDisplacement(value: number): string {
  // Always display in mm for structural engineering convention
  const mm = value * 1e3;
  const absMm = Math.abs(mm);

  if (absMm >= 100) {
    return `${mm.toFixed(1)} mm`;
  } else if (absMm >= 1) {
    return `${mm.toFixed(2)} mm`;
  } else if (absMm >= 0.01) {
    return `${mm.toFixed(3)} mm`;
  }
  return `${mm.toFixed(4)} mm`;
}
