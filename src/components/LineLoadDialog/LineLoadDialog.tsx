import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import './LineLoadDialog.css';

interface LineLoadDialogProps {
  initialQx: number;
  initialQy: number;
  initialQxEnd?: number;
  initialQyEnd?: number;
  initialStartT?: number;
  initialEndT?: number;
  initialCoordSystem?: 'local' | 'global';
  beamLength?: number; // beam length in meters
  loadCases: { id: number; name: string }[];
  activeLoadCase: number;
  onApply: (qx: number, qy: number, lcId: number, startT: number, endT: number, coordSystem: 'local' | 'global', qxEnd?: number, qyEnd?: number) => void;
  onCancel: () => void;
}

export function LineLoadDialog({
  initialQx,
  initialQy,
  initialQxEnd,
  initialQyEnd,
  initialStartT,
  initialEndT,
  initialCoordSystem,
  beamLength,
  loadCases,
  activeLoadCase,
  onApply,
  onCancel,
}: LineLoadDialogProps) {
  const [qy, setQy] = useState((initialQy / 1000).toString());
  const [qx, setQx] = useState((initialQx / 1000).toString());
  const [selectedLC, setSelectedLC] = useState(activeLoadCase);
  const [coordSystem, setCoordSystem] = useState<'local' | 'global'>(initialCoordSystem ?? 'local');

  // Variable load (trapezoidal): q1 = start, q2 = end
  const isInitiallyVariable = initialQyEnd !== undefined && initialQyEnd !== initialQy;
  const [variableUnlocked, setVariableUnlocked] = useState(isInitiallyVariable);
  const [qyEnd, setQyEnd] = useState(
    isInitiallyVariable ? ((initialQyEnd!) / 1000).toString() : (initialQy / 1000).toString()
  );
  const [qxEnd, setQxEnd] = useState(
    ((initialQxEnd ?? initialQx) / 1000).toString()
  );

  // Store positions as absolute mm values when beam length is known
  const L = beamLength ?? 1;
  const hasLength = beamLength !== undefined && beamLength > 0;
  const [startMm, setStartMm] = useState(
    hasLength ? ((initialStartT ?? 0) * L * 1000).toFixed(0) : (initialStartT ?? 0).toString()
  );
  const [loadLengthMm, setLoadLengthMm] = useState(
    hasLength
      ? (((initialEndT ?? 1) - (initialStartT ?? 0)) * L * 1000).toFixed(0)
      : ((initialEndT ?? 1) - (initialStartT ?? 0)).toString()
  );

  const handleApply = () => {
    const valQy = parseFloat(qy);
    const valQx = parseFloat(qx);
    let startT: number;
    let endT: number;

    if (hasLength) {
      const startVal = parseFloat(startMm);
      const lengthVal = parseFloat(loadLengthMm);
      startT = isNaN(startVal) ? 0 : Math.max(0, Math.min(1, (startVal / 1000) / L));
      endT = isNaN(lengthVal) ? 1 : Math.max(startT, Math.min(1, startT + (lengthVal / 1000) / L));
    } else {
      startT = parseFloat(startMm);
      endT = startT + parseFloat(loadLengthMm);
      if (isNaN(startT)) startT = 0;
      if (isNaN(endT)) endT = 1;
      startT = Math.max(0, Math.min(1, startT));
      endT = Math.max(startT, Math.min(1, endT));
    }

    if (!isNaN(valQy)) {
      const qxVal = isNaN(valQx) ? 0 : valQx * 1000;
      const qyVal = valQy * 1000;

      if (variableUnlocked) {
        const valQyEnd = parseFloat(qyEnd);
        const valQxEnd = parseFloat(qxEnd);
        onApply(
          qxVal,
          qyVal,
          selectedLC,
          startT,
          endT,
          coordSystem,
          isNaN(valQxEnd) ? qxVal : valQxEnd * 1000,
          isNaN(valQyEnd) ? qyVal : valQyEnd * 1000,
        );
      } else {
        onApply(qxVal, qyVal, selectedLC, startT, endT, coordSystem);
      }
    }
  };

  const keyHandler = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApply();
    if (e.key === 'Escape') onCancel();
  };

  const toggleVariable = () => {
    if (!variableUnlocked) {
      // Unlocking: initialize end values to match start values
      setQyEnd(qy);
      setQxEnd(qx);
    }
    setVariableUnlocked(!variableUnlocked);
  };

  return (
    <div className="line-load-dialog-overlay" onClick={onCancel}>
      <div className="line-load-dialog" onClick={e => e.stopPropagation()}>
        <div className="line-load-dialog-header">Distributed Load</div>
        <div className="line-load-dialog-body">
          <label>
            <span>Load Case</span>
            <select
              value={selectedLC}
              onChange={e => setSelectedLC(parseInt(e.target.value))}
            >
              {loadCases.map(lc => (
                <option key={lc.id} value={lc.id}>{lc.name}</option>
              ))}
            </select>
          </label>

          <div className="line-load-variable-section">
            <div className="line-load-variable-header">
              <span className="line-load-subsection-title">Load Intensity</span>
              <button
                className={`line-load-lock-btn ${variableUnlocked ? 'unlocked' : ''}`}
                onClick={toggleVariable}
                title={variableUnlocked ? 'Lock: uniform load' : 'Unlock: variable (trapezoidal) load'}
              >
                {variableUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
                <span>{variableUnlocked ? 'Variable' : 'Uniform'}</span>
              </button>
            </div>

            <div className="line-load-row">
              <label>
                <span>{variableUnlocked ? 'qz₁ (kN/m)' : 'qz (kN/m)'}</span>
                <input
                  type="text"
                  value={qy}
                  onChange={e => {
                    setQy(e.target.value);
                    if (!variableUnlocked) setQyEnd(e.target.value);
                  }}
                  autoFocus
                  onFocus={e => e.target.select()}
                  onKeyDown={keyHandler}
                />
              </label>
              {variableUnlocked && (
                <label>
                  <span>qz₂ (kN/m)</span>
                  <input
                    type="text"
                    value={qyEnd}
                    onChange={e => setQyEnd(e.target.value)}
                    onFocus={e => e.target.select()}
                    onKeyDown={keyHandler}
                  />
                </label>
              )}
            </div>

            <div className="line-load-row">
              <label>
                <span>{variableUnlocked ? 'qx₁ (kN/m)' : 'qx (kN/m)'}</span>
                <input
                  type="text"
                  value={qx}
                  onChange={e => {
                    setQx(e.target.value);
                    if (!variableUnlocked) setQxEnd(e.target.value);
                  }}
                  onKeyDown={keyHandler}
                />
              </label>
              {variableUnlocked && (
                <label>
                  <span>qx₂ (kN/m)</span>
                  <input
                    type="text"
                    value={qxEnd}
                    onChange={e => setQxEnd(e.target.value)}
                    onFocus={e => e.target.select()}
                    onKeyDown={keyHandler}
                  />
                </label>
              )}
            </div>
          </div>

          <p className="line-load-hint">Negative qz = downward (e.g. -5 kN/m){variableUnlocked ? '. ₁ = start, ₂ = end of beam.' : ''}</p>

          <div className="line-load-subsection">
            <span className="line-load-subsection-title">Load Position</span>
            <div className="line-load-row">
              <label>
                <span>{hasLength ? 'Start (mm)' : 'Start Position (0-1)'}</span>
                <input
                  type="text"
                  value={startMm}
                  onChange={e => setStartMm(e.target.value)}
                  onKeyDown={keyHandler}
                />
              </label>
              <label>
                <span>{hasLength ? 'Length (mm)' : 'Load Length (0-1)'}</span>
                <input
                  type="text"
                  value={loadLengthMm}
                  onChange={e => setLoadLengthMm(e.target.value)}
                  onKeyDown={keyHandler}
                />
              </label>
            </div>
            {hasLength && (
              <p className="line-load-hint">Beam length: {(L * 1000).toFixed(0)} mm</p>
            )}
          </div>

          <div className="line-load-subsection">
            <span className="line-load-subsection-title">Direction</span>
            <div className="line-load-radio-group">
              <label className="line-load-radio-label">
                <input
                  type="radio"
                  name="coordSystem"
                  value="local"
                  checked={coordSystem === 'local'}
                  onChange={() => setCoordSystem('local')}
                />
                <span>Perpendicular to beam</span>
              </label>
              <label className="line-load-radio-label">
                <input
                  type="radio"
                  name="coordSystem"
                  value="global"
                  checked={coordSystem === 'global'}
                  onChange={() => setCoordSystem('global')}
                />
                <span>Global Z-axis</span>
              </label>
            </div>
          </div>
        </div>
        <div className="line-load-dialog-footer">
          <button className="line-load-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="line-load-btn confirm" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
