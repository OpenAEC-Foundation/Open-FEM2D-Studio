import { useState } from 'react';
import './LineLoadDialog.css';

interface LineLoadDialogProps {
  initialQx: number;
  initialQy: number;
  initialStartT?: number;
  initialEndT?: number;
  initialCoordSystem?: 'local' | 'global';
  loadCases: { id: number; name: string }[];
  activeLoadCase: number;
  onApply: (qx: number, qy: number, lcId: number, startT: number, endT: number, coordSystem: 'local' | 'global') => void;
  onCancel: () => void;
}

export function LineLoadDialog({
  initialQx,
  initialQy,
  initialStartT,
  initialEndT,
  initialCoordSystem,
  loadCases,
  activeLoadCase,
  onApply,
  onCancel,
}: LineLoadDialogProps) {
  const [qy, setQy] = useState((initialQy / 1000).toString());
  const [qx, setQx] = useState((initialQx / 1000).toString());
  const [selectedLC, setSelectedLC] = useState(activeLoadCase);
  const [startT, setStartT] = useState((initialStartT ?? 0).toString());
  const [endT, setEndT] = useState((initialEndT ?? 1).toString());
  const [coordSystem, setCoordSystem] = useState<'local' | 'global'>(initialCoordSystem ?? 'local');

  const handleApply = () => {
    const valQy = parseFloat(qy);
    const valQx = parseFloat(qx);
    const valStartT = parseFloat(startT);
    const valEndT = parseFloat(endT);
    if (!isNaN(valQy)) {
      onApply(
        isNaN(valQx) ? 0 : valQx * 1000,
        valQy * 1000,
        selectedLC,
        isNaN(valStartT) ? 0 : Math.max(0, Math.min(1, valStartT)),
        isNaN(valEndT) ? 1 : Math.max(0, Math.min(1, valEndT)),
        coordSystem,
      );
    }
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
          <label>
            <span>qz (kN/m)</span>
            <input
              type="text"
              value={qy}
              onChange={e => setQy(e.target.value)}
              autoFocus
              onFocus={e => e.target.select()}
              onKeyDown={e => {
                if (e.key === 'Enter') handleApply();
                if (e.key === 'Escape') onCancel();
              }}
            />
          </label>
          <label>
            <span>qx (kN/m)</span>
            <input
              type="text"
              value={qx}
              onChange={e => setQx(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleApply();
                if (e.key === 'Escape') onCancel();
              }}
            />
          </label>
          <p className="line-load-hint">Negative qz = downward (e.g. -5 kN/m)</p>

          <div className="line-load-subsection">
            <span className="line-load-subsection-title">Partial Load</span>
            <div className="line-load-row">
              <label>
                <span>Start Position (0-1)</span>
                <input
                  type="text"
                  value={startT}
                  onChange={e => setStartT(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleApply();
                    if (e.key === 'Escape') onCancel();
                  }}
                />
              </label>
              <label>
                <span>End Position (0-1)</span>
                <input
                  type="text"
                  value={endT}
                  onChange={e => setEndT(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleApply();
                    if (e.key === 'Escape') onCancel();
                  }}
                />
              </label>
            </div>
            <p className="line-load-hint">Start/End position along beam (0 = start, 1 = end)</p>
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
                <span>Local</span>
              </label>
              <label className="line-load-radio-label">
                <input
                  type="radio"
                  name="coordSystem"
                  value="global"
                  checked={coordSystem === 'global'}
                  onChange={() => setCoordSystem('global')}
                />
                <span>Global</span>
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
