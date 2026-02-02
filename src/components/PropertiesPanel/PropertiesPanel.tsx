import { useFEM } from '../../context/FEMContext';
import { formatModulus } from '../../core/fem/Material';
import { formatStress, formatDisplacement, formatMomentPerLength, generateColorScale } from '../../utils/colors';
import { formatForce, formatMoment } from '../../core/fem/BeamForces';
import { DEFAULT_SECTIONS } from '../../core/fem/Beam';
import { buildNodeIdToIndex } from '../../core/solver/Assembler';
import './PropertiesPanel.css';

// This component is now largely replaced by ProjectBrowser and VisibilityPanel
// but kept for backward compatibility

export function PropertiesPanel() {
  const { state, dispatch } = useFEM();
  const {
    mesh,
    result,
    selection,
    analysisType,
    showDeformed,
    deformationScale,
    showStress,
    stressType,
    gridSize,
    snapToGrid,
    diagramScale
  } = state;

  const selectedNodeId = selection.nodeIds.size === 1 ? Array.from(selection.nodeIds)[0] : null;
  const selectedElementId = selection.elementIds.size === 1 ? Array.from(selection.elementIds)[0] : null;

  const selectedNode = selectedNodeId ? mesh.getNode(selectedNodeId) : null;
  const selectedElement = selectedElementId ? mesh.getElement(selectedElementId) : null;
  const selectedBeam = selectedElementId ? mesh.getBeamElement(selectedElementId) : null;

  const nodeIdToIndex = buildNodeIdToIndex(mesh, analysisType);

  const dofsPerNode = analysisType === 'frame' ? 3 : analysisType === 'plate_bending' ? 3 : 2;

  return (
    <div className="properties-panel">
      <div className="panel-section">
        <h3>Settings</h3>
        <div className="form-group">
          <label>Grid (m)</label>
          <input
            type="number"
            value={gridSize}
            step="0.5"
            min="0.1"
            onChange={(e) => dispatch({ type: 'SET_GRID_SIZE', payload: parseFloat(e.target.value) || 0.5 })}
          />
        </div>
        <div className="checkbox-group">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => dispatch({ type: 'SET_SNAP_TO_GRID', payload: e.target.checked })}
          />
          <label>Snap to Grid</label>
        </div>
      </div>

      {selectedNode && (
        <div className="panel-section">
          <h3>Node #{selectedNode.id}</h3>
          <div className="form-row">
            <div className="form-group">
              <label>X (m)</label>
              <input
                type="number"
                value={selectedNode.x}
                step="0.5"
                onChange={(e) => {
                  mesh.updateNode(selectedNode.id, { x: parseFloat(e.target.value) || 0 });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
            </div>
            <div className="form-group">
              <label>Y (m)</label>
              <input
                type="number"
                value={selectedNode.y}
                step="0.5"
                onChange={(e) => {
                  mesh.updateNode(selectedNode.id, { y: parseFloat(e.target.value) || 0 });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
            </div>
          </div>

          <h4>Support</h4>
          <div className="constraint-grid">
            <div className="checkbox-group">
              <input
                type="checkbox"
                checked={selectedNode.constraints.x}
                onChange={(e) => {
                  mesh.updateNode(selectedNode.id, {
                    constraints: { ...selectedNode.constraints, x: e.target.checked }
                  });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
              <label>X</label>
            </div>
            <div className="checkbox-group">
              <input
                type="checkbox"
                checked={selectedNode.constraints.y}
                onChange={(e) => {
                  mesh.updateNode(selectedNode.id, {
                    constraints: { ...selectedNode.constraints, y: e.target.checked }
                  });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
              <label>Y</label>
            </div>
            {analysisType === 'frame' && (
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  checked={selectedNode.constraints.rotation}
                  onChange={(e) => {
                    mesh.updateNode(selectedNode.id, {
                      constraints: { ...selectedNode.constraints, rotation: e.target.checked }
                    });
                    dispatch({ type: 'REFRESH_MESH' });
                  }}
                />
                <label>Rotation</label>
              </div>
            )}
          </div>

          <h4>Loads</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Fx (kN)</label>
              <input
                type="number"
                value={(selectedNode.loads.fx / 1000).toFixed(1)}
                step="1"
                onChange={(e) => {
                  mesh.updateNode(selectedNode.id, {
                    loads: { ...selectedNode.loads, fx: (parseFloat(e.target.value) || 0) * 1000 }
                  });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
            </div>
            <div className="form-group">
              <label>Fy (kN)</label>
              <input
                type="number"
                value={(selectedNode.loads.fy / 1000).toFixed(1)}
                step="1"
                onChange={(e) => {
                  mesh.updateNode(selectedNode.id, {
                    loads: { ...selectedNode.loads, fy: (parseFloat(e.target.value) || 0) * 1000 }
                  });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
            </div>
          </div>
          {analysisType === 'frame' && (
            <div className="form-group">
              <label>Moment (kNm)</label>
              <input
                type="number"
                value={(selectedNode.loads.moment / 1000).toFixed(1)}
                step="1"
                onChange={(e) => {
                  mesh.updateNode(selectedNode.id, {
                    loads: { ...selectedNode.loads, moment: (parseFloat(e.target.value) || 0) * 1000 }
                  });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
            </div>
          )}

          {result && (
            <div className="result-info">
              <h4>Results</h4>
              <p>
                <strong>u:</strong> {formatDisplacement(result.displacements[nodeIdToIndex.get(selectedNode.id)! * dofsPerNode] || 0)}
              </p>
              <p>
                <strong>v:</strong> {formatDisplacement(result.displacements[nodeIdToIndex.get(selectedNode.id)! * dofsPerNode + 1] || 0)}
              </p>
              {analysisType === 'frame' && (
                <p>
                  <strong>rot:</strong> {((result.displacements[nodeIdToIndex.get(selectedNode.id)! * dofsPerNode + 2] || 0) * 1000).toFixed(3)} mrad
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {selectedBeam && (
        <div className="panel-section">
          <h3>Beam #{selectedBeam.id}</h3>
          <div className="form-group">
            <label>Material</label>
            <select
              value={selectedBeam.materialId}
              onChange={(e) => {
                mesh.updateBeamElement(selectedBeam.id, { materialId: parseInt(e.target.value) });
                dispatch({ type: 'REFRESH_MESH' });
              }}
            >
              {Array.from(mesh.materials.values()).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Section Profile</label>
            <select
              value={`${selectedBeam.section.A.toExponential(2)}`}
              onChange={(e) => {
                const section = DEFAULT_SECTIONS.find(s => s.section.A.toExponential(2) === e.target.value);
                if (section) {
                  mesh.updateBeamElement(selectedBeam.id, { section: section.section });
                  dispatch({ type: 'REFRESH_MESH' });
                }
              }}
            >
              {DEFAULT_SECTIONS.map(s => (
                <option key={s.name} value={s.section.A.toExponential(2)}>{s.name}</option>
              ))}
            </select>
          </div>

          <h4>Distributed Load (kN/m)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>qx</label>
              <input
                type="number"
                value={((selectedBeam.distributedLoad?.qx || 0) / 1000).toFixed(1)}
                step="1"
                onChange={(e) => {
                  const qx = (parseFloat(e.target.value) || 0) * 1000;
                  const qy = selectedBeam.distributedLoad?.qy || 0;
                  mesh.updateBeamElement(selectedBeam.id, {
                    distributedLoad: { qx, qy }
                  });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
            </div>
            <div className="form-group">
              <label>qy</label>
              <input
                type="number"
                value={((selectedBeam.distributedLoad?.qy || 0) / 1000).toFixed(1)}
                step="1"
                onChange={(e) => {
                  const qx = selectedBeam.distributedLoad?.qx || 0;
                  const qy = (parseFloat(e.target.value) || 0) * 1000;
                  mesh.updateBeamElement(selectedBeam.id, {
                    distributedLoad: { qx, qy }
                  });
                  dispatch({ type: 'REFRESH_MESH' });
                }}
              />
            </div>
          </div>

          {result && result.beamForces.has(selectedBeam.id) && (
            <div className="result-info">
              <h4>Internal Forces</h4>
              {(() => {
                const forces = result.beamForces.get(selectedBeam.id)!;
                return (
                  <>
                    <p><strong>M_max:</strong> {formatMoment(forces.maxM)}</p>
                    <p><strong>V_max:</strong> {formatForce(forces.maxV)}</p>
                    <p><strong>N_max:</strong> {formatForce(forces.maxN)}</p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {selectedElement && !selectedBeam && (
        <div className="panel-section">
          <h3>Element #{selectedElement.id}</h3>
          <div className="form-group">
            <label>Material</label>
            <select
              value={selectedElement.materialId}
              onChange={(e) => {
                mesh.updateElement(selectedElement.id, { materialId: parseInt(e.target.value) });
                dispatch({ type: 'REFRESH_MESH' });
              }}
            >
              {Array.from(mesh.materials.values()).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Thickness (m)</label>
            <input
              type="number"
              value={selectedElement.thickness}
              step="0.001"
              min="0.001"
              onChange={(e) => {
                mesh.updateElement(selectedElement.id, { thickness: parseFloat(e.target.value) || 0.01 });
                dispatch({ type: 'REFRESH_MESH' });
              }}
            />
          </div>

          {result && result.elementStresses.has(selectedElement.id) && (
            <div className="result-info">
              <h4>{analysisType === 'plate_bending' ? 'Moments' : 'Stresses'}</h4>
              {(() => {
                const stress = result.elementStresses.get(selectedElement.id)!;
                if (analysisType === 'plate_bending') {
                  return (
                    <>
                      <p><strong>mx:</strong> {formatMomentPerLength(stress.mx ?? 0)}</p>
                      <p><strong>my:</strong> {formatMomentPerLength(stress.my ?? 0)}</p>
                      <p><strong>mxy:</strong> {formatMomentPerLength(stress.mxy ?? 0)}</p>
                    </>
                  );
                }
                return (
                  <>
                    <p><strong>sigma_x:</strong> {formatStress(stress.sigmaX)}</p>
                    <p><strong>sigma_y:</strong> {formatStress(stress.sigmaY)}</p>
                    <p><strong>tau_xy:</strong> {formatStress(stress.tauXY)}</p>
                    <p><strong>Von Mises:</strong> {formatStress(stress.vonMises)}</p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="panel-section">
          <h3>Visualization</h3>
          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={showDeformed}
              onChange={(e) => dispatch({ type: 'SET_SHOW_DEFORMED', payload: e.target.checked })}
            />
            <label>Show Deformed</label>
          </div>
          <div className="form-group">
            <label>Deformation Scale</label>
            <input
              type="range"
              min="1"
              max="1000"
              value={deformationScale}
              onChange={(e) => dispatch({ type: 'SET_DEFORMATION_SCALE', payload: parseInt(e.target.value) })}
            />
            <span className="scale-value">{deformationScale}x</span>
          </div>

          {analysisType === 'frame' && (
            <div className="form-group">
              <label>Diagram Scale</label>
              <input
                type="range"
                min="10"
                max="200"
                value={diagramScale}
                onChange={(e) => dispatch({ type: 'SET_DIAGRAM_SCALE', payload: parseInt(e.target.value) })}
              />
              <span className="scale-value">{diagramScale}</span>
            </div>
          )}

          {analysisType !== 'frame' && (
            <>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  checked={showStress}
                  onChange={(e) => dispatch({ type: 'SET_SHOW_STRESS', payload: e.target.checked })}
                />
                <label>Show Stresses</label>
              </div>
              <div className="form-group">
                <label>Component</label>
                <select
                  value={stressType}
                  onChange={(e) => dispatch({
                    type: 'SET_STRESS_TYPE',
                    payload: e.target.value as any
                  })}
                >
                  {analysisType === 'plate_bending' ? (
                    <>
                      <option value="mx">mx (bending)</option>
                      <option value="my">my (bending)</option>
                      <option value="mxy">mxy (twist)</option>
                    </>
                  ) : (
                    <>
                      <option value="vonMises">Von Mises</option>
                      <option value="sigmaX">sigma_x</option>
                      <option value="sigmaY">sigma_y</option>
                      <option value="tauXY">tau_xy</option>
                    </>
                  )}
                </select>
              </div>

              <div className="color-scale">
                <div className="scale-bar">
                  {generateColorScale(result.minVonMises, result.maxVonMises, 10).map((item, i) => (
                    <div
                      key={i}
                      className="scale-segment"
                      style={{ background: item.color }}
                    />
                  ))}
                </div>
                <div className="scale-labels">
                  <span>{formatStress(result.minVonMises)}</span>
                  <span>{formatStress(result.maxVonMises)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {result && analysisType === 'frame' && (
        <div className="panel-section">
          <h3>Reactions</h3>
          {Array.from(mesh.nodes.values())
            .filter(n => n.constraints.x || n.constraints.y || n.constraints.rotation)
            .map(node => {
              const idx = nodeIdToIndex.get(node.id);
              if (idx === undefined) return null;

              const Rx = node.constraints.x ? result.reactions[idx * 3] : 0;
              const Ry = node.constraints.y ? result.reactions[idx * 3 + 1] : 0;
              const Rm = node.constraints.rotation ? result.reactions[idx * 3 + 2] : 0;

              return (
                <div key={node.id} className="reaction-item">
                  <strong>Node {node.id}:</strong>
                  {node.constraints.x && <span> Rx = {formatForce(Rx)}</span>}
                  {node.constraints.y && <span> Ry = {formatForce(Ry)}</span>}
                  {node.constraints.rotation && <span> Rm = {formatMoment(Rm)}</span>}
                </div>
              );
            })}
        </div>
      )}

      <div className="panel-section">
        <h3>Materials</h3>
        {Array.from(mesh.materials.values()).slice(0, 5).map(m => (
          <div key={m.id} className="material-item">
            <div
              className="material-color"
              style={{ background: m.color }}
            />
            <div className="material-info">
              <span className="material-name">{m.name}</span>
              <span className="material-props">
                E: {formatModulus(m.E)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
