import { useState } from 'react';
import { useFEM } from '../../context/FEMContext';
import { IGridLine, IStructuralGrid } from '../../core/fem/StructuralGrid';
import { Plus, Trash2 } from 'lucide-react';
import './GridsDialog.css';

interface GridsDialogProps {
  onClose: () => void;
}

function nextLetter(existing: IGridLine[]): string {
  const used = new Set(existing.map(l => l.name));
  for (let i = 0; i < 26; i++) {
    const name = String.fromCharCode(65 + i); // A, B, C, ...
    if (!used.has(name)) return name;
  }
  return `G${existing.length + 1}`;
}

function nextLevel(existing: IGridLine[]): string {
  if (existing.length === 0) return '+0.000';
  const maxPos = Math.max(...existing.map(l => l.position));
  return `+${(maxPos + 3).toFixed(3)}`;
}

export function GridsDialog({ onClose }: GridsDialogProps) {
  const { state, dispatch } = useFEM();
  const [grid, setGrid] = useState<IStructuralGrid>({ ...state.structuralGrid });

  const addVertical = () => {
    const lastPos = grid.verticalLines.length > 0
      ? Math.max(...grid.verticalLines.map(l => l.position)) + 3
      : 0;
    const newLine: IGridLine = {
      id: Date.now(),
      name: nextLetter(grid.verticalLines),
      position: lastPos,
      orientation: 'vertical'
    };
    setGrid({ ...grid, verticalLines: [...grid.verticalLines, newLine] });
  };

  const addHorizontal = () => {
    const lastPos = grid.horizontalLines.length > 0
      ? Math.max(...grid.horizontalLines.map(l => l.position)) + 3
      : 0;
    const newLine: IGridLine = {
      id: Date.now() + 1,
      name: nextLevel(grid.horizontalLines),
      position: lastPos,
      orientation: 'horizontal'
    };
    setGrid({ ...grid, horizontalLines: [...grid.horizontalLines, newLine] });
  };

  const removeVertical = (id: number) => {
    setGrid({ ...grid, verticalLines: grid.verticalLines.filter(l => l.id !== id) });
  };

  const removeHorizontal = (id: number) => {
    setGrid({ ...grid, horizontalLines: grid.horizontalLines.filter(l => l.id !== id) });
  };

  const updateVertical = (id: number, updates: Partial<IGridLine>) => {
    setGrid({
      ...grid,
      verticalLines: grid.verticalLines.map(l => l.id === id ? { ...l, ...updates } : l)
    });
  };

  const updateHorizontal = (id: number, updates: Partial<IGridLine>) => {
    setGrid({
      ...grid,
      horizontalLines: grid.horizontalLines.map(l => l.id === id ? { ...l, ...updates } : l)
    });
  };

  const distributeVertical = () => {
    if (grid.verticalLines.length < 2) return;
    const sorted = [...grid.verticalLines].sort((a, b) => a.position - b.position);
    const start = sorted[0].position;
    const end = sorted[sorted.length - 1].position;
    const spacing = (end - start) / (sorted.length - 1);
    const updated = sorted.map((l, i) => ({ ...l, position: start + i * spacing }));
    setGrid({ ...grid, verticalLines: updated });
  };

  const handleApply = () => {
    dispatch({ type: 'SET_STRUCTURAL_GRID', payload: grid });
    dispatch({ type: 'REFRESH_MESH' });
    onClose();
  };

  return (
    <div className="grids-dialog-overlay" onClick={onClose}>
      <div className="grids-dialog" onClick={e => e.stopPropagation()}>
        <div className="grids-dialog-header">Structural Grids (Stramienen)</div>
        <div className="grids-dialog-body">
          {/* Vertical grid lines (stramienen) */}
          <div className="grids-section">
            <div className="grids-section-header">
              <span>Stramienen (Vertical)</span>
              <div className="grids-section-actions">
                <button className="grids-action-btn" onClick={distributeVertical} title="Distribute evenly">
                  Distribute
                </button>
                <button className="grids-action-btn" onClick={addVertical}>
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
            <table className="grids-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>X-position (m)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grid.verticalLines.map(line => (
                  <tr key={line.id}>
                    <td>
                      <input
                        type="text"
                        value={line.name}
                        onChange={e => updateVertical(line.id, { name: e.target.value })}
                        className="grids-input name-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={line.position}
                        onChange={e => updateVertical(line.id, { position: parseFloat(e.target.value) || 0 })}
                        className="grids-input"
                        step="0.5"
                      />
                    </td>
                    <td>
                      <button className="grids-delete-btn" onClick={() => removeVertical(line.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {grid.verticalLines.length === 0 && (
                  <tr><td colSpan={3} className="grids-empty">No grid lines. Click Add to create.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Horizontal grid lines (levels) */}
          <div className="grids-section">
            <div className="grids-section-header">
              <span>Levels (Horizontal)</span>
              <div className="grids-section-actions">
                <button className="grids-action-btn" onClick={addHorizontal}>
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
            <table className="grids-table">
              <thead>
                <tr>
                  <th>Peilmaat</th>
                  <th>Y-elevation (m)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grid.horizontalLines.map(line => (
                  <tr key={line.id}>
                    <td>
                      <input
                        type="text"
                        value={line.name}
                        onChange={e => updateHorizontal(line.id, { name: e.target.value })}
                        className="grids-input name-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={line.position}
                        onChange={e => updateHorizontal(line.id, { position: parseFloat(e.target.value) || 0 })}
                        className="grids-input"
                        step="0.5"
                      />
                    </td>
                    <td>
                      <button className="grids-delete-btn" onClick={() => removeHorizontal(line.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {grid.horizontalLines.length === 0 && (
                  <tr><td colSpan={3} className="grids-empty">No levels. Click Add to create.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Display options */}
          <div className="grids-options">
            <label className="grids-checkbox">
              <input
                type="checkbox"
                checked={grid.showGridLines}
                onChange={e => setGrid({ ...grid, showGridLines: e.target.checked })}
              />
              <span>Show grid lines on canvas</span>
            </label>
            <label className="grids-checkbox">
              <input
                type="checkbox"
                checked={grid.snapToGridLines}
                onChange={e => setGrid({ ...grid, snapToGridLines: e.target.checked })}
              />
              <span>Snap to grid lines</span>
            </label>
          </div>
        </div>
        <div className="grids-dialog-footer">
          <button className="grids-btn cancel" onClick={onClose}>Cancel</button>
          <button className="grids-btn confirm" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
