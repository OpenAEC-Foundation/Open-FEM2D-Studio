import { useState } from 'react';
import { useFEM } from '../../context/FEMContext';
import { DEFAULT_SECTIONS, calculateBeamLength } from '../../core/fem/Beam';
import { NodePropertiesDialog } from '../NodePropertiesDialog/NodePropertiesDialog';
import { BarPropertiesDialog } from '../BarPropertiesDialog/BarPropertiesDialog';
import {
  ChevronRight, ChevronLeft, FolderOpen, CircleDot, Circle, Minus,
  Triangle, Diamond, Palette, Square, Box, RectangleHorizontal,
  ArrowDown, ClipboardList, BarChart3, TrendingUp, Move,
  Info
} from 'lucide-react';
import './ProjectBrowser.css';

type BrowserTab = 'project' | 'results';

interface ProjectBrowserProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ProjectBrowser({ collapsed, onToggleCollapse }: ProjectBrowserProps) {
  const { state, dispatch, pushUndo } = useFEM();
  const { mesh, selection, result, showMoment, showShear, showNormal, showDeflections, showDeformed, showReactions, loadCases, activeLoadCase } = state;

  const [activeTab, setActiveTab] = useState<BrowserTab>('project');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    model: true,
    nodes: true,
    members: true,
    supports: false,
    materials: false,
    sections: false,
    loads: true,
    diagrams: true,
    reactions: true,
    displacements: true
  });

  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [editingBarId, setEditingBarId] = useState<number | null>(null);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectNode = (nodeId: number) => {
    dispatch({
      type: 'SET_SELECTION',
      payload: { nodeIds: new Set([nodeId]), elementIds: new Set() }
    });
  };

  const selectElement = (elementId: number) => {
    dispatch({
      type: 'SET_SELECTION',
      payload: { nodeIds: new Set(), elementIds: new Set([elementId]) }
    });
  };

  const activateResultView = (opts: { moment?: boolean; shear?: boolean; normal?: boolean; deflections?: boolean; deformed?: boolean; reactions?: boolean }) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: 'results' });
    if (opts.moment !== undefined) dispatch({ type: 'SET_SHOW_MOMENT', payload: opts.moment });
    if (opts.shear !== undefined) dispatch({ type: 'SET_SHOW_SHEAR', payload: opts.shear });
    if (opts.normal !== undefined) dispatch({ type: 'SET_SHOW_NORMAL', payload: opts.normal });
    if (opts.deflections !== undefined) dispatch({ type: 'SET_SHOW_DEFLECTIONS', payload: opts.deflections });
    if (opts.deformed !== undefined) dispatch({ type: 'SET_SHOW_DEFORMED', payload: opts.deformed });
    if (opts.reactions !== undefined) dispatch({ type: 'SET_SHOW_REACTIONS', payload: opts.reactions });
  };

  const nodes = Array.from(mesh.nodes.values());
  const structuralNodes = nodes.filter(n => n.id < 1000);
  const plateNodes = nodes.filter(n => n.id >= 1000);
  const beams = Array.from(mesh.beamElements.values());
  const materials = Array.from(mesh.materials.values());
  const supportedNodes = nodes.filter(n => n.constraints.x || n.constraints.y || n.constraints.rotation);
  const loadedNodes = nodes.filter(n => n.loads.fx !== 0 || n.loads.fy !== 0 || n.loads.moment !== 0);

  const isResultActive = (check: string) => {
    if (state.viewMode !== 'results') return false;
    switch (check) {
      case 'moment': return showMoment;
      case 'shear': return showShear;
      case 'normal': return showNormal;
      case 'deflections': return showDeflections;
      case 'reactions': return showReactions;
      case 'displacement': return showDeformed;
      default: return false;
    }
  };

  if (collapsed) {
    return (
      <div className="project-browser collapsed-panel" onClick={onToggleCollapse}>
        <ChevronRight size={14} />
        <span className="collapsed-label">Browser</span>
      </div>
    );
  }

  return (
    <div className="project-browser">
      <div className="browser-header">
        {onToggleCollapse && (
          <button className="browser-collapse-btn" onClick={onToggleCollapse} title="Collapse">
            <ChevronLeft size={14} />
          </button>
        )}
        <span className="browser-title">Browser</span>
        <button
          className="project-info-btn"
          onClick={() => setShowProjectInfo(!showProjectInfo)}
          title="Project Information"
        >
          <Info size={14} />
        </button>
      </div>

      {/* Horizontal tabs */}
      <div className="browser-tabs">
        <button
          className={`browser-tab ${activeTab === 'project' ? 'active' : ''}`}
          onClick={() => setActiveTab('project')}
        >
          Project
        </button>
        <button
          className={`browser-tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>

      {showProjectInfo && (
        <div className="project-info-panel">
          <div className="project-info-row">
            <span className="project-info-label">Project</span>
            <span className="project-info-value">Untitled</span>
          </div>
          <div className="project-info-row">
            <span className="project-info-label">Nodes</span>
            <span className="project-info-value">{nodes.length}</span>
          </div>
          <div className="project-info-row">
            <span className="project-info-label">Members</span>
            <span className="project-info-value">{beams.length}</span>
          </div>
          <div className="project-info-row">
            <span className="project-info-label">Supports</span>
            <span className="project-info-value">{supportedNodes.length}</span>
          </div>
          <div className="project-info-row">
            <span className="project-info-label">Analysis</span>
            <span className="project-info-value">{state.analysisType}</span>
          </div>
          <div className="project-info-row">
            <span className="project-info-label">Status</span>
            <span className="project-info-value">{result ? 'Solved' : 'Not solved'}</span>
          </div>
        </div>
      )}

      <div className="browser-tree">
        {activeTab === 'project' && (
          <>
            {/* Model Section */}
            <div className="tree-section">
              <div className="tree-item root" onClick={() => toggleExpand('model')}>
                <span className={`tree-arrow ${expanded.model ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                <span className="tree-icon"><FolderOpen size={14} /></span>
                <span className="tree-label">Model</span>
              </div>

              {expanded.model && (
                <div className="tree-children">
                  {/* Nodes */}
                  <div className="tree-item" onClick={() => toggleExpand('nodes')}>
                    <span className={`tree-arrow ${expanded.nodes ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                    <span className="tree-icon"><CircleDot size={14} /></span>
                    <span className="tree-label">Nodes</span>
                    <span className="tree-count">{structuralNodes.length}</span>
                  </div>
                  {expanded.nodes && (
                    <div className="tree-children">
                      {structuralNodes.map(node => (
                        <div
                          key={node.id}
                          className={`tree-item leaf ${selection.nodeIds.has(node.id) ? 'selected' : ''}`}
                          onClick={() => selectNode(node.id)}
                          onDoubleClick={() => setEditingNodeId(node.id)}
                        >
                          <span className="tree-icon small"><Circle size={10} /></span>
                          <span className="tree-label">Node {node.id}</span>
                          <span className="tree-info">X:{(node.x * 1000).toFixed(0)} Z:{(node.y * 1000).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Plate Nodes */}
                  {plateNodes.length > 0 && (
                    <>
                      <div className="tree-item" onClick={() => toggleExpand('plateNodes' as keyof typeof expanded)}>
                        <span className={`tree-arrow ${(expanded as Record<string, boolean>)['plateNodes'] ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                        <span className="tree-icon" style={{ color: '#8b949e' }}><CircleDot size={14} /></span>
                        <span className="tree-label" style={{ color: '#8b949e' }}>Plate Nodes</span>
                        <span className="tree-count">{plateNodes.length}</span>
                      </div>
                      {(expanded as Record<string, boolean>)['plateNodes'] && (
                        <div className="tree-children">
                          {plateNodes.map(node => (
                            <div
                              key={node.id}
                              className={`tree-item leaf ${selection.nodeIds.has(node.id) ? 'selected' : ''}`}
                              onClick={() => selectNode(node.id)}
                            >
                              <span className="tree-icon small" style={{ color: '#8b949e' }}><Circle size={8} /></span>
                              <span className="tree-label" style={{ color: '#8b949e' }}>Node {node.id}</span>
                              <span className="tree-info">X:{(node.x * 1000).toFixed(0)} Z:{(node.y * 1000).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Members */}
                  <div className="tree-item" onClick={() => toggleExpand('members')}>
                    <span className={`tree-arrow ${expanded.members ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                    <span className="tree-icon"><Minus size={14} /></span>
                    <span className="tree-label">Members</span>
                    <span className="tree-count">{beams.length}</span>
                  </div>
                  {expanded.members && (
                    <div className="tree-children">
                      {beams.map(beam => {
                        const n1 = mesh.getNode(beam.nodeIds[0]);
                        const n2 = mesh.getNode(beam.nodeIds[1]);
                        return (
                          <div
                            key={beam.id}
                            className={`tree-item leaf ${selection.elementIds.has(beam.id) ? 'selected' : ''}`}
                            onClick={() => selectElement(beam.id)}
                            onDoubleClick={() => setEditingBarId(beam.id)}
                          >
                            <span className="tree-icon small"><Minus size={10} /></span>
                            <span className="tree-label">Beam {beam.id}</span>
                            <span className="tree-info">{n1?.id}-{n2?.id}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Supports */}
                  <div className="tree-item" onClick={() => toggleExpand('supports')}>
                    <span className={`tree-arrow ${expanded.supports ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                    <span className="tree-icon"><Triangle size={14} /></span>
                    <span className="tree-label">Supports</span>
                    <span className="tree-count">{supportedNodes.length}</span>
                  </div>
                  {expanded.supports && (
                    <div className="tree-children">
                      {supportedNodes.map(node => {
                        let type = 'Custom';
                        if (node.constraints.x && node.constraints.y && node.constraints.rotation) {
                          type = 'Fixed';
                        } else if (node.constraints.x && node.constraints.y) {
                          type = 'Pinned';
                        } else if (node.constraints.y) {
                          type = 'Roller Z';
                        } else if (node.constraints.x) {
                          type = 'Roller X';
                        }
                        return (
                          <div
                            key={node.id}
                            className={`tree-item leaf ${selection.nodeIds.has(node.id) ? 'selected' : ''}`}
                            onClick={() => selectNode(node.id)}
                          >
                            <span className="tree-icon small"><Diamond size={10} /></span>
                            <span className="tree-label">Node {node.id}</span>
                            <span className="tree-info">{type}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Materials */}
                  <div className="tree-item" onClick={() => toggleExpand('materials')}>
                    <span className={`tree-arrow ${expanded.materials ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                    <span className="tree-icon"><Palette size={14} /></span>
                    <span className="tree-label">Materials</span>
                    <span className="tree-count">{materials.length}</span>
                  </div>
                  {expanded.materials && (
                    <div className="tree-children">
                      {materials.slice(0, 5).map(mat => (
                        <div key={mat.id} className="tree-item leaf">
                          <span className="tree-icon small" style={{ color: mat.color }}><Square size={10} /></span>
                          <span className="tree-label">{mat.name}</span>
                          <span className="tree-info">E={mat.E / 1e9}GPa</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sections */}
                  <div className="tree-item" onClick={() => toggleExpand('sections')}>
                    <span className={`tree-arrow ${expanded.sections ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                    <span className="tree-icon"><Box size={14} /></span>
                    <span className="tree-label">Sections</span>
                    <span className="tree-count">{DEFAULT_SECTIONS.length}</span>
                  </div>
                  {expanded.sections && (
                    <div className="tree-children">
                      {DEFAULT_SECTIONS.map(sec => (
                        <div key={sec.name} className="tree-item leaf">
                          <span className="tree-icon small"><RectangleHorizontal size={10} /></span>
                          <span className="tree-label">{sec.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Loads Section */}
            <div className="tree-section">
              <div className="tree-item root" onClick={() => toggleExpand('loads')}>
                <span className={`tree-arrow ${expanded.loads ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                <span className="tree-icon"><ArrowDown size={14} /></span>
                <span className="tree-label">Loads</span>
              </div>

              {expanded.loads && (
                <div className="tree-children">
                  {loadCases.map(lc => (
                    <div key={lc.id}>
                      <div
                        className={`tree-item ${activeLoadCase === lc.id ? 'active-result' : ''}`}
                        onClick={() => dispatch({ type: 'SET_ACTIVE_LOAD_CASE', payload: lc.id })}
                      >
                        <span className="tree-arrow" />
                        <span className="tree-icon"><ClipboardList size={14} /></span>
                        <span className="tree-label">{lc.name}</span>
                      </div>
                      {activeLoadCase === lc.id && (
                        <div className="tree-children">
                          {loadedNodes.map(node => (
                            <div
                              key={node.id}
                              className={`tree-item leaf ${selection.nodeIds.has(node.id) ? 'selected' : ''}`}
                              onClick={() => selectNode(node.id)}
                            >
                              <span className="tree-icon small"><ArrowDown size={10} /></span>
                              <span className="tree-label">Node {node.id}</span>
                              <span className="tree-info">
                                {node.loads.fy !== 0 && `Fz=${(node.loads.fy / 1000).toFixed(1)}kN`}
                              </span>
                            </div>
                          ))}
                          {beams.filter(b => b.distributedLoad).map(beam => (
                            <div
                              key={beam.id}
                              className={`tree-item leaf ${selection.elementIds.has(beam.id) ? 'selected' : ''}`}
                              onClick={() => selectElement(beam.id)}
                            >
                              <span className="tree-icon small"><ArrowDown size={10} /></span>
                              <span className="tree-label">Beam {beam.id}</span>
                              <span className="tree-info">
                                q={(beam.distributedLoad!.qy / 1000).toFixed(1)}kN/m
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'results' && (
          <>
            {/* Load Case Selector */}
            <div className="results-lc-selector">
              <span className="results-lc-label">Load Case</span>
              <select
                className="results-lc-select"
                value={activeLoadCase}
                onChange={(e) => dispatch({ type: 'SET_ACTIVE_LOAD_CASE', payload: parseInt(e.target.value) })}
              >
                {loadCases.map(lc => (
                  <option key={lc.id} value={lc.id}>{lc.name}</option>
                ))}
              </select>
            </div>

            {!result && (
              <div className="results-empty">
                <BarChart3 size={24} />
                <span>No results available</span>
                <span className="results-empty-hint">Run analysis to see results</span>
              </div>
            )}

            {result && (
              <>
                {/* Diagrams */}
                <div className="tree-section">
                  <div className="tree-item root" onClick={() => toggleExpand('diagrams')}>
                    <span className={`tree-arrow ${expanded.diagrams ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                    <span className="tree-icon"><BarChart3 size={14} /></span>
                    <span className="tree-label">Diagrams</span>
                  </div>

                  {expanded.diagrams && (
                    <div className="tree-children">
                      <div
                        className={`tree-item leaf result-option ${isResultActive('moment') ? 'active-result' : ''}`}
                        onClick={() => activateResultView({ moment: !showMoment })}
                      >
                        <span className="tree-icon small" style={{ color: '#ef4444' }}><TrendingUp size={10} /></span>
                        <span className="tree-label">Bending Moment (M)</span>
                      </div>
                      <div
                        className={`tree-item leaf result-option ${isResultActive('shear') ? 'active-result' : ''}`}
                        onClick={() => activateResultView({ shear: !showShear })}
                      >
                        <span className="tree-icon small" style={{ color: '#3b82f6' }}><TrendingUp size={10} /></span>
                        <span className="tree-label">Shear Force (V)</span>
                      </div>
                      <div
                        className={`tree-item leaf result-option ${isResultActive('normal') ? 'active-result' : ''}`}
                        onClick={() => activateResultView({ normal: !showNormal })}
                      >
                        <span className="tree-icon small" style={{ color: '#22c55e' }}><TrendingUp size={10} /></span>
                        <span className="tree-label">Normal Force (N)</span>
                      </div>
                      <div
                        className={`tree-item leaf result-option ${isResultActive('deflections') ? 'active-result' : ''}`}
                        onClick={() => activateResultView({ deflections: !showDeflections })}
                      >
                        <span className="tree-icon small" style={{ color: '#8b5cf6' }}><Move size={10} /></span>
                        <span className="tree-label">Deflections (\u03B4)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reactions */}
                <div className="tree-section">
                  <div className="tree-item root" onClick={() => toggleExpand('reactions')}>
                    <span className={`tree-arrow ${expanded.reactions ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                    <span className="tree-icon"><Triangle size={14} /></span>
                    <span className="tree-label">Reactions</span>
                  </div>

                  {expanded.reactions && (
                    <div className="tree-children">
                      <div
                        className={`tree-item leaf result-option ${isResultActive('reactions') ? 'active-result' : ''}`}
                        onClick={() => activateResultView({ reactions: !showReactions })}
                      >
                        <span className="tree-icon small" style={{ color: '#10b981' }}><Triangle size={10} /></span>
                        <span className="tree-label">Show Reactions</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Displacements */}
                <div className="tree-section">
                  <div className="tree-item root" onClick={() => toggleExpand('displacements')}>
                    <span className={`tree-arrow ${expanded.displacements ? 'expanded' : ''}`}><ChevronRight size={12} /></span>
                    <span className="tree-icon"><Move size={14} /></span>
                    <span className="tree-label">Displacements</span>
                  </div>

                  {expanded.displacements && (
                    <div className="tree-children">
                      <div
                        className={`tree-item leaf result-option ${isResultActive('displacement') ? 'active-result' : ''}`}
                        onClick={() => activateResultView({ deformed: !showDeformed })}
                      >
                        <span className="tree-icon small" style={{ color: '#f59e0b' }}><Move size={10} /></span>
                        <span className="tree-label">Deformed Shape</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
      {editingNodeId !== null && (() => {
        const node = mesh.getNode(editingNodeId);
        if (!node) return null;
        return (
          <NodePropertiesDialog
            node={node}
            onUpdate={(updates) => {
              pushUndo();
              if (updates.x !== undefined || updates.y !== undefined) {
                mesh.updateNode(editingNodeId, {
                  x: updates.x ?? node.x,
                  y: updates.y ?? node.y
                });
              }
              if (updates.constraints) {
                mesh.updateNode(editingNodeId, { constraints: updates.constraints });
              }
              dispatch({ type: 'REFRESH_MESH' });
              dispatch({ type: 'SET_RESULT', payload: null });
            }}
            onClose={() => setEditingNodeId(null)}
          />
        );
      })()}
      {editingBarId !== null && (() => {
        const beam = mesh.getBeamElement(editingBarId);
        if (!beam) return null;
        const nodes = mesh.getBeamElementNodes(beam);
        if (!nodes) return null;
        const length = calculateBeamLength(nodes[0], nodes[1]);
        const beamMaterial = mesh.getMaterial(beam.materialId);
        const editBarForces = result?.beamForces.get(editingBarId);
        return (
          <BarPropertiesDialog
            beam={beam}
            length={length}
            material={beamMaterial}
            beamForces={editBarForces}
            onUpdate={(updates) => {
              pushUndo();
              mesh.updateBeamElement(editingBarId, updates);
              dispatch({ type: 'REFRESH_MESH' });
              dispatch({ type: 'SET_RESULT', payload: null });
            }}
            onClose={() => setEditingBarId(null)}
          />
        );
      })()}
    </div>
  );
}
