import { useState } from 'react';
import { ULS_LOAD_FACTORS, PSI_FACTORS, STEEL_GRADES, CONSEQUENCE_CLASSES } from '../../core/standards/EurocodeNL';
import './StandardsDialog.css';

type StandardsTab = 'loadFactors' | 'psiFactors' | 'steelGrades' | 'consequences';

interface StandardsDialogProps {
  onClose: () => void;
}

export function StandardsDialog({ onClose }: StandardsDialogProps) {
  const [activeTab, setActiveTab] = useState<StandardsTab>('loadFactors');

  return (
    <div className="standards-dialog-overlay" onClick={onClose}>
      <div className="standards-dialog" onClick={e => e.stopPropagation()}>
        <div className="standards-dialog-header">
          Eurocode NL — NEN-EN Reference Tables
        </div>

        <div className="standards-tabs">
          <button className={activeTab === 'loadFactors' ? 'active' : ''} onClick={() => setActiveTab('loadFactors')}>
            Load Factors
          </button>
          <button className={activeTab === 'psiFactors' ? 'active' : ''} onClick={() => setActiveTab('psiFactors')}>
            Psi Factors
          </button>
          <button className={activeTab === 'steelGrades' ? 'active' : ''} onClick={() => setActiveTab('steelGrades')}>
            Steel Grades
          </button>
          <button className={activeTab === 'consequences' ? 'active' : ''} onClick={() => setActiveTab('consequences')}>
            CC Classes
          </button>
        </div>

        <div className="standards-dialog-body">
          {activeTab === 'loadFactors' && (
            <table className="standards-table">
              <thead>
                <tr>
                  <th>Combination</th>
                  <th>Description</th>
                  <th>γ_G</th>
                  <th>γ_Q</th>
                </tr>
              </thead>
              <tbody>
                {ULS_LOAD_FACTORS.map(f => (
                  <tr key={f.name}>
                    <td className="std-name">{f.name}</td>
                    <td>{f.description}</td>
                    <td className="std-num">{f.gammaG.toFixed(2)}</td>
                    <td className="std-num">{f.gammaQ.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'psiFactors' && (
            <table className="standards-table">
              <thead>
                <tr>
                  <th>Cat.</th>
                  <th>Description</th>
                  <th>ψ₀</th>
                  <th>ψ₁</th>
                  <th>ψ₂</th>
                </tr>
              </thead>
              <tbody>
                {PSI_FACTORS.map(p => (
                  <tr key={p.category}>
                    <td className="std-name">{p.category}</td>
                    <td>{p.description}</td>
                    <td className="std-num">{p.psi0.toFixed(1)}</td>
                    <td className="std-num">{p.psi1.toFixed(1)}</td>
                    <td className="std-num">{p.psi2.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'steelGrades' && (
            <table className="standards-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>f_y (MPa)</th>
                  <th>f_u (MPa)</th>
                  <th>γ_M0</th>
                  <th>γ_M1</th>
                  <th>γ_M2</th>
                </tr>
              </thead>
              <tbody>
                {STEEL_GRADES.map(s => (
                  <tr key={s.name}>
                    <td className="std-name">{s.name}</td>
                    <td className="std-num">{s.fy}</td>
                    <td className="std-num">{s.fu}</td>
                    <td className="std-num">{s.gammaM0.toFixed(2)}</td>
                    <td className="std-num">{s.gammaM1.toFixed(2)}</td>
                    <td className="std-num">{s.gammaM2.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'consequences' && (
            <table className="standards-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Description</th>
                  <th>K_FI</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                {CONSEQUENCE_CLASSES.map(c => (
                  <tr key={c.name}>
                    <td className="std-name">{c.name}</td>
                    <td>{c.description}</td>
                    <td className="std-num">{c.KFI.toFixed(1)}</td>
                    <td className="std-examples">{c.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="standards-dialog-footer">
          <button className="standards-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
