import { useState } from 'react';
import { IMaterial } from '../../core/fem/types';
import './MaterialsDialog.css';

interface MaterialsDialogProps {
  materials: IMaterial[];
  onAdd: (material: Omit<IMaterial, 'id'>) => void;
  onUpdate: (id: number, updates: Partial<IMaterial>) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function MaterialsDialog({ materials, onAdd, onUpdate, onDelete, onClose }: MaterialsDialogProps) {
  const [selectedId, setSelectedId] = useState<number | null>(materials.length > 0 ? materials[0].id : null);

  const selected = materials.find(m => m.id === selectedId);

  const handleAdd = () => {
    onAdd({
      name: 'New Material',
      E: 200e9,
      nu: 0.3,
      rho: 7800,
      color: '#10b981',
      alpha: 12e-6,
    });
  };

  const handleFieldChange = (field: keyof IMaterial, value: string) => {
    if (!selected) return;
    switch (field) {
      case 'name':
        onUpdate(selected.id, { name: value });
        break;
      case 'E':
        const e = parseFloat(value);
        if (!isNaN(e)) onUpdate(selected.id, { E: e * 1e9 });
        break;
      case 'nu':
        const nu = parseFloat(value);
        if (!isNaN(nu)) onUpdate(selected.id, { nu });
        break;
      case 'rho':
        const rho = parseFloat(value);
        if (!isNaN(rho)) onUpdate(selected.id, { rho });
        break;
      case 'alpha':
        const alpha = parseFloat(value);
        if (!isNaN(alpha)) onUpdate(selected.id, { alpha: alpha * 1e-6 });
        break;
      case 'color':
        onUpdate(selected.id, { color: value });
        break;
    }
  };

  return (
    <div className="materials-overlay" onClick={onClose}>
      <div className="materials-dialog" onClick={e => e.stopPropagation()}>
        <div className="materials-header">
          <span>Materials</span>
        </div>
        <div className="materials-body">
          <div className="materials-list">
            {materials.map(m => (
              <div
                key={m.id}
                className={`material-item ${selectedId === m.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(m.id)}
              >
                <div className="material-color" style={{ backgroundColor: m.color }} />
                <div className="material-info">
                  <div className="material-name">{m.name}</div>
                  <div className="material-details">
                    E = {(m.E / 1e9).toFixed(1)} GPa, &nu; = {m.nu.toFixed(2)}, &rho; = {m.rho} kg/m³
                  </div>
                </div>
                <button
                  className="material-delete-btn"
                  onClick={(e) => { e.stopPropagation(); onDelete(m.id); if (selectedId === m.id) setSelectedId(null); }}
                  title="Delete material"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {selected && (
            <div className="materials-edit-section">
              <div className="materials-edit-title">Edit Material</div>
              <div className="materials-edit-grid">
                <label>Name</label>
                <input
                  type="text"
                  defaultValue={selected.name}
                  key={`name-${selected.id}`}
                  onBlur={e => handleFieldChange('name', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />

                <label>E (GPa)</label>
                <input
                  type="text"
                  defaultValue={(selected.E / 1e9).toFixed(1)}
                  key={`E-${selected.id}`}
                  onBlur={e => handleFieldChange('E', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />

                <label>&nu; (Poisson)</label>
                <input
                  type="text"
                  defaultValue={selected.nu.toFixed(3)}
                  key={`nu-${selected.id}`}
                  onBlur={e => handleFieldChange('nu', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />

                <label>&rho; (kg/m³)</label>
                <input
                  type="text"
                  defaultValue={selected.rho.toString()}
                  key={`rho-${selected.id}`}
                  onBlur={e => handleFieldChange('rho', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />

                <label>&alpha; (×10⁻⁶/°C)</label>
                <input
                  type="text"
                  defaultValue={selected.alpha ? (selected.alpha * 1e6).toFixed(1) : '0'}
                  key={`alpha-${selected.id}`}
                  onBlur={e => handleFieldChange('alpha', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />

                <label>Color</label>
                <input
                  type="color"
                  value={selected.color}
                  key={`color-${selected.id}`}
                  onChange={e => handleFieldChange('color', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <div className="materials-footer">
          <button className="materials-add-btn" onClick={handleAdd}>+ Add Material</button>
          <button className="materials-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
