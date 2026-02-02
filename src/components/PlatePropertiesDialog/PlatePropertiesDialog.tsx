import { useState } from 'react';
import { IPlateRegion, IMaterial } from '../../core/fem/types';
import { polygonArea } from '../../core/fem/PlateRegion';
import './PlatePropertiesDialog.css';

interface PlatePropertiesDialogProps {
  plate: IPlateRegion;
  materials: IMaterial[];
  onUpdate: (updates: { thickness?: number; materialId?: number }) => void;
  onClose: () => void;
}

export function PlatePropertiesDialog({ plate, materials, onUpdate, onClose }: PlatePropertiesDialogProps) {
  const [thickness, setThickness] = useState((plate.thickness * 1000).toFixed(0));
  const [materialId, setMaterialId] = useState(plate.materialId);

  const material = materials.find(m => m.id === materialId);

  const area = plate.isPolygon && plate.polygon
    ? polygonArea(plate.polygon)
    : plate.width * plate.height;

  const numElements = plate.elementIds.length;
  const numNodes = plate.nodeIds.length;

  const handleApply = () => {
    const t = parseFloat(thickness) / 1000;
    if (isNaN(t) || t <= 0) return;
    onUpdate({ thickness: t, materialId });
    onClose();
  };

  return (
    <div className="plate-props-overlay" onClick={onClose}>
      <div className="plate-props-dialog" onClick={e => e.stopPropagation()}>
        <div className="plate-props-header">Plate {plate.id}</div>
        <div className="plate-props-body">
          <div className="plate-props-section-title">Geometry</div>
          <div className="plate-props-row">
            <span className="plate-props-label">Type</span>
            <span className="plate-props-value">{plate.isPolygon ? 'Polygon' : 'Rectangular'}</span>
          </div>
          <div className="plate-props-row">
            <span className="plate-props-label">Area</span>
            <span className="plate-props-value">{area.toFixed(3)} m²</span>
          </div>
          {!plate.isPolygon && (
            <>
              <div className="plate-props-row">
                <span className="plate-props-label">Width</span>
                <span className="plate-props-value">{plate.width.toFixed(3)} m</span>
              </div>
              <div className="plate-props-row">
                <span className="plate-props-label">Height</span>
                <span className="plate-props-value">{plate.height.toFixed(3)} m</span>
              </div>
            </>
          )}
          {plate.isPolygon && plate.polygon && (
            <div className="plate-props-row">
              <span className="plate-props-label">Vertices</span>
              <span className="plate-props-value">{plate.polygon.length}</span>
            </div>
          )}
          {plate.voids && plate.voids.length > 0 && (
            <div className="plate-props-row">
              <span className="plate-props-label">Voids</span>
              <span className="plate-props-value">{plate.voids.length}</span>
            </div>
          )}

          <div className="plate-props-section-title">Mesh</div>
          <div className="plate-props-row">
            <span className="plate-props-label">Elements</span>
            <span className="plate-props-value">{numElements} {plate.elementType ?? 'triangle'}</span>
          </div>
          <div className="plate-props-row">
            <span className="plate-props-label">Nodes</span>
            <span className="plate-props-value">{numNodes}</span>
          </div>
          {!plate.isPolygon && (
            <div className="plate-props-row">
              <span className="plate-props-label">Divisions</span>
              <span className="plate-props-value">{plate.divisionsX} × {plate.divisionsY}</span>
            </div>
          )}

          <div className="plate-props-section-title">Properties</div>
          <label className="plate-props-input-row">
            <span>Thickness (mm)</span>
            <input
              type="text"
              value={thickness}
              onChange={e => setThickness(e.target.value)}
              autoFocus
              onFocus={e => e.target.select()}
              onKeyDown={e => { if (e.key === 'Enter') handleApply(); if (e.key === 'Escape') onClose(); }}
            />
          </label>
          <label className="plate-props-input-row">
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

          {material && (
            <>
              <div className="plate-props-row">
                <span className="plate-props-label">E</span>
                <span className="plate-props-value">{(material.E / 1e9).toFixed(1)} GPa</span>
              </div>
              <div className="plate-props-row">
                <span className="plate-props-label">&nu;</span>
                <span className="plate-props-value">{material.nu.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
        <div className="plate-props-footer">
          <button className="plate-props-btn cancel" onClick={onClose}>Cancel</button>
          <button className="plate-props-btn confirm" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
