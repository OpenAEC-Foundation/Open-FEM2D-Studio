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

export function formatDisplacement(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1) {
    return `${value.toFixed(4)} m`;
  } else if (absValue >= 1e-3) {
    return `${(value * 1e3).toFixed(4)} mm`;
  } else if (absValue >= 1e-6) {
    return `${(value * 1e6).toFixed(4)} µm`;
  }
  return `${(value * 1e9).toFixed(4)} nm`;
}
