interface SectionPreviewProps {
  shapeType: 'I' | 'rectangular' | 'hollow';
  h: number;   // mm
  b: number;   // mm
  tf?: number; // mm (flange thickness for I-profiles)
  tw?: number; // mm (web thickness)
}

export function SectionPreview({ shapeType, h, b, tf = 0, tw = 0 }: SectionPreviewProps) {
  const padding = 20;
  const svgW = 200;
  const svgH = 200;

  // Scale factor to fit shape within SVG
  const maxDim = Math.max(h, b);
  const available = Math.min(svgW, svgH) - 2 * padding - 40; // leave room for dims
  const scale = available / maxDim;

  const sw = b * scale;  // scaled width
  const sh = h * scale;  // scaled height
  const cx = svgW / 2;
  const cy = svgH / 2;

  const dimColor = '#8b949e';
  const shapeColor = '#60a5fa';
  const shapeFill = 'rgba(96, 165, 250, 0.15)';

  if (shapeType === 'I') {
    const stf = (tf || 10) * scale;
    const stw = (tw || 6) * scale;

    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Top flange */}
        <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={stf} fill={shapeFill} stroke={shapeColor} strokeWidth="1.5" />
        {/* Web */}
        <rect x={cx - stw / 2} y={cy - sh / 2 + stf} width={stw} height={sh - 2 * stf} fill={shapeFill} stroke={shapeColor} strokeWidth="1.5" />
        {/* Bottom flange */}
        <rect x={cx - sw / 2} y={cy + sh / 2 - stf} width={sw} height={stf} fill={shapeFill} stroke={shapeColor} strokeWidth="1.5" />

        {/* Height dimension (right side) */}
        <line x1={cx + sw / 2 + 15} y1={cy - sh / 2} x2={cx + sw / 2 + 15} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2 + 10} y1={cy - sh / 2} x2={cx + sw / 2 + 20} y2={cy - sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2 + 10} y1={cy + sh / 2} x2={cx + sw / 2 + 20} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx + sw / 2 + 22} y={cy + 3} fill={dimColor} fontSize="9" fontFamily="sans-serif">h={h}</text>

        {/* Width dimension (bottom) */}
        <line x1={cx - sw / 2} y1={cy + sh / 2 + 15} x2={cx + sw / 2} y2={cy + sh / 2 + 15} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx - sw / 2} y1={cy + sh / 2 + 10} x2={cx - sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2} y1={cy + sh / 2 + 10} x2={cx + sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx - 12} y={cy + sh / 2 + 28} fill={dimColor} fontSize="9" fontFamily="sans-serif">b={b}</text>
      </svg>
    );
  }

  if (shapeType === 'hollow') {
    const wallT = (tw || 6) * scale;
    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Outer rectangle */}
        <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} fill={shapeFill} stroke={shapeColor} strokeWidth="1.5" />
        {/* Inner hollow */}
        <rect x={cx - sw / 2 + wallT} y={cy - sh / 2 + wallT} width={sw - 2 * wallT} height={sh - 2 * wallT} fill="var(--bg-primary)" stroke={shapeColor} strokeWidth="0.8" strokeDasharray="3,2" />

        {/* Dimension lines */}
        <line x1={cx + sw / 2 + 15} y1={cy - sh / 2} x2={cx + sw / 2 + 15} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx + sw / 2 + 22} y={cy + 3} fill={dimColor} fontSize="9" fontFamily="sans-serif">h={h}</text>
        <line x1={cx - sw / 2} y1={cy + sh / 2 + 15} x2={cx + sw / 2} y2={cy + sh / 2 + 15} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx - 12} y={cy + sh / 2 + 28} fill={dimColor} fontSize="9" fontFamily="sans-serif">b={b}</text>
      </svg>
    );
  }

  // Rectangular (default)
  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} fill={shapeFill} stroke={shapeColor} strokeWidth="1.5" />
      {/* Diagonal hatch pattern */}
      <line x1={cx - sw / 2} y1={cy - sh / 2} x2={cx + sw / 2} y2={cy + sh / 2} stroke={shapeColor} strokeWidth="0.5" opacity="0.3" />
      <line x1={cx + sw / 2} y1={cy - sh / 2} x2={cx - sw / 2} y2={cy + sh / 2} stroke={shapeColor} strokeWidth="0.5" opacity="0.3" />

      {/* Dimension lines */}
      <line x1={cx + sw / 2 + 15} y1={cy - sh / 2} x2={cx + sw / 2 + 15} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
      <line x1={cx + sw / 2 + 10} y1={cy - sh / 2} x2={cx + sw / 2 + 20} y2={cy - sh / 2} stroke={dimColor} strokeWidth="0.8" />
      <line x1={cx + sw / 2 + 10} y1={cy + sh / 2} x2={cx + sw / 2 + 20} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
      <text x={cx + sw / 2 + 22} y={cy + 3} fill={dimColor} fontSize="9" fontFamily="sans-serif">h={h}</text>

      <line x1={cx - sw / 2} y1={cy + sh / 2 + 15} x2={cx + sw / 2} y2={cy + sh / 2 + 15} stroke={dimColor} strokeWidth="0.8" />
      <line x1={cx - sw / 2} y1={cy + sh / 2 + 10} x2={cx - sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
      <line x1={cx + sw / 2} y1={cy + sh / 2 + 10} x2={cx + sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
      <text x={cx - 12} y={cy + sh / 2 + 28} fill={dimColor} fontSize="9" fontFamily="sans-serif">b={b}</text>
    </svg>
  );
}
