import { useFEM } from '../../context/FEMContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './VisibilityPanel.css';

interface VisibilityPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function VisibilityPanel({ collapsed, onToggleCollapse }: VisibilityPanelProps) {
  const { state, dispatch } = useFEM();
  const {
    showDeformed,
    deformationScale,
    showMoment,
    showShear,
    showNormal,
    diagramScale,
    result,
    analysisType,
    gridSize,
    snapToGrid,
    showProfileNames,
    showReactions,
    showDimensions,
    showNodes,
    showMembers,
    showSupports,
    showLoads,
    showNodeLabels,
    showMemberLabels,
    forceUnit,
    autoRecalculate,
    viewState
  } = state;

  const handleZoomIn = () => {
    const newScale = Math.min(500, viewState.scale * 1.2);
    dispatch({ type: 'SET_VIEW_STATE', payload: { scale: newScale } });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(10, viewState.scale * 0.8);
    dispatch({ type: 'SET_VIEW_STATE', payload: { scale: newScale } });
  };

  const handleFitAll = () => {
    dispatch({ type: 'SET_VIEW_STATE', payload: { offsetX: 150, offsetY: 350, scale: 80 } });
  };

  if (collapsed) {
    return (
      <div className="visibility-panel collapsed-panel" onClick={onToggleCollapse}>
        <span className="collapsed-label">Display Settings</span>
        <ChevronLeft size={14} />
      </div>
    );
  }

  return (
    <div className="visibility-panel">
      <div className="panel-header">
        <span className="panel-title">Display Settings</span>
        {onToggleCollapse && (
          <button className="panel-collapse-btn" onClick={onToggleCollapse} title="Collapse">
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="panel-content">
        {/* Grid Settings */}
        <div className="panel-section">
          <div className="section-title">Grid</div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => dispatch({ type: 'SET_SNAP_TO_GRID', payload: e.target.checked })}
              />
              <span className="toggle-text">Snap to Grid</span>
            </label>
          </div>
          <div className="slider-row">
            <span className="slider-label">Grid Size</span>
            <input
              type="number"
              min="10"
              max="1000"
              step="10"
              value={Math.round(gridSize * 1000)}
              onChange={(e) => {
                const mm = parseInt(e.target.value);
                if (!isNaN(mm) && mm >= 10 && mm <= 1000) {
                  dispatch({ type: 'SET_GRID_SIZE', payload: mm / 1000 });
                }
              }}
              className="grid-size-input"
            />
            <span className="slider-value">mm</span>
          </div>
        </div>

        {/* Display Elements */}
        <div className="panel-section">
          <div className="section-title">Show Elements</div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showNodes}
                onChange={(e) => dispatch({ type: 'SET_SHOW_NODES', payload: e.target.checked })}
              />
              <span className="toggle-text">Nodes</span>
            </label>
          </div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showMembers}
                onChange={(e) => dispatch({ type: 'SET_SHOW_MEMBERS', payload: e.target.checked })}
              />
              <span className="toggle-text">Members</span>
            </label>
          </div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showSupports}
                onChange={(e) => dispatch({ type: 'SET_SHOW_SUPPORTS', payload: e.target.checked })}
              />
              <span className="toggle-text">Supports</span>
            </label>
          </div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showLoads}
                onChange={(e) => dispatch({ type: 'SET_SHOW_LOADS', payload: e.target.checked })}
              />
              <span className="toggle-text">Loads</span>
            </label>
          </div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showNodeLabels}
                onChange={(e) => dispatch({ type: 'SET_SHOW_NODE_LABELS', payload: e.target.checked })}
              />
              <span className="toggle-text">Node Labels</span>
            </label>
          </div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showMemberLabels}
                onChange={(e) => dispatch({ type: 'SET_SHOW_MEMBER_LABELS', payload: e.target.checked })}
              />
              <span className="toggle-text">Member Labels</span>
            </label>
          </div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showProfileNames}
                onChange={(e) => dispatch({ type: 'SET_SHOW_PROFILE_NAMES', payload: e.target.checked })}
              />
              <span className="toggle-text">Profile Names</span>
            </label>
          </div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showDimensions}
                onChange={(e) => dispatch({ type: 'SET_SHOW_DIMENSIONS', payload: e.target.checked })}
              />
              <span className="toggle-text">Dimensions</span>
            </label>
          </div>
        </div>

        {/* Units */}
        <div className="panel-section">
          <div className="section-title">Units</div>
          <div className="slider-row">
            <span className="slider-label">Force</span>
            <select
              className="unit-select"
              value={forceUnit}
              onChange={(e) => dispatch({ type: 'SET_FORCE_UNIT', payload: e.target.value as 'N' | 'kN' })}
            >
              <option value="kN">kN</option>
              <option value="N">N</option>
            </select>
          </div>
        </div>

        {/* Auto-recalculate */}
        <div className="panel-section">
          <div className="section-title">Solver</div>
          <div className="toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={autoRecalculate}
                onChange={(e) => dispatch({ type: 'SET_AUTO_RECALCULATE', payload: e.target.checked })}
              />
              <span className="toggle-text">Auto-recalculate</span>
            </label>
          </div>
        </div>

        {/* Results Visibility */}
        {result && (
          <div className="panel-section">
            <div className="section-title">Results</div>

            <div className="toggle-row">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showDeformed}
                  onChange={(e) => dispatch({ type: 'SET_SHOW_DEFORMED', payload: e.target.checked })}
                />
                <span className="toggle-text">Deformed Shape</span>
              </label>
            </div>

            {showDeformed && (
              <div className="slider-row">
                <span className="slider-label">Scale</span>
                <input
                  type="range"
                  min="1"
                  max="500"
                  value={deformationScale}
                  onChange={(e) => dispatch({ type: 'SET_DEFORMATION_SCALE', payload: parseInt(e.target.value) })}
                />
                <span className="slider-value">{deformationScale}x</span>
              </div>
            )}

            <div className="toggle-row">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showReactions}
                  onChange={(e) => dispatch({ type: 'SET_SHOW_REACTIONS', payload: e.target.checked })}
                />
                <span className="toggle-text">Reactions</span>
              </label>
            </div>

            {analysisType === 'frame' && (
              <>
                <div className="subsection-title">Diagrams</div>
                <div className="diagram-options">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showMoment}
                      onChange={(e) => dispatch({ type: 'SET_SHOW_MOMENT', payload: e.target.checked })}
                    />
                    <span className="toggle-text" style={{ color: '#ef4444' }}>Bending Moment (M)</span>
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showShear}
                      onChange={(e) => dispatch({ type: 'SET_SHOW_SHEAR', payload: e.target.checked })}
                    />
                    <span className="toggle-text" style={{ color: '#3b82f6' }}>Shear Force (V)</span>
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showNormal}
                      onChange={(e) => dispatch({ type: 'SET_SHOW_NORMAL', payload: e.target.checked })}
                    />
                    <span className="toggle-text" style={{ color: '#22c55e' }}>Normal Force (N)</span>
                  </label>
                </div>

                {(showMoment || showShear || showNormal) && (
                  <div className="slider-row">
                    <span className="slider-label">Diagram Scale</span>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={diagramScale}
                      onChange={(e) => dispatch({ type: 'SET_DIAGRAM_SCALE', payload: parseInt(e.target.value) })}
                    />
                    <span className="slider-value">{diagramScale}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="panel-section">
          <div className="section-title">Quick Actions</div>
          <div className="quick-buttons">
            <button className="quick-button" onClick={handleZoomIn}>Zoom In</button>
            <button className="quick-button" onClick={handleZoomOut}>Zoom Out</button>
            <button className="quick-button" onClick={handleFitAll}>Fit All</button>
          </div>
        </div>
      </div>
    </div>
  );
}
