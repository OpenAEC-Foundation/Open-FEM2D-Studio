import { useState, useEffect, useRef, useCallback } from 'react';
import { FEMProvider, useFEM, applyLoadCaseToMesh, applyCombinedLoadsToMesh } from './context/FEMContext';
import { solve } from './core/solver/SolverService';
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
import { Preview3D } from './components/Preview3D/Preview3D';
import { SteelCheckPanel } from './components/SteelCheckPanel/SteelCheckPanel';
import { ConcreteCheckPanel } from './components/ConcreteCheckPanel/ConcreteCheckPanel';
import { FileTabs, FileTab } from './components/FileTabs/FileTabs';
import { serializeProject, deserializeProject } from './core/io/ProjectSerializer';
import { Box } from 'lucide-react';

/** Hook used inside FEMProvider to serialize current project state */
function useProjectSnapshot() {
  const { state } = useFEM();
  return useCallback(() => {
    return serializeProject(
      state.mesh,
      state.loadCases,
      state.loadCombinations,
      state.projectInfo,
      state.structuralGrid
    );
  }, [state.mesh, state.loadCases, state.loadCombinations, state.projectInfo, state.structuralGrid]);
}

interface AppContentProps {
  onSnapshotRef: React.MutableRefObject<(() => string) | null>;
  fileTabs: React.ReactNode;
}

function AppContent({ onSnapshotRef, fileTabs }: AppContentProps) {
  const { state, dispatch } = useFEM();
  const [showLoadCaseDialog, setShowLoadCaseDialog] = useState(false);
  const [showCombinationDialog, setShowCombinationDialog] = useState(false);
  const [showProjectInfoDialog, setShowProjectInfoDialog] = useState(false);
  const [showStandardsDialog, setShowStandardsDialog] = useState(false);
  const [showGridsDialog, setShowGridsDialog] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showSteelCheck, setShowSteelCheck] = useState(false);
  const [showConcreteCheck, setShowConcreteCheck] = useState(false);
  const [browserCollapsed, setBrowserCollapsed] = useState(false);
  const [displayCollapsed, setDisplayCollapsed] = useState(false);

  // Expose snapshot function to parent
  const getSnapshot = useProjectSnapshot();
  onSnapshotRef.current = getSnapshot;

  // Solve handler for on-demand solving (e.g. clicking Results tab)
  const handleSolve = useCallback(() => {
    if (state.mesh.getNodeCount() < 2) return;

    if (state.activeCombination !== null) {
      const combo = state.loadCombinations.find(c => c.id === state.activeCombination);
      if (combo) {
        applyCombinedLoadsToMesh(state.mesh, state.loadCases, combo);
      }
    } else {
      const activeLc = state.loadCases.find(lc => lc.id === state.activeLoadCase);
      if (activeLc) {
        applyLoadCaseToMesh(state.mesh, activeLc);
      }
    }

    solve(state.mesh, {
      analysisType: state.analysisType,
      geometricNonlinear: false
    })
      .then(result => {
        dispatch({ type: 'SET_RESULT', payload: result });
        dispatch({ type: 'SET_SHOW_DEFORMED', payload: true });
        if (state.analysisType === 'frame') {
          dispatch({ type: 'SET_SHOW_MOMENT', payload: true });
        }
      })
      .catch(() => {});
  }, [state.mesh, state.loadCases, state.loadCombinations, state.activeLoadCase, state.activeCombination, state.analysisType, dispatch]);

  // Auto-recalculate: debounced solver trigger on mesh changes
  const autoRecalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRecalcAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!state.autoRecalculate) return;
    if (state.mesh.getNodeCount() < 2) return;

    if (autoRecalcTimer.current) clearTimeout(autoRecalcTimer.current);
    if (autoRecalcAbort.current) autoRecalcAbort.current.abort();

    autoRecalcTimer.current = setTimeout(() => {
      const controller = new AbortController();
      autoRecalcAbort.current = controller;

      if (state.activeCombination !== null) {
        const combo = state.loadCombinations.find(c => c.id === state.activeCombination);
        if (combo) {
          applyCombinedLoadsToMesh(state.mesh, state.loadCases, combo);
        }
      } else {
        const activeLc = state.loadCases.find(lc => lc.id === state.activeLoadCase);
        if (activeLc) {
          applyLoadCaseToMesh(state.mesh, activeLc);
        }
      }

      solve(state.mesh, {
        analysisType: state.analysisType,
        geometricNonlinear: false
      }, controller.signal)
        .then(result => {
          if (!controller.signal.aborted) {
            dispatch({ type: 'SET_RESULT', payload: result });
          }
        })
        .catch(() => {});
    }, 300);

    return () => {
      if (autoRecalcTimer.current) clearTimeout(autoRecalcTimer.current);
      if (autoRecalcAbort.current) autoRecalcAbort.current.abort();
    };
  }, [state.meshVersion, state.autoRecalculate, state.activeLoadCase, state.analysisType, state.activeCombination]);

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
        onShowSteelCheck={() => setShowSteelCheck(true)}
        onShowConcreteCheck={() => setShowConcreteCheck(true)}
        onToggleAgent={() => setShowAgentPanel(!showAgentPanel)}
        showAgentPanel={showAgentPanel}
      />
      <div className="main-content">
        <ProjectBrowser
          collapsed={browserCollapsed}
          onToggleCollapse={() => setBrowserCollapsed(!browserCollapsed)}
        />
        <div className="canvas-area">
          {fileTabs}
          {state.viewMode === '3d' ? <Preview3D /> : <MeshEditor />}
        </div>
        <VisibilityPanel
          collapsed={displayCollapsed}
          onToggleCollapse={() => setDisplayCollapsed(!displayCollapsed)}
        />
        {showAgentPanel && <AgentPanel onClose={() => setShowAgentPanel(false)} />}
      </div>
      <LoadCaseTabs onSolve={handleSolve} />

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
      {showSteelCheck && (
        <SteelCheckPanel onClose={() => setShowSteelCheck(false)} />
      )}
      {showConcreteCheck && (
        <ConcreteCheckPanel onClose={() => setShowConcreteCheck(false)} />
      )}
    </div>
  );
}

/** Inner component that loads a project snapshot into FEM context */
function ProjectLoader({ snapshot }: { snapshot: string | null }) {
  const { dispatch } = useFEM();
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (snapshot && snapshot !== loadedRef.current) {
      try {
        const project = deserializeProject(snapshot);
        dispatch({ type: 'LOAD_PROJECT', payload: project });
        loadedRef.current = snapshot;
      } catch {
        // Invalid snapshot, ignore
      }
    }
  }, [snapshot, dispatch]);

  return null;
}

let nextTabId = 2;

function App() {
  const [tabs, setTabs] = useState<FileTab[]>([
    { id: 1, name: 'Untitled Project', snapshot: '' }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [pendingSnapshot, setPendingSnapshot] = useState<string | null>(null);
  const snapshotRef = useRef<(() => string) | null>(null);

  const saveCurrentTab = useCallback(() => {
    if (snapshotRef.current) {
      const snap = snapshotRef.current();
      setTabs(prev => prev.map(t =>
        t.id === activeTabId ? { ...t, snapshot: snap } : t
      ));
      return snap;
    }
    return '';
  }, [activeTabId]);

  const handleSelectTab = useCallback((id: number) => {
    if (id === activeTabId) return;
    saveCurrentTab();
    setActiveTabId(id);
    const tab = tabs.find(t => t.id === id);
    if (tab && tab.snapshot) {
      setPendingSnapshot(tab.snapshot);
    }
  }, [activeTabId, tabs, saveCurrentTab]);

  const handleNewTab = useCallback(() => {
    saveCurrentTab();
    const id = nextTabId++;
    const newTab: FileTab = { id, name: 'New Project', snapshot: '' };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    setPendingSnapshot(null);
  }, [saveCurrentTab]);

  const handleCloseTab = useCallback((id: number) => {
    if (tabs.length <= 1) return;
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (id === activeTabId) {
      const newActive = remaining[remaining.length - 1];
      setActiveTabId(newActive.id);
      if (newActive.snapshot) {
        setPendingSnapshot(newActive.snapshot);
      }
    }
  }, [tabs, activeTabId]);

  const updateTabName = useCallback((name: string) => {
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, name: name || 'Untitled' } : t
    ));
  }, [activeTabId]);

  const fileTabsElement = (
    <FileTabs
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={handleSelectTab}
      onCloseTab={handleCloseTab}
      onNewTab={handleNewTab}
    />
  );

  return (
    <FEMProvider>
      <TabNameSync onNameChange={updateTabName} />
      {pendingSnapshot && <ProjectLoader snapshot={pendingSnapshot} />}
      <AppContent onSnapshotRef={snapshotRef} fileTabs={fileTabsElement} />
    </FEMProvider>
  );
}

/** Syncs the project name from FEM state to the tab name */
function TabNameSync({ onNameChange }: { onNameChange: (name: string) => void }) {
  const { state } = useFEM();
  const prevName = useRef(state.projectInfo.name);

  useEffect(() => {
    if (state.projectInfo.name !== prevName.current) {
      prevName.current = state.projectInfo.name;
      onNameChange(state.projectInfo.name);
    }
  }, [state.projectInfo.name, onNameChange]);

  return null;
}

export default App;
