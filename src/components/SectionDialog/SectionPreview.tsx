interface SectionPreviewProps {
  shapeType: 'I' | 'rectangular' | 'hollow' | 'circular' | 'CHS';
  h: number;   // mm
  b: number;   // mm
  tf?: number; // mm (flange thickness for I-profiles)
  tw?: number; // mm (web thickness / wall thickness)
  // Section properties for summary display
  sectionProps?: {
    A?: number;   // m^2
    Iy?: number;  // m^4
    Iz?: number;  // m^4
    Wy?: number;  // m^3
    Wz?: number;  // m^3
  };
}

function formatSci(val: number): string {
  if (val === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(val)));
  const mantissa = val / Math.pow(10, exp);
  return `${mantissa.toFixed(2)}e${exp}`;
}

export function SectionPreview({ shapeType, h, b, tf = 0, tw = 0, sectionProps }: SectionPreviewProps) {
  const padding = 24;
  const svgW = 220;
  const svgH = 220;

  const dimColor = '#8b949e';
  const shapeColor = '#60a5fa';
  const shapeFillSolid = '#b8d4f0';
  const annotColor = '#f0883e';

  // For circular/CHS, treat h as diameter D
  if (shapeType === 'circular') {
    const D = h;
    const maxDim = D;
    const available = Math.min(svgW, svgH) - 2 * padding - 40;
    const scale = available / maxDim;
    const sr = (D / 2) * scale;
    const cx = svgW / 2;
    const cy = svgH / 2;

    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <circle cx={cx} cy={cy} r={sr} fill={shapeFillSolid} stroke={shapeColor} strokeWidth="1.5" opacity="0.4" />
        <circle cx={cx} cy={cy} r={sr} fill="none" stroke={shapeColor} strokeWidth="1.5" />

        {/* Diameter dimension (horizontal) */}
        <line x1={cx - sr} y1={cy + sr + 15} x2={cx + sr} y2={cy + sr + 15} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx - sr} y1={cy + sr + 10} x2={cx - sr} y2={cy + sr + 20} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sr} y1={cy + sr + 10} x2={cx + sr} y2={cy + sr + 20} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx - 12} y={cy + sr + 30} fill={annotColor} fontSize="9" fontWeight="600" fontFamily="sans-serif">D={D}</text>

        {/* Properties summary */}
        {sectionProps && (
          <g>
            <text x={4} y={svgH - 4} fill={dimColor} fontSize="8" fontFamily="monospace">
              A={formatSci(sectionProps.A ?? 0)} m²
            </text>
          </g>
        )}
      </svg>
    );
  }

  if (shapeType === 'CHS') {
    const D = h;
    const t = tw || 5;
    const maxDim = D;
    const available = Math.min(svgW, svgH) - 2 * padding - 40;
    const scale = available / maxDim;
    const sr = (D / 2) * scale;
    const st = t * scale;
    const cx = svgW / 2;
    const cy = svgH / 2;

    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Outer circle with fill */}
        <circle cx={cx} cy={cy} r={sr} fill={shapeFillSolid} stroke={shapeColor} strokeWidth="1.5" opacity="0.4" />
        <circle cx={cx} cy={cy} r={sr} fill="none" stroke={shapeColor} strokeWidth="1.5" />
        {/* Inner hollow */}
        <circle cx={cx} cy={cy} r={Math.max(sr - st, 1)} fill="var(--bg-primary, #0d1117)" stroke={shapeColor} strokeWidth="0.8" strokeDasharray="3,2" />

        {/* Diameter dimension */}
        <line x1={cx - sr} y1={cy + sr + 15} x2={cx + sr} y2={cy + sr + 15} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx - sr} y1={cy + sr + 10} x2={cx - sr} y2={cy + sr + 20} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sr} y1={cy + sr + 10} x2={cx + sr} y2={cy + sr + 20} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx - 12} y={cy + sr + 30} fill={annotColor} fontSize="9" fontWeight="600" fontFamily="sans-serif">D={D}</text>

        {/* Wall thickness annotation */}
        <line x1={cx + sr - st} y1={cy - sr - 5} x2={cx + sr} y2={cy - sr - 5} stroke={annotColor} strokeWidth="0.8" />
        <text x={cx + sr + 4} y={cy - sr - 1} fill={annotColor} fontSize="8" fontWeight="600" fontFamily="sans-serif">t={t}</text>

        {sectionProps && (
          <g>
            <text x={4} y={svgH - 4} fill={dimColor} fontSize="8" fontFamily="monospace">
              A={formatSci(sectionProps.A ?? 0)} m²
            </text>
          </g>
        )}
      </svg>
    );
  }

  // Scale factor for rectangular-based shapes
  const maxDim = Math.max(h, b);
  const available = Math.min(svgW, svgH) - 2 * padding - 40;
  const scale = available / maxDim;
  const sw = b * scale;
  const sh = h * scale;
  const cx = svgW / 2;
  const cy = svgH / 2;

  if (shapeType === 'I') {
    const stf = (tf || 10) * scale;
    const stw = (tw || 6) * scale;

    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Top flange */}
        <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={stf} fill={shapeFillSolid} stroke={shapeColor} strokeWidth="1.5" opacity="0.4" />
        <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={stf} fill="none" stroke={shapeColor} strokeWidth="1.5" />
        {/* Web */}
        <rect x={cx - stw / 2} y={cy - sh / 2 + stf} width={stw} height={sh - 2 * stf} fill={shapeFillSolid} stroke={shapeColor} strokeWidth="1.5" opacity="0.4" />
        <rect x={cx - stw / 2} y={cy - sh / 2 + stf} width={stw} height={sh - 2 * stf} fill="none" stroke={shapeColor} strokeWidth="1.5" />
        {/* Bottom flange */}
        <rect x={cx - sw / 2} y={cy + sh / 2 - stf} width={sw} height={stf} fill={shapeFillSolid} stroke={shapeColor} strokeWidth="1.5" opacity="0.4" />
        <rect x={cx - sw / 2} y={cy + sh / 2 - stf} width={sw} height={stf} fill="none" stroke={shapeColor} strokeWidth="1.5" />

        {/* Height dimension (right side) */}
        <line x1={cx + sw / 2 + 15} y1={cy - sh / 2} x2={cx + sw / 2 + 15} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2 + 10} y1={cy - sh / 2} x2={cx + sw / 2 + 20} y2={cy - sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2 + 10} y1={cy + sh / 2} x2={cx + sw / 2 + 20} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx + sw / 2 + 22} y={cy + 3} fill={annotColor} fontSize="9" fontWeight="600" fontFamily="sans-serif">h={h}</text>

        {/* Width dimension (bottom) */}
        <line x1={cx - sw / 2} y1={cy + sh / 2 + 15} x2={cx + sw / 2} y2={cy + sh / 2 + 15} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx - sw / 2} y1={cy + sh / 2 + 10} x2={cx - sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2} y1={cy + sh / 2 + 10} x2={cx + sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx - 12} y={cy + sh / 2 + 28} fill={annotColor} fontSize="9" fontWeight="600" fontFamily="sans-serif">b={b}</text>

        {/* Flange thickness annotation (left side, top flange) */}
        {tf > 0 && (
          <>
            <line x1={cx - sw / 2 - 15} y1={cy - sh / 2} x2={cx - sw / 2 - 15} y2={cy - sh / 2 + stf} stroke={annotColor} strokeWidth="0.8" />
            <line x1={cx - sw / 2 - 20} y1={cy - sh / 2} x2={cx - sw / 2 - 10} y2={cy - sh / 2} stroke={annotColor} strokeWidth="0.8" />
            <line x1={cx - sw / 2 - 20} y1={cy - sh / 2 + stf} x2={cx - sw / 2 - 10} y2={cy - sh / 2 + stf} stroke={annotColor} strokeWidth="0.8" />
            <text x={cx - sw / 2 - 38} y={cy - sh / 2 + stf / 2 + 3} fill={annotColor} fontSize="7" fontWeight="600" fontFamily="sans-serif">tf={tf}</text>
          </>
        )}

        {/* Web thickness annotation (center) */}
        {tw > 0 && (
          <>
            <line x1={cx - stw / 2} y1={cy - 6} x2={cx + stw / 2} y2={cy - 6} stroke={annotColor} strokeWidth="0.8" />
            <text x={cx - 14} y={cy - 9} fill={annotColor} fontSize="7" fontWeight="600" fontFamily="sans-serif">tw={tw}</text>
          </>
        )}

        {sectionProps && (
          <g>
            <text x={4} y={svgH - 4} fill={dimColor} fontSize="8" fontFamily="monospace">
              A={formatSci(sectionProps.A ?? 0)} m²
            </text>
          </g>
        )}
      </svg>
    );
  }

  if (shapeType === 'hollow') {
    const wallT = (tw || 6) * scale;
    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Outer rectangle */}
        <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} fill={shapeFillSolid} stroke={shapeColor} strokeWidth="1.5" opacity="0.4" />
        <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} fill="none" stroke={shapeColor} strokeWidth="1.5" />
        {/* Inner hollow */}
        <rect x={cx - sw / 2 + wallT} y={cy - sh / 2 + wallT} width={sw - 2 * wallT} height={sh - 2 * wallT} fill="var(--bg-primary, #0d1117)" stroke={shapeColor} strokeWidth="0.8" strokeDasharray="3,2" />

        {/* Height dimension (right) */}
        <line x1={cx + sw / 2 + 15} y1={cy - sh / 2} x2={cx + sw / 2 + 15} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2 + 10} y1={cy - sh / 2} x2={cx + sw / 2 + 20} y2={cy - sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2 + 10} y1={cy + sh / 2} x2={cx + sw / 2 + 20} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx + sw / 2 + 22} y={cy + 3} fill={annotColor} fontSize="9" fontWeight="600" fontFamily="sans-serif">h={h}</text>

        {/* Width dimension (bottom) */}
        <line x1={cx - sw / 2} y1={cy + sh / 2 + 15} x2={cx + sw / 2} y2={cy + sh / 2 + 15} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx - sw / 2} y1={cy + sh / 2 + 10} x2={cx - sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
        <line x1={cx + sw / 2} y1={cy + sh / 2 + 10} x2={cx + sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
        <text x={cx - 12} y={cy + sh / 2 + 28} fill={annotColor} fontSize="9" fontWeight="600" fontFamily="sans-serif">b={b}</text>

        {/* Wall thickness annotation */}
        {tw > 0 && (
          <>
            <line x1={cx - sw / 2} y1={cy - sh / 2 - 8} x2={cx - sw / 2 + wallT} y2={cy - sh / 2 - 8} stroke={annotColor} strokeWidth="0.8" />
            <text x={cx - sw / 2 + wallT + 3} y={cy - sh / 2 - 5} fill={annotColor} fontSize="7" fontWeight="600" fontFamily="sans-serif">t={tw}</text>
          </>
        )}

        {sectionProps && (
          <g>
            <text x={4} y={svgH - 4} fill={dimColor} fontSize="8" fontFamily="monospace">
              A={formatSci(sectionProps.A ?? 0)} m²
            </text>
          </g>
        )}
      </svg>
    );
  }

  // Rectangular (default)
  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} fill={shapeFillSolid} stroke={shapeColor} strokeWidth="1.5" opacity="0.4" />
      <rect x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} fill="none" stroke={shapeColor} strokeWidth="1.5" />
      {/* Diagonal hatch */}
      <line x1={cx - sw / 2} y1={cy - sh / 2} x2={cx + sw / 2} y2={cy + sh / 2} stroke={shapeColor} strokeWidth="0.5" opacity="0.2" />
      <line x1={cx + sw / 2} y1={cy - sh / 2} x2={cx - sw / 2} y2={cy + sh / 2} stroke={shapeColor} strokeWidth="0.5" opacity="0.2" />

      {/* Height dimension (right) */}
      <line x1={cx + sw / 2 + 15} y1={cy - sh / 2} x2={cx + sw / 2 + 15} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
      <line x1={cx + sw / 2 + 10} y1={cy - sh / 2} x2={cx + sw / 2 + 20} y2={cy - sh / 2} stroke={dimColor} strokeWidth="0.8" />
      <line x1={cx + sw / 2 + 10} y1={cy + sh / 2} x2={cx + sw / 2 + 20} y2={cy + sh / 2} stroke={dimColor} strokeWidth="0.8" />
      <text x={cx + sw / 2 + 22} y={cy + 3} fill={annotColor} fontSize="9" fontWeight="600" fontFamily="sans-serif">h={h}</text>

      {/* Width dimension (bottom) */}
      <line x1={cx - sw / 2} y1={cy + sh / 2 + 15} x2={cx + sw / 2} y2={cy + sh / 2 + 15} stroke={dimColor} strokeWidth="0.8" />
      <line x1={cx - sw / 2} y1={cy + sh / 2 + 10} x2={cx - sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
      <line x1={cx + sw / 2} y1={cy + sh / 2 + 10} x2={cx + sw / 2} y2={cy + sh / 2 + 20} stroke={dimColor} strokeWidth="0.8" />
      <text x={cx - 12} y={cy + sh / 2 + 28} fill={annotColor} fontSize="9" fontWeight="600" fontFamily="sans-serif">b={b}</text>

      {sectionProps && (
        <g>
          <text x={4} y={svgH - 4} fill={dimColor} fontSize="8" fontFamily="monospace">
            A={formatSci(sectionProps.A ?? 0)} m²
          </text>
        </g>
      )}
    </svg>
  );
}
