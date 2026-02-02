import { useState } from 'react';
import './PlateDialog.css';

interface PlateDialogProps {
  rectWidth: number;   // meters (from drawn rectangle)
  rectHeight: number;  // meters
  materials: { id: number; name: string }[];
  onConfirm: (config: {
    divisionsX: number;
    divisionsY: number;
    thickness: number;
    materialId: number;
  }) => void;
  onCancel: () => void;
}

export function PlateDialog({
  rectWidth,
  rectHeight,
  materials,
  onConfirm,
  onCancel,
}: PlateDialogProps) {
  const [divisionsX, setDivisionsX] = useState('4');
  const [divisionsY, setDivisionsY] = useState('4');
  const [thickness, setThickness] = useState('200');
  const [materialId, setMaterialId] = useState(materials.length > 0 ? materials[0].id : 1);

  const handleConfirm = () => {
    const nx = parseInt(divisionsX);
    const ny = parseInt(divisionsY);
    const t = parseFloat(thickness);
    if (isNaN(nx) || nx < 1 || isNaN(ny) || ny < 1 || isNaN(t) || t <= 0) return;
    onConfirm({
      divisionsX: nx,
      divisionsY: ny,
      thickness: t / 1000, // mm to meters
      materialId
    });
  };

  const keyHandler = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="plate-dialog-overlay" onClick={onCancel}>
      <div className="plate-dialog" onClick={e => e.stopPropagation()}>
        <div className="plate-dialog-header">Plate Element</div>
        <div className="plate-dialog-body">
          <p className="plate-dialog-hint">
            Rectangle: {(rectWidth * 1000).toFixed(0)} x {(rectHeight * 1000).toFixed(0)} mm
          </p>

          <div className="plate-dialog-row">
            <label>
              <span>Divisions X</span>
              <input
                type="number"
                min="1"
                max="50"
                value={divisionsX}
                onChange={e => setDivisionsX(e.target.value)}
                autoFocus
                onFocus={e => e.target.select()}
                onKeyDown={keyHandler}
              />
            </label>
            <label>
              <span>Divisions Y</span>
              <input
                type="number"
                min="1"
                max="50"
                value={divisionsY}
                onChange={e => setDivisionsY(e.target.value)}
                onFocus={e => e.target.select()}
                onKeyDown={keyHandler}
              />
            </label>
          </div>

          <label>
            <span>Thickness (mm)</span>
            <input
              type="text"
              value={thickness}
              onChange={e => setThickness(e.target.value)}
              onFocus={e => e.target.select()}
              onKeyDown={keyHandler}
            />
          </label>

          <label>
            <span>Material</span>
            <select
              value={materialId}
              onChange={e => setMaterialId(parseInt(e.target.value))}
            >
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>

          <p className="plate-dialog-hint">
            Creates {parseInt(divisionsX) * parseInt(divisionsY) * 2 || 0} triangles (CST/DKT).
            Use "Plane Stress" for membrane or "Plate Bending (DKT)" for bending analysis.
          </p>
        </div>
        <div className="plate-dialog-footer">
          <button className="plate-dialog-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="plate-dialog-btn confirm" onClick={handleConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
}
