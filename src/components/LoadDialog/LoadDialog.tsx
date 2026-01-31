import { useState } from 'react';
import { ILoadCase } from '../../core/fem/LoadCase';
import './LoadDialog.css';

interface LoadDialogProps {
  initialFx: number;
  initialFy: number;
  initialMoment: number;
  loadCases: ILoadCase[];
  activeLoadCase: number;
  onApply: (fx: number, fy: number, moment: number, lcId: number) => void;
  onCancel: () => void;
}

export function LoadDialog({ initialFx, initialFy, initialMoment, loadCases, activeLoadCase, onApply, onCancel }: LoadDialogProps) {
  // Display in kN / kNm
  const [fx, setFx] = useState((initialFx / 1000).toString());
  const [fz, setFz] = useState((initialFy / 1000).toString());
  const [moment, setMoment] = useState((initialMoment / 1000).toString());
  const [selectedLC, setSelectedLC] = useState(activeLoadCase);

  const handleApply = () => {
    const fxVal = parseFloat(fx);
    const fzVal = parseFloat(fz);
    const mVal = parseFloat(moment);
    if (isNaN(fxVal) || isNaN(fzVal) || isNaN(mVal)) return;
    // Convert back to N / Nm
    onApply(fxVal * 1000, fzVal * 1000, mVal * 1000, selectedLC);
  };

  return (
    <div className="load-dialog-overlay" onClick={onCancel}>
      <div className="load-dialog" onClick={e => e.stopPropagation()}>
        <div className="load-dialog-header">Point Load</div>
        <div className="load-dialog-body">
          <label>
            <span>Load Case</span>
            <select
              className="load-dialog-select"
              value={selectedLC}
              onChange={e => setSelectedLC(parseInt(e.target.value))}
            >
              {loadCases.map(lc => (
                <option key={lc.id} value={lc.id}>{lc.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Fx (kN)</span>
            <input
              type="text"
              value={fx}
              onChange={e => setFx(e.target.value)}
              autoFocus
              onFocus={e => e.target.select()}
            />
          </label>
          <label>
            <span>Fz (kN)</span>
            <input
              type="text"
              value={fz}
              onChange={e => setFz(e.target.value)}
              onFocus={e => e.target.select()}
            />
          </label>
          <label>
            <span>M (kNm)</span>
            <input
              type="text"
              value={moment}
              onChange={e => setMoment(e.target.value)}
              onFocus={e => e.target.select()}
            />
          </label>
          <p className="load-dialog-hint">Positive Fz = upward, positive Fx = rightward</p>
        </div>
        <div className="load-dialog-footer">
          <button className="load-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="load-btn confirm" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
