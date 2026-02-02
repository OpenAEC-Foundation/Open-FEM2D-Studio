import { useState, useMemo } from 'react';
import './PlateDialog.css';

interface PlateDialogProps {
  rectWidth: number;   // meters (from drawn rectangle or polygon bounding box)
  rectHeight: number;  // meters
  drawMode?: 'rectangle' | 'polygon';
  polygonVertices?: {x: number, y: number}[];
  polygonVoids?: {x: number, y: number}[][];
  onDrawModeChange?: (mode: 'rectangle' | 'polygon') => void;
  materials: { id: number; name: string }[];
  onConfirm: (config: {
    divisionsX: number;
    divisionsY: number;
    thickness: number;
    materialId: number;
    elementType: 'quad';
    meshSize?: number;
  }) => void;
  onCancel: () => void;
}

/** Compute polygon area using shoelace formula */
function computePolygonArea(vertices: {x: number, y: number}[]): number {
  let area = 0;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    area += vertices[j].x * vertices[i].y - vertices[i].x * vertices[j].y;
  }
  return Math.abs(area * 0.5);
}

export function PlateDialog({
  rectWidth,
  rectHeight,
  drawMode = 'rectangle',
  polygonVertices,
  polygonVoids,
  onDrawModeChange,
  materials,
  onConfirm,
  onCancel,
}: PlateDialogProps) {
  const [divisionsX, setDivisionsX] = useState('4');
  const [divisionsY, setDivisionsY] = useState('4');
  const [thickness, setThickness] = useState('200');
  const [materialId, setMaterialId] = useState(materials.length > 0 ? materials[0].id : 1);

  const isPolygon = drawMode === 'polygon' && polygonVertices && polygonVertices.length >= 3;

  // Compute default mesh size from polygon area
  const polyArea = useMemo(() => {
    if (isPolygon && polygonVertices) return computePolygonArea(polygonVertices);
    return 0;
  }, [isPolygon, polygonVertices]);

  // Default mesh size: sqrt(area / 100) gives element edge length
  const defaultMeshSize = polyArea > 0 ? Math.sqrt(polyArea / 100) : 0.1;

  const [meshSize, setMeshSize] = useState(() => defaultMeshSize.toPrecision(3));

  const handleConfirm = () => {
    const t = parseFloat(thickness);
    if (isNaN(t) || t <= 0) return;

    if (isPolygon) {
      const ms = parseFloat(meshSize);
      if (isNaN(ms) || ms <= 0) return;
      onConfirm({
        divisionsX: 0,
        divisionsY: 0,
        thickness: t / 1000,
        materialId,
        elementType: 'quad',
        meshSize: ms,
      });
    } else {
      const nx = parseInt(divisionsX);
      const ny = parseInt(divisionsY);
      if (isNaN(nx) || nx < 1 || isNaN(ny) || ny < 1) return;
      onConfirm({
        divisionsX: nx,
        divisionsY: ny,
        thickness: t / 1000,
        materialId,
        elementType: 'quad',
      });
    }
  };

  const keyHandler = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  // Estimate element count for polygon mode
  const estimatedElements = useMemo(() => {
    const ms = parseFloat(meshSize);
    if (!isPolygon || isNaN(ms) || ms <= 0 || polyArea <= 0) return 0;
    // Subtract void areas
    let voidArea = 0;
    if (polygonVoids) {
      for (const v of polygonVoids) {
        voidArea += computePolygonArea(v);
      }
    }
    const netArea = Math.max(0, polyArea - voidArea);
    const elemArea = ms * ms;
    return Math.round(netArea / elemArea);
  }, [isPolygon, meshSize, polyArea, polygonVoids]);

  return (
    <div className="plate-dialog-overlay" onClick={onCancel}>
      <div className="plate-dialog" onClick={e => e.stopPropagation()}>
        <div className="plate-dialog-header">Plate Element</div>
        <div className="plate-dialog-body">
          {/* Drawing mode selector */}
          <div className="plate-dialog-draw-mode">
            <span className="plate-dialog-element-type-label">Drawing mode</span>
            <div className="plate-dialog-radio-group">
              <label className="plate-dialog-radio">
                <input
                  type="radio"
                  name="drawMode"
                  value="rectangle"
                  checked={drawMode === 'rectangle'}
                  onChange={() => onDrawModeChange?.('rectangle')}
                />
                <span>Rectangle</span>
              </label>
              <label className="plate-dialog-radio">
                <input
                  type="radio"
                  name="drawMode"
                  value="polygon"
                  checked={drawMode === 'polygon'}
                  onChange={() => onDrawModeChange?.('polygon')}
                />
                <span>Polygon</span>
              </label>
            </div>
          </div>

          {isPolygon ? (
            <div className="plate-dialog-polygon-info">
              <p className="plate-dialog-hint">
                Polygon outline: {polygonVertices.length} vertices, area {(polyArea * 1e6).toFixed(0)} mm² ({polyArea.toFixed(4)} m²)
              </p>
              {polygonVoids && polygonVoids.length > 0 && (
                <p className="plate-dialog-hint plate-dialog-void-info">
                  Voids: {polygonVoids.length} opening(s) ({polygonVoids.map(v => `${v.length} pts`).join(', ')})
                </p>
              )}
            </div>
          ) : (
            <p className="plate-dialog-hint">
              Rectangle: {(rectWidth * 1000).toFixed(0)} x {(rectHeight * 1000).toFixed(0)} mm
            </p>
          )}

          {!isPolygon && (
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
          )}

          {isPolygon && (
            <div className="plate-dialog-row">
              <label>
                <span>Mesh size (m)</span>
                <input
                  type="text"
                  value={meshSize}
                  onChange={e => setMeshSize(e.target.value)}
                  autoFocus
                  onFocus={e => e.target.select()}
                  onKeyDown={keyHandler}
                />
              </label>
            </div>
          )}

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
            {isPolygon
              ? `Estimated ~${estimatedElements} quad elements (mesh size ${parseFloat(meshSize || '0').toPrecision(3)} m).`
              : `Creates ${parseInt(divisionsX) * parseInt(divisionsY) || 0} quadrilateral elements.`
            }
            {' '}Use "Plane Stress" for membrane or "Plate Bending (DKT)" for bending analysis.
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
