import { useState } from 'react';
import { useFEM } from '../../context/FEMContext';
import type { AnalysisType } from '../../core/fem/types';
import './CalculationSettingsDialog.css';

interface CalculationSettingsDialogProps {
  onClose: () => void;
}

export function CalculationSettingsDialog({ onClose }: CalculationSettingsDialogProps) {
  const { state, dispatch } = useFEM();

  const [analysisType, setAnalysisType] = useState<AnalysisType>(state.analysisType);
  const [solverMethod, setSolverMethod] = useState<'linear' | 'pdelta'>(
    'linear'
  );
  const [forceUnit, setForceUnit] = useState<'kN' | 'N'>(state.forceUnit);
  const [displacementUnit, setDisplacementUnit] = useState<'mm' | 'm'>(state.displacementUnit);
  const [autoRecalculate, setAutoRecalculate] = useState(state.autoRecalculate);
  const [convergenceTolerance, setConvergenceTolerance] = useState(1e-6);
  const [maxIterations, setMaxIterations] = useState(10);

  const handleApply = () => {
    dispatch({ type: 'SET_ANALYSIS_TYPE', payload: analysisType });
    dispatch({ type: 'SET_FORCE_UNIT', payload: forceUnit });
    dispatch({ type: 'SET_DISPLACEMENT_UNIT', payload: displacementUnit });
    dispatch({ type: 'SET_AUTO_RECALCULATE', payload: autoRecalculate });
    onClose();
  };

  return (
    <div className="calc-settings-overlay" onClick={onClose}>
      <div className="calc-settings-dialog" onClick={e => e.stopPropagation()}>
        <div className="calc-settings-header">
          Calculation Settings
        </div>

        <div className="calc-settings-body">
          {/* Analysis Type */}
          <div className="calc-settings-section">
            <div className="calc-settings-section-title">Analysis</div>
            <div className="calc-settings-field">
              <span>Analysis Type</span>
              <select
                value={analysisType}
                onChange={e => setAnalysisType(e.target.value as AnalysisType)}
              >
                <option value="frame">2D Frame</option>
                <option value="plane_stress">Plane Stress</option>
                <option value="plane_strain">Plane Strain</option>
                <option value="plate_bending">Plate Bending (DKT)</option>
              </select>
            </div>
            <div className="calc-settings-field">
              <span>Solver Method</span>
              <select
                value={solverMethod}
                onChange={e => setSolverMethod(e.target.value as 'linear' | 'pdelta')}
              >
                <option value="linear">Linear (GL - Geometrisch Lineair)</option>
                <option value="pdelta">P-Delta (2nd order, GNL)</option>
              </select>
            </div>
          </div>

          {/* Units */}
          <div className="calc-settings-section">
            <div className="calc-settings-section-title">Units</div>
            <div className="calc-settings-field">
              <span>Force Unit</span>
              <select
                value={forceUnit}
                onChange={e => setForceUnit(e.target.value as 'kN' | 'N')}
              >
                <option value="kN">kN</option>
                <option value="N">N</option>
              </select>
            </div>
            <div className="calc-settings-field">
              <span>Displacement Unit</span>
              <select
                value={displacementUnit}
                onChange={e => setDisplacementUnit(e.target.value as 'mm' | 'm')}
              >
                <option value="mm">mm</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>

          {/* Solver Options */}
          <div className="calc-settings-section">
            <div className="calc-settings-section-title">Solver Options</div>
            <div className="calc-settings-toggle">
              <input
                type="checkbox"
                id="autoRecalc"
                checked={autoRecalculate}
                onChange={e => setAutoRecalculate(e.target.checked)}
              />
              <label htmlFor="autoRecalc">Auto-recalculate on model changes</label>
            </div>
            <div className="calc-settings-field">
              <span>Convergence Tolerance</span>
              <input
                type="number"
                value={convergenceTolerance}
                onChange={e => setConvergenceTolerance(parseFloat(e.target.value) || 1e-6)}
                step="1e-7"
                min="1e-12"
                max="1e-2"
              />
            </div>
            <div className="calc-settings-field">
              <span>Max Iterations</span>
              <input
                type="number"
                value={maxIterations}
                onChange={e => setMaxIterations(parseInt(e.target.value) || 10)}
                step="1"
                min="1"
                max="100"
              />
            </div>
          </div>
        </div>

        <div className="calc-settings-footer">
          <button className="calc-settings-btn cancel" onClick={onClose}>Cancel</button>
          <button className="calc-settings-btn confirm" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
