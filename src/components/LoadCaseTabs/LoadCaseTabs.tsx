import { useFEM, ViewMode } from '../../context/FEMContext';
import { Ruler, ArrowDown, BarChart3 } from 'lucide-react';
import './LoadCaseTabs.css';

export function LoadCaseTabs() {
  const { state, dispatch } = useFEM();
  const { viewMode, activeLoadCase, mesh, result, loadCases } = state;

  const setViewMode = (mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const setActiveLoadCase = (id: number) => {
    dispatch({ type: 'SET_ACTIVE_LOAD_CASE', payload: id });
  };

  const nodes = Array.from(mesh.nodes.values());
  const nodeCount = nodes.length;
  const elementCount = mesh.beamElements.size + mesh.elements.size;
  const supportCount = nodes.filter(n =>
    n.constraints && (n.constraints.x || n.constraints.y || n.constraints.rotation)
  ).length;

  return (
    <div className="loadcase-tabs">
      {/* View Mode Switcher */}
      <div className="view-mode-tabs">
        <button
          className={`view-mode-tab ${viewMode === 'geometry' ? 'active' : ''}`}
          onClick={() => setViewMode('geometry')}
        >
          <span className="tab-icon"><Ruler size={14} /></span>
          <span className="tab-name">Geometry</span>
        </button>
        <button
          className={`view-mode-tab ${viewMode === 'loads' ? 'active' : ''}`}
          onClick={() => setViewMode('loads')}
        >
          <span className="tab-icon"><ArrowDown size={14} /></span>
          <span className="tab-name">Loads</span>
        </button>
        <button
          className={`view-mode-tab ${viewMode === 'results' ? 'active' : ''}`}
          onClick={() => setViewMode('results')}
          disabled={!result}
          title={!result ? 'Run analysis first' : 'View results'}
        >
          <span className="tab-icon"><BarChart3 size={14} /></span>
          <span className="tab-name">Results</span>
        </button>
      </div>

      {/* Load Case Tabs - only show when in loads view */}
      {viewMode === 'loads' && (
        <div className="tabs-container">
          {loadCases.map(lc => (
            <button
              key={lc.id}
              className={`loadcase-tab ${activeLoadCase === lc.id ? 'active' : ''}`}
              onClick={() => setActiveLoadCase(lc.id)}
              style={{ borderLeftColor: lc.color }}
            >
              <span className="tab-name">{lc.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Status Info */}
      <div className="tabs-info">
        <span className="info-item">
          <span className="info-label">Nodes:</span>
          <span className="info-value">{nodeCount}</span>
        </span>
        <span className="info-separator">|</span>
        <span className="info-item">
          <span className="info-label">Members:</span>
          <span className="info-value">{elementCount}</span>
        </span>
        <span className="info-separator">|</span>
        <span className="info-item">
          <span className="info-label">Supports:</span>
          <span className="info-value">{supportCount}</span>
        </span>
        <span className="info-separator">|</span>
        <span className="info-item status-ready">
          <span className="status-dot" style={{ background: result ? 'var(--success)' : 'var(--warning)' }} />
          <span>{result ? 'Solved' : 'Ready'}</span>
        </span>
      </div>
    </div>
  );
}
