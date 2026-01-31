import { useState } from 'react';
import { useFEM } from '../../context/FEMContext';
import { applyLoadCaseToMesh } from '../../context/FEMContext';
import { Tool, AnalysisType } from '../../core/fem/types';
import { solveNonlinear } from '../../core/solver/NonlinearSolver';
import { runAllVerificationTests, printVerificationReport } from '../../core/solver/VerificationTests';
import { exportToIfc, downloadIfc } from '../../core/export/IfcExporter';
import {
  MousePointer2, Hand, Minus, CircleDot,
  Triangle, ArrowLeftFromLine, Circle, ArrowDownUp, RotateCcw, ArrowLeftRight, Square,
  ArrowDown, Trash2, Move,
  Play, FastForward, CheckCircle, GripVertical,
  BarChart3, FileText, Copy,
  Undo2, Redo2, Layers, Combine,
  Settings, Info, Download, Save, FolderOpen, Grid3X3, Bot
} from 'lucide-react';
import { serializeProject } from '../../core/io/ProjectSerializer';
import { deserializeProject } from '../../core/io/ProjectSerializer';
import './Ribbon.css';

type RibbonTab = 'home' | 'settings' | 'standards';

interface RibbonProps {
  onShowLoadCaseDialog?: () => void;
  onShowCombinationDialog?: () => void;
  onShowProjectInfoDialog?: () => void;
  onShowStandardsDialog?: () => void;
  onShowGridsDialog?: () => void;
  onToggleAgent?: () => void;
  showAgentPanel?: boolean;
}

export function Ribbon({ onShowLoadCaseDialog, onShowCombinationDialog, onShowProjectInfoDialog, onShowStandardsDialog, onShowGridsDialog, onToggleAgent, showAgentPanel }: RibbonProps) {
  const { state, dispatch, pushUndo } = useFEM();
  const { selectedTool, mesh, analysisType, undoStack, redoStack, loadCases, activeLoadCase } = state;
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');

  const handleSolve = (geometric: boolean = false) => {
    try {
      // Apply active load case to mesh before solving
      const activeLc = loadCases.find(lc => lc.id === activeLoadCase);
      if (activeLc) {
        applyLoadCaseToMesh(mesh, activeLc);
      }

      const result = solveNonlinear(mesh, {
        analysisType,
        geometricNonlinear: geometric
      });
      dispatch({ type: 'SET_RESULT', payload: result });
      dispatch({ type: 'SET_SHOW_DEFORMED', payload: true });
      dispatch({ type: 'SET_VIEW_MODE', payload: 'results' });
      if (analysisType === 'frame') {
        dispatch({ type: 'SET_SHOW_MOMENT', payload: true });
      }
    } catch (e) {
      alert(`Solver error: ${(e as Error).message}`);
    }
  };

  const selectTool = (tool: Tool) => {
    dispatch({ type: 'SET_TOOL', payload: tool });
  };

  const handleDemo1 = () => {
    pushUndo();
    mesh.clear();
    const n1 = mesh.addNode(0, 0);
    const n2 = mesh.addNode(3, 0);
    const n3 = mesh.addNode(6, 0);
    mesh.updateNode(n1.id, { constraints: { x: true, y: true, rotation: false } });
    mesh.updateNode(n3.id, { constraints: { x: false, y: true, rotation: false } });
    mesh.updateNode(n2.id, { loads: { fx: 0, fy: -10000, moment: 0 } });
    const ipe200 = { A: 28.5e-4, I: 1940e-8, h: 0.200 };
    mesh.addBeamElement([n1.id, n2.id], 1, ipe200);
    mesh.addBeamElement([n2.id, n3.id], 1, ipe200);
    // Update load cases for demo
    dispatch({
      type: 'SET_LOAD_CASES',
      payload: [
        { id: 1, name: 'Dead Load (G)', type: 'dead' as const, pointLoads: [{ nodeId: n2.id, fx: 0, fy: -10000, mz: 0 }], distributedLoads: [], color: '#6b7280' },
        { id: 2, name: 'Live Load (Q)', type: 'live' as const, pointLoads: [], distributedLoads: [], color: '#3b82f6' }
      ]
    });
    dispatch({ type: 'SET_ANALYSIS_TYPE', payload: 'frame' });
    dispatch({ type: 'REFRESH_MESH' });
    dispatch({ type: 'SET_RESULT', payload: null });
  };

  const handleDemo2 = () => {
    pushUndo();
    mesh.clear();
    const n1 = mesh.addNode(0, 0);
    const n2 = mesh.addNode(4, 0);
    const n3 = mesh.addNode(8, 0);
    mesh.updateNode(n1.id, { constraints: { x: true, y: true, rotation: false } });
    mesh.updateNode(n2.id, { constraints: { x: false, y: true, rotation: false } });
    mesh.updateNode(n3.id, { constraints: { x: false, y: true, rotation: false } });
    const ipe300 = { A: 53.8e-4, I: 8360e-8, h: 0.300 };
    const beam1 = mesh.addBeamElement([n1.id, n2.id], 1, ipe300);
    mesh.addBeamElement([n2.id, n3.id], 1, ipe300);
    if (beam1) {
      mesh.updateBeamElement(beam1.id, { distributedLoad: { qx: 0, qy: -5000 } });
    }
    dispatch({
      type: 'SET_LOAD_CASES',
      payload: [
        { id: 1, name: 'Dead Load (G)', type: 'dead' as const, pointLoads: [], distributedLoads: beam1 ? [{ elementId: beam1.id, qx: 0, qy: -5000 }] : [], color: '#6b7280' },
        { id: 2, name: 'Live Load (Q)', type: 'live' as const, pointLoads: [], distributedLoads: [], color: '#3b82f6' }
      ]
    });
    dispatch({ type: 'SET_ANALYSIS_TYPE', payload: 'frame' });
    dispatch({ type: 'REFRESH_MESH' });
    dispatch({ type: 'SET_RESULT', payload: null });
  };

  const handleDemo3 = () => {
    pushUndo();
    mesh.clear();
    const n1 = mesh.addNode(0, 0);
    const n2 = mesh.addNode(0, 4);
    const n3 = mesh.addNode(6, 4);
    const n4 = mesh.addNode(6, 0);
    mesh.updateNode(n1.id, { constraints: { x: true, y: true, rotation: true } });
    mesh.updateNode(n4.id, { constraints: { x: true, y: true, rotation: true } });
    const hea200 = { A: 53.8e-4, I: 3690e-8, h: 0.190 };
    mesh.addBeamElement([n1.id, n2.id], 1, hea200);
    const beam = mesh.addBeamElement([n2.id, n3.id], 1, hea200);
    mesh.addBeamElement([n3.id, n4.id], 1, hea200);
    if (beam) {
      mesh.updateBeamElement(beam.id, { distributedLoad: { qx: 0, qy: -8000 } });
    }
    dispatch({
      type: 'SET_LOAD_CASES',
      payload: [
        { id: 1, name: 'Dead Load (G)', type: 'dead' as const, pointLoads: [], distributedLoads: beam ? [{ elementId: beam.id, qx: 0, qy: -8000 }] : [], color: '#6b7280' },
        { id: 2, name: 'Live Load (Q)', type: 'live' as const, pointLoads: [], distributedLoads: [], color: '#3b82f6' }
      ]
    });
    dispatch({ type: 'SET_ANALYSIS_TYPE', payload: 'frame' });
    dispatch({ type: 'REFRESH_MESH' });
    dispatch({ type: 'SET_RESULT', payload: null });
  };

  const handleExportIfc = () => {
    const content = exportToIfc(mesh, state.projectInfo, loadCases);
    const filename = (state.projectInfo.name || 'project').replace(/\s+/g, '-').toLowerCase() + '.ifc';
    downloadIfc(content, filename);
  };

  const handleSaveProject = async () => {
    const json = serializeProject(
      mesh,
      loadCases,
      state.loadCombinations,
      state.projectInfo,
      state.structuralGrid
    );
    const filename = (state.projectInfo.name || 'project').replace(/\s+/g, '-').toLowerCase() + '.fem2d.json';

    // Try File System Access API first
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'FEM2D Project',
            accept: { 'application/json': ['.fem2d.json', '.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (e) {
        // User cancelled or API not supported, fall through to blob download
        if ((e as Error).name === 'AbortError') return;
      }
    }

    // Fallback: blob download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fem2d.json,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = deserializeProject(reader.result as string);
          dispatch({ type: 'LOAD_PROJECT', payload: result });
        } catch (err) {
          alert(`Failed to open project: ${(err as Error).message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="ribbon">
      {/* Ribbon Tabs */}
      <div className="ribbon-tabs">
        <button
          className={`ribbon-tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button
          className={`ribbon-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`ribbon-tab ${activeTab === 'standards' ? 'active' : ''}`}
          onClick={() => setActiveTab('standards')}
        >
          Standards
        </button>
      </div>

      {/* Ribbon Content */}
      <div className="ribbon-content">
        {activeTab === 'home' && (
          <>
            {/* File */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">File</div>
              <div className="ribbon-group-content">
                <button className="ribbon-button small" onClick={handleSaveProject} title="Save Project">
                  <span className="ribbon-icon"><Save size={14} /></span>
                  <span>Save As</span>
                </button>
                <button className="ribbon-button small" onClick={handleOpenProject} title="Open Project">
                  <span className="ribbon-icon"><FolderOpen size={14} /></span>
                  <span>Open</span>
                </button>
                <button className="ribbon-button small" onClick={handleExportIfc} title="Export IFC">
                  <span className="ribbon-icon"><Download size={14} /></span>
                  <span>IFC</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Draw */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Draw</div>
              <div className="ribbon-group-content grid-2x2">
                <button
                  className={`ribbon-button small ${selectedTool === 'select' ? 'active' : ''}`}
                  onClick={() => selectTool('select')}
                  title="Select (V)"
                >
                  <span className="ribbon-icon"><MousePointer2 size={14} /></span>
                  <span>Select</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addBeam' ? 'active' : ''}`}
                  onClick={() => selectTool('addBeam')}
                  title="Draw Bar (B)"
                >
                  <span className="ribbon-icon"><Minus size={14} /></span>
                  <span>Bar</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'pan' ? 'active' : ''}`}
                  onClick={() => selectTool('pan')}
                  title="Pan (H)"
                >
                  <span className="ribbon-icon"><Hand size={14} /></span>
                  <span>Pan</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addNode' ? 'active' : ''}`}
                  onClick={() => selectTool('addNode')}
                  title="Add Node (N)"
                >
                  <span className="ribbon-icon"><CircleDot size={14} /></span>
                  <span>Node</span>
                </button>
                <button
                  className="ribbon-button small"
                  onClick={onShowGridsDialog}
                  title="Structural Grids"
                >
                  <span className="ribbon-icon"><Grid3X3 size={14} /></span>
                  <span>Grids</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Boundary Conditions */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Boundary Conditions</div>
              <div className="ribbon-group-content wrap">
                <button
                  className={`ribbon-button small ${selectedTool === 'addPinned' ? 'active' : ''}`}
                  onClick={() => selectTool('addPinned')}
                  title="Pinned support"
                >
                  <span className="ribbon-icon"><Triangle size={14} /></span>
                  <span>Pinned</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addXRoller' ? 'active' : ''}`}
                  onClick={() => selectTool('addXRoller')}
                  title="X-Roller"
                >
                  <span className="ribbon-icon"><ArrowLeftFromLine size={14} /></span>
                  <span>X-Roller</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addZRoller' ? 'active' : ''}`}
                  onClick={() => selectTool('addZRoller')}
                  title="Z-Roller"
                >
                  <span className="ribbon-icon"><Circle size={14} /></span>
                  <span>Z-Roller</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addZSpring' ? 'active' : ''}`}
                  onClick={() => selectTool('addZSpring')}
                  title="Z-Spring"
                >
                  <span className="ribbon-icon"><ArrowDownUp size={14} /></span>
                  <span>Z-Spring</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addRotSpring' ? 'active' : ''}`}
                  onClick={() => selectTool('addRotSpring')}
                  title="Rotational Spring"
                >
                  <span className="ribbon-icon"><RotateCcw size={14} /></span>
                  <span>Rot.Spring</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addXSpring' ? 'active' : ''}`}
                  onClick={() => selectTool('addXSpring')}
                  title="X-Spring"
                >
                  <span className="ribbon-icon"><ArrowLeftRight size={14} /></span>
                  <span>X-Spring</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addFixed' ? 'active' : ''}`}
                  onClick={() => selectTool('addFixed')}
                  title="Fixed support"
                >
                  <span className="ribbon-icon"><Square size={14} /></span>
                  <span>Fixed</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Loads */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Loads</div>
              <div className="ribbon-group-content">
                <button
                  className={`ribbon-button small ${selectedTool === 'addLineLoad' ? 'active' : ''}`}
                  onClick={() => selectTool('addLineLoad')}
                  title="Line Load (L)"
                >
                  <span className="ribbon-icon line-load-icon">
                    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="1" y1="1" x2="17" y2="1" />
                      <line x1="3" y1="1" x2="3" y2="11" />
                      <line x1="3" y1="11" x2="1" y2="8.5" />
                      <line x1="3" y1="11" x2="5" y2="8.5" />
                      <line x1="9" y1="1" x2="9" y2="11" />
                      <line x1="9" y1="11" x2="7" y2="8.5" />
                      <line x1="9" y1="11" x2="11" y2="8.5" />
                      <line x1="15" y1="1" x2="15" y2="11" />
                      <line x1="15" y1="11" x2="13" y2="8.5" />
                      <line x1="15" y1="11" x2="17" y2="8.5" />
                    </svg>
                  </span>
                  <span>Line Load</span>
                </button>
                <button
                  className={`ribbon-button small ${selectedTool === 'addLoad' ? 'active' : ''}`}
                  onClick={() => selectTool('addLoad')}
                  title="Point Load (P)"
                >
                  <span className="ribbon-icon"><ArrowDown size={14} /></span>
                  <span>Point Load</span>
                </button>
                <button className="ribbon-button small" title="Moment Load">
                  <span className="ribbon-icon"><RotateCcw size={14} /></span>
                  <span>Moment</span>
                </button>
                <button
                  className="ribbon-button small"
                  title="Load Cases"
                  onClick={onShowLoadCaseDialog}
                >
                  <span className="ribbon-icon"><Layers size={14} /></span>
                  <span>Load Cases</span>
                </button>
                <button
                  className="ribbon-button small"
                  title="Load Combinations"
                  onClick={onShowCombinationDialog}
                >
                  <span className="ribbon-icon"><Combine size={14} /></span>
                  <span>Combinations</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Edit */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Edit</div>
              <div className="ribbon-group-content grid-3x2">
                <button className="ribbon-button small" title="Move (M)">
                  <span className="ribbon-icon"><Move size={14} /></span>
                  <span>Move</span>
                </button>
                <button
                  className="ribbon-button small"
                  onClick={() => dispatch({ type: 'UNDO' })}
                  disabled={undoStack.length === 0}
                  title="Undo (Ctrl+Z)"
                >
                  <span className="ribbon-icon"><Undo2 size={14} /></span>
                  <span>Undo</span>
                </button>
                <button className="ribbon-button small" title="Copy (Ctrl+C)">
                  <span className="ribbon-icon"><Copy size={14} /></span>
                  <span>Copy</span>
                </button>
                <button
                  className="ribbon-button small"
                  onClick={() => dispatch({ type: 'REDO' })}
                  disabled={redoStack.length === 0}
                  title="Redo (Ctrl+Y)"
                >
                  <span className="ribbon-icon"><Redo2 size={14} /></span>
                  <span>Redo</span>
                </button>
                <button
                  className={`ribbon-button small danger ${selectedTool === 'delete' ? 'active' : ''}`}
                  onClick={() => selectTool('delete')}
                  title="Delete (Del)"
                >
                  <span className="ribbon-icon"><Trash2 size={14} /></span>
                  <span>Delete</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* AI */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">AI</div>
              <div className="ribbon-group-content">
                <button
                  className={`ribbon-button small ${showAgentPanel ? 'active' : ''}`}
                  onClick={onToggleAgent}
                  title="AI Agent"
                >
                  <span className="ribbon-icon"><Bot size={14} /></span>
                  <span>Agent</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Calculate */}
            <div className="ribbon-group highlight">
              <div className="ribbon-group-title">Calculate</div>
              <div className="ribbon-group-content">
                <button className="ribbon-button primary" onClick={() => handleSolve(false)} title="Run Analysis (F5)">
                  <span className="ribbon-icon"><Play size={18} /></span>
                  <span>Solve</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <>
            {/* Project */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Project</div>
              <div className="ribbon-group-content">
                <button
                  className="ribbon-button small"
                  onClick={onShowProjectInfoDialog}
                  title="Project Information"
                >
                  <span className="ribbon-icon"><Info size={14} /></span>
                  <span>Project Info</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Calculation */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Calculation</div>
              <div className="ribbon-group-content">
                <select
                  className="ribbon-select"
                  value={analysisType}
                  onChange={(e) => {
                    dispatch({ type: 'SET_ANALYSIS_TYPE', payload: e.target.value as AnalysisType });
                    dispatch({ type: 'SET_RESULT', payload: null });
                  }}
                >
                  <option value="frame">2D Frame Analysis</option>
                  <option value="plane_stress">Plane Stress</option>
                  <option value="plane_strain">Plane Strain</option>
                </select>
                <button className="ribbon-button small" onClick={() => handleSolve(false)} title="Linear Analysis (F5)">
                  <span className="ribbon-icon"><Play size={14} /></span>
                  <span>Linear</span>
                </button>
                <button className="ribbon-button small" onClick={() => handleSolve(true)} title="P-Delta Analysis">
                  <span className="ribbon-icon"><FastForward size={14} /></span>
                  <span>P-Delta</span>
                </button>
                <button
                  className="ribbon-button small"
                  onClick={() => {
                    const results = runAllVerificationTests();
                    const report = printVerificationReport(results);
                    console.log(report);
                    const passed = results.filter(r => r.passed).length;
                    alert(`${passed}/${results.length} tests passed.\nSee console for details.`);
                  }}
                  title="Run Verification Tests"
                >
                  <span className="ribbon-icon"><CheckCircle size={14} /></span>
                  <span>Run Tests</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Reports */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Reports</div>
              <div className="ribbon-group-content">
                <button className="ribbon-button small" title="Results Table">
                  <span className="ribbon-icon"><BarChart3 size={14} /></span>
                  <span>Table</span>
                </button>
                <button className="ribbon-button small" title="Export PDF">
                  <span className="ribbon-icon"><FileText size={14} /></span>
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Export */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Export</div>
              <div className="ribbon-group-content">
                <button className="ribbon-button small" onClick={handleExportIfc} title="Export IFC File">
                  <span className="ribbon-icon"><Download size={14} /></span>
                  <span>Save IFC</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            {/* Examples */}
            <div className="ribbon-group">
              <div className="ribbon-group-title">Examples</div>
              <div className="ribbon-group-content">
                <button className="ribbon-button small" onClick={handleDemo1}>
                  <span className="ribbon-icon"><Minus size={14} /></span>
                  <span>Beam</span>
                </button>
                <button className="ribbon-button small" onClick={handleDemo2}>
                  <span className="ribbon-icon"><GripVertical size={14} /></span>
                  <span>Cont.</span>
                </button>
                <button className="ribbon-button small" onClick={handleDemo3}>
                  <span className="ribbon-icon"><Square size={14} /></span>
                  <span>Portal</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'standards' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-title">Eurocode</div>
              <div className="ribbon-group-content">
                <button className="ribbon-button small" onClick={onShowStandardsDialog} title="Eurocode NL Standards">
                  <span className="ribbon-icon"><Settings size={14} /></span>
                  <span>NL (NEN)</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-title">Load Factors</div>
              <div className="ribbon-group-content">
                <button className="ribbon-button small" title="EN 1990 - Basis">
                  <span className="ribbon-icon"><FileText size={14} /></span>
                  <span>EN 1990</span>
                </button>
                <button className="ribbon-button small" title="EN 1991 - Actions">
                  <span className="ribbon-icon"><FileText size={14} /></span>
                  <span>EN 1991</span>
                </button>
              </div>
            </div>

            <div className="ribbon-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-title">Material</div>
              <div className="ribbon-group-content">
                <button className="ribbon-button small" title="EN 1993 - Steel">
                  <span className="ribbon-icon"><FileText size={14} /></span>
                  <span>EN 1993</span>
                </button>
                <button className="ribbon-button small" title="EN 1995 - Timber">
                  <span className="ribbon-icon"><FileText size={14} /></span>
                  <span>EN 1995</span>
                </button>
                <button className="ribbon-button small" title="EN 1992 - Concrete">
                  <span className="ribbon-icon"><FileText size={14} /></span>
                  <span>EN 1992</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
