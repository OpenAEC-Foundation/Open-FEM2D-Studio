import { useState, useEffect, useRef } from 'react';
import { FEMProvider, useFEM, applyLoadCaseToMesh } from './context/FEMContext';
import { solveNonlinear } from './core/solver/NonlinearSolver';
import { Ribbon } from './components/Ribbon/Ribbon';
import { ProjectBrowser } from './components/ProjectBrowser/ProjectBrowser';
import { MeshEditor } from './components/MeshEditor/MeshEditor';
import { VisibilityPanel } from './components/VisibilityPanel/VisibilityPanel';
import { LoadCaseTabs } from './components/LoadCaseTabs/LoadCaseTabs';
import { LoadCaseDialog } from './components/LoadCaseDialog/LoadCaseDialog';
import { LoadCombinationDialog } from './components/LoadCombinationDialog/LoadCombinationDialog';
import { ProjectInfoDialog } from './components/ProjectInfoDialog/ProjectInfoDialog';
import { StandardsDialog } from './components/StandardsDialog/StandardsDialog';
import { GridsDialog } from './components/GridsDialog/GridsDialog';
import { AgentPanel } from './components/AgentPanel/AgentPanel';
import { Box } from 'lucide-react';

function AppContent() {
  const { state, dispatch } = useFEM();
  const [showLoadCaseDialog, setShowLoadCaseDialog] = useState(false);
  const [showCombinationDialog, setShowCombinationDialog] = useState(false);
  const [showProjectInfoDialog, setShowProjectInfoDialog] = useState(false);
  const [showStandardsDialog, setShowStandardsDialog] = useState(false);
  const [showGridsDialog, setShowGridsDialog] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [browserCollapsed, setBrowserCollapsed] = useState(false);
  const [displayCollapsed, setDisplayCollapsed] = useState(false);

  // Auto-recalculate: debounced solver trigger on mesh changes
  const autoRecalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.autoRecalculate) return;
    if (state.mesh.getNodeCount() < 2) return;

    if (autoRecalcTimer.current) clearTimeout(autoRecalcTimer.current);
    autoRecalcTimer.current = setTimeout(() => {
      try {
        const activeLc = state.loadCases.find(lc => lc.id === state.activeLoadCase);
        if (activeLc) {
          applyLoadCaseToMesh(state.mesh, activeLc);
        }
        const result = solveNonlinear(state.mesh, {
          analysisType: state.analysisType,
          geometricNonlinear: false
        });
        dispatch({ type: 'SET_RESULT', payload: result });
      } catch {
        // Silently ignore solver errors during auto-recalculate
      }
    }, 300);

    return () => {
      if (autoRecalcTimer.current) clearTimeout(autoRecalcTimer.current);
    };
  }, [state.meshVersion, state.autoRecalculate]);

  return (
    <div className="app">
      <div className="title-bar">
        <div className="title-bar-left">
          <Box size={14} />
          <span>Open FEM2D Studio</span>
        </div>
        <div className="title-bar-center">{state.projectInfo.name || 'Untitled Project'}</div>
        <div className="title-bar-right" />
      </div>
      <Ribbon
        onShowLoadCaseDialog={() => setShowLoadCaseDialog(true)}
        onShowCombinationDialog={() => setShowCombinationDialog(true)}
        onShowProjectInfoDialog={() => setShowProjectInfoDialog(true)}
        onShowStandardsDialog={() => setShowStandardsDialog(true)}
        onShowGridsDialog={() => setShowGridsDialog(true)}
        onToggleAgent={() => setShowAgentPanel(!showAgentPanel)}
        showAgentPanel={showAgentPanel}
      />
      <div className="main-content">
        <ProjectBrowser
          collapsed={browserCollapsed}
          onToggleCollapse={() => setBrowserCollapsed(!browserCollapsed)}
        />
        <div className="canvas-area">
          <MeshEditor />
        </div>
        <VisibilityPanel
          collapsed={displayCollapsed}
          onToggleCollapse={() => setDisplayCollapsed(!displayCollapsed)}
        />
        {showAgentPanel && <AgentPanel onClose={() => setShowAgentPanel(false)} />}
      </div>
      <LoadCaseTabs />

      {showLoadCaseDialog && (
        <LoadCaseDialog onClose={() => setShowLoadCaseDialog(false)} />
      )}
      {showCombinationDialog && (
        <LoadCombinationDialog onClose={() => setShowCombinationDialog(false)} />
      )}
      {showProjectInfoDialog && (
        <ProjectInfoDialog onClose={() => setShowProjectInfoDialog(false)} />
      )}
      {showStandardsDialog && (
        <StandardsDialog onClose={() => setShowStandardsDialog(false)} />
      )}
      {showGridsDialog && (
        <GridsDialog onClose={() => setShowGridsDialog(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <FEMProvider>
      <AppContent />
    </FEMProvider>
  );
}

export default App;
