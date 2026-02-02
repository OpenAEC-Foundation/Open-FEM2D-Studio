import { useState, useMemo } from 'react';
import { useFEM } from '../../context/FEMContext';
import { STEEL_GRADES, ISteelGrade } from '../../core/standards/EurocodeNL';
import { checkAllBeams, ISectionProperties, ISteelCheckResult } from '../../core/standards/SteelCheck';
import './SteelCheckPanel.css';

interface SteelCheckPanelProps {
  onClose: () => void;
}

export function SteelCheckPanel({ onClose }: SteelCheckPanelProps) {
  const { state } = useFEM();
  const { mesh, result, forceUnit } = state;
  const [gradeIdx, setGradeIdx] = useState(2); // Default S355
  const grade: ISteelGrade = STEEL_GRADES[gradeIdx];

  const formatForce = (n: number): string => {
    if (forceUnit === 'kN') return (n / 1000).toFixed(1);
    return n.toFixed(0);
  };

  const formatMoment = (nm: number): string => {
    if (forceUnit === 'kN') return (nm / 1000).toFixed(2);
    return nm.toFixed(0);
  };

  const results = useMemo<ISteelCheckResult[]>(() => {
    if (!result || !result.beamForces || result.beamForces.size === 0) return [];

    // Build section map from mesh beam elements
    const sectionMap = new Map<number, ISectionProperties>();
    for (const beam of mesh.beamElements.values()) {
      sectionMap.set(beam.id, {
        A: beam.section.A,
        I: beam.section.I,
        h: beam.section.h,
        profileName: beam.profileName,
      });
    }

    return checkAllBeams(result.beamForces, sectionMap, grade);
  }, [result, mesh, grade]);

  const allOk = results.every(r => r.status === 'OK');
  const worstUC = results.length > 0 ? Math.max(...results.map(r => r.UC_max)) : 0;

  function UCBar({ value }: { value: number }) {
    const pct = Math.min(value * 100, 100);
    const cls = value <= 0.85 ? 'uc-ok' : value <= 1.0 ? 'uc-warn' : 'uc-fail';
    const bgColor = value <= 0.85 ? 'var(--success)' : value <= 1.0 ? 'var(--warning)' : '#ef4444';
    return (
      <span className="uc-bar">
        <span className="uc-bar-track">
          <span className="uc-bar-fill" style={{ width: `${pct}%`, background: bgColor }} />
        </span>
        <span className={`uc-value ${cls}`}>{value.toFixed(2)}</span>
      </span>
    );
  }

  return (
    <div className="steel-check-overlay" onClick={onClose}>
      <div className="steel-check-dialog" onClick={e => e.stopPropagation()}>
        <div className="steel-check-header">
          <span>Steel Section Check — EN 1993-1-1</span>
          <select
            className="steel-check-grade-select"
            value={gradeIdx}
            onChange={e => setGradeIdx(parseInt(e.target.value))}
          >
            {STEEL_GRADES.map((g, i) => (
              <option key={g.name} value={i}>{g.name} (fy={g.fy} MPa)</option>
            ))}
          </select>
        </div>
        <div className="steel-check-body">
          {results.length === 0 ? (
            <div className="steel-check-no-result">
              Run the analysis first to see steel section check results.
            </div>
          ) : (
            <table className="steel-check-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Profile</th>
                  <th>N<sub>Ed</sub> ({forceUnit})</th>
                  <th>V<sub>Ed</sub> ({forceUnit})</th>
                  <th>M<sub>Ed</sub> ({forceUnit}m)</th>
                  <th>UC M</th>
                  <th>UC V</th>
                  <th>UC M+N</th>
                  <th>UC max</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.elementId}>
                    <td>{r.elementId}</td>
                    <td>{r.profileName}</td>
                    <td>{formatForce(r.NEd)}</td>
                    <td>{formatForce(r.VEd)}</td>
                    <td>{formatMoment(r.MEd)}</td>
                    <td>{r.UC_M.toFixed(2)}</td>
                    <td>{r.UC_V.toFixed(2)}</td>
                    <td>{r.UC_MN.toFixed(2)}</td>
                    <td><UCBar value={r.UC_max} /></td>
                    <td style={{ color: r.status === 'OK' ? 'var(--success)' : '#ef4444', fontWeight: 600 }}>
                      {r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="steel-check-footer">
          <span className="summary">
            {results.length > 0 && (
              <>
                {results.length} members checked | Max UC: {worstUC.toFixed(2)} |{' '}
                <span style={{ color: allOk ? 'var(--success)' : '#ef4444', fontWeight: 600 }}>
                  {allOk ? 'All OK' : 'FAIL'}
                </span>
              </>
            )}
          </span>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
