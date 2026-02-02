import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Mesh } from '../core/fem/Mesh';
import { ISolverResult, Tool, IViewState, ISelection, AnalysisType, StressType } from '../core/fem/types';
import { ILoadCase, ILoadCombination } from '../core/fem/LoadCase';
import { convertEdgeLoadToNodalForces } from '../core/fem/PlateRegion';
import { IStructuralGrid } from '../core/fem/StructuralGrid';
import { calculateThermalNodalForces } from '../core/fem/ThermalLoad';

export type ViewMode = 'geometry' | 'loads' | 'results' | '3d';

export interface IProjectInfo {
  name: string;
  engineer: string;
  company: string;
  date: string;
  description: string;
  notes: string;
  location: string;
}

interface FEMState {
  mesh: Mesh;
  result: ISolverResult | null;
  selectedTool: Tool;
  selection: ISelection;
  viewState: IViewState;
  analysisType: AnalysisType;
  showDeformed: boolean;
  deformationScale: number;
  showStress: boolean;
  stressType: StressType;
  pendingNodes: number[];
  gridSize: number;
  snapToGrid: boolean;
  // Frame-specific state — individual diagram toggles (combinable)
  showMoment: boolean;
  showShear: boolean;
  showNormal: boolean;
  diagramScale: number;
  selectedSection: string;
  // View mode (bottom tabs)
  viewMode: ViewMode;
  activeLoadCase: number;
  // Display toggles
  showProfileNames: boolean;
  showReactions: boolean;
  showDimensions: boolean;
  // Element visibility toggles
  showNodes: boolean;
  showMembers: boolean;
  showSupports: boolean;
  showLoads: boolean;
  showNodeLabels: boolean;
  showMemberLabels: boolean;
  // Force unit
  forceUnit: 'N' | 'kN';
  // Displacement unit
  displacementUnit: 'mm' | 'm';
  // Active combination for results (null = individual load case)
  activeCombination: number | null;
  // Envelope results (min/max across all combinations)
  showEnvelope: boolean;
  // Auto-recalculate
  autoRecalculate: boolean;
  // Canvas refresh counter
  meshVersion: number;
  // Undo/Redo stacks (JSON snapshots of mesh + loadCases)
  undoStack: string[];
  redoStack: string[];
  // Load cases (structured)
  loadCases: ILoadCase[];
  loadCombinations: ILoadCombination[];
  // Project info
  projectInfo: IProjectInfo;
  // Structural grid
  structuralGrid: IStructuralGrid;
  // Code-check: beam ID for which to show the steel check report
  codeCheckBeamId: number | null;
}

type FEMAction =
  | { type: 'SET_MESH'; payload: Mesh }
  | { type: 'SET_RESULT'; payload: ISolverResult | null }
  | { type: 'SET_TOOL'; payload: Tool }
  | { type: 'SET_SELECTION'; payload: Partial<ISelection> & { nodeIds: Set<number>; elementIds: Set<number> } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_NODE'; payload: number }
  | { type: 'SELECT_ELEMENT'; payload: number }
  | { type: 'DESELECT_NODE'; payload: number }
  | { type: 'DESELECT_ELEMENT'; payload: number }
  | { type: 'SELECT_POINT_LOAD'; payload: number }
  | { type: 'DESELECT_POINT_LOAD'; payload: number }
  | { type: 'SELECT_DIST_LOAD'; payload: number }
  | { type: 'DESELECT_DIST_LOAD'; payload: number }
  | { type: 'SET_VIEW_STATE'; payload: Partial<IViewState> }
  | { type: 'SET_ANALYSIS_TYPE'; payload: AnalysisType }
  | { type: 'SET_SHOW_DEFORMED'; payload: boolean }
  | { type: 'SET_DEFORMATION_SCALE'; payload: number }
  | { type: 'SET_SHOW_STRESS'; payload: boolean }
  | { type: 'SET_STRESS_TYPE'; payload: StressType }
  | { type: 'ADD_PENDING_NODE'; payload: number }
  | { type: 'CLEAR_PENDING_NODES' }
  | { type: 'REFRESH_MESH' }
  | { type: 'SET_GRID_SIZE'; payload: number }
  | { type: 'SET_SNAP_TO_GRID'; payload: boolean }
  | { type: 'SET_SHOW_MOMENT'; payload: boolean }
  | { type: 'SET_SHOW_SHEAR'; payload: boolean }
  | { type: 'SET_SHOW_NORMAL'; payload: boolean }
  | { type: 'SET_DIAGRAM_SCALE'; payload: number }
  | { type: 'SET_SELECTED_SECTION'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_ACTIVE_LOAD_CASE'; payload: number }
  | { type: 'SET_SHOW_PROFILE_NAMES'; payload: boolean }
  | { type: 'SET_SHOW_REACTIONS'; payload: boolean }
  | { type: 'SET_SHOW_DIMENSIONS'; payload: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_UNDO' }
  | { type: 'SET_LOAD_CASES'; payload: ILoadCase[] }
  | { type: 'SET_LOAD_COMBINATIONS'; payload: ILoadCombination[] }
  | { type: 'SET_ACTIVE_COMBINATION'; payload: number | null }
  | { type: 'ADD_POINT_LOAD'; payload: { lcId: number; nodeId: number; fx: number; fy: number; mz: number } }
  | { type: 'ADD_DISTRIBUTED_LOAD'; payload: { lcId: number; beamId: number; qx: number; qy: number; qxEnd?: number; qyEnd?: number; startT?: number; endT?: number; coordSystem?: 'local' | 'global' } }
  | { type: 'REMOVE_POINT_LOAD'; payload: { lcId: number; nodeId: number } }
  | { type: 'REMOVE_DISTRIBUTED_LOAD'; payload: { lcId: number; beamId: number } }
  | { type: 'SELECT_PLATE'; payload: number }
  | { type: 'DESELECT_PLATE'; payload: number }
  | { type: 'ADD_EDGE_LOAD'; payload: { lcId: number; plateId: number; edge: 'top' | 'bottom' | 'left' | 'right'; px: number; py: number } }
  | { type: 'REMOVE_EDGE_LOAD'; payload: { lcId: number; plateId: number; edge: string } }
  | { type: 'ADD_THERMAL_LOAD'; payload: { lcId: number; elementId: number; plateId?: number; deltaT: number } }
  | { type: 'REMOVE_THERMAL_LOAD'; payload: { lcId: number; elementId: number } }
  | { type: 'SET_PROJECT_INFO'; payload: Partial<IProjectInfo> }
  | { type: 'LOAD_PROJECT'; payload: { mesh: Mesh; loadCases: ILoadCase[]; loadCombinations: ILoadCombination[]; projectInfo: IProjectInfo; structuralGrid?: IStructuralGrid } }
  | { type: 'SET_STRUCTURAL_GRID'; payload: IStructuralGrid }
  | { type: 'SET_SHOW_GRID_LINES'; payload: boolean }
  | { type: 'SET_SNAP_TO_GRID_LINES'; payload: boolean }
  | { type: 'SET_SHOW_NODES'; payload: boolean }
  | { type: 'SET_SHOW_MEMBERS'; payload: boolean }
  | { type: 'SET_SHOW_SUPPORTS'; payload: boolean }
  | { type: 'SET_SHOW_LOADS'; payload: boolean }
  | { type: 'SET_SHOW_NODE_LABELS'; payload: boolean }
  | { type: 'SET_SHOW_MEMBER_LABELS'; payload: boolean }
  | { type: 'SET_FORCE_UNIT'; payload: 'N' | 'kN' }
  | { type: 'SET_DISPLACEMENT_UNIT'; payload: 'mm' | 'm' }
  | { type: 'SET_AUTO_RECALCULATE'; payload: boolean }
  | { type: 'SET_SHOW_ENVELOPE'; payload: boolean }
  | { type: 'SET_CODE_CHECK_BEAM'; payload: number | null }
  | { type: 'CLEANUP_PLATE_LOADS'; payload: { plateId: number; elementIds: number[] } };

function createEmptySelection(): ISelection {
  return {
    nodeIds: new Set(),
    elementIds: new Set(),
    pointLoadNodeIds: new Set(),
    distLoadBeamIds: new Set(),
    plateIds: new Set()
  };
}

function createDemoBeamModel(): Mesh {
  const mesh = new Mesh();

  // Simple beam on two supports: 6 meter span
  const n1 = mesh.addNode(0, 0);
  const n2 = mesh.addNode(3, 0);  // Midpoint for point load
  const n3 = mesh.addNode(6, 0);

  // Supports: left pinned, right roller
  mesh.updateNode(n1.id, {
    constraints: { x: true, y: true, rotation: false } // Pinned
  });
  mesh.updateNode(n3.id, {
    constraints: { x: false, y: true, rotation: false } // Roller
  });

  // Beam element: IPE 200 steel
  const ipe200 = { A: 28.5e-4, I: 1940e-8, h: 0.200 };
  mesh.addBeamElement([n1.id, n2.id], 1, ipe200, 'IPE 200');
  mesh.addBeamElement([n2.id, n3.id], 1, ipe200, 'IPE 200');

  return mesh;
}

function createDefaultLoadCases(demoNodeId: number): ILoadCase[] {
  return [
    {
      id: 1,
      name: 'Dead Load (G)',
      type: 'dead',
      pointLoads: [
        { nodeId: demoNodeId, fx: 0, fy: -10000, mz: 0 }
      ],
      distributedLoads: [],
      edgeLoads: [],
      thermalLoads: [],
      color: '#6b7280'
    },
    {
      id: 2,
      name: 'Live Load (Q)',
      type: 'live',
      pointLoads: [],
      distributedLoads: [],
      edgeLoads: [],
      thermalLoads: [],
      color: '#3b82f6'
    }
  ];
}

function createDefaultCombinations(): ILoadCombination[] {
  return [
    {
      id: 1,
      name: 'ULS: 1.08G + 1.35Q',
      type: 'ULS',
      factors: new Map([[1, 1.08], [2, 1.35]])
    },
    {
      id: 2,
      name: 'SLS: 1.0G + 1.0Q',
      type: 'SLS',
      factors: new Map([[1, 1.0], [2, 1.0]])
    }
  ];
}

function createDefaultStructuralGrid(): IStructuralGrid {
  return {
    verticalLines: [],
    horizontalLines: [],
    showGridLines: false,
    snapToGridLines: false
  };
}

// Serialize load cases for undo/redo snapshots
function serializeLoadCases(loadCases: ILoadCase[]): object[] {
  return loadCases.map(lc => ({ ...lc }));
}

function deserializeLoadCases(data: object[]): ILoadCase[] {
  return data as ILoadCase[];
}

// Helper: apply a load case's loads onto the mesh (for solving)
export function applyLoadCaseToMesh(mesh: Mesh, loadCase: ILoadCase): void {
  // Clear all existing loads on nodes
  for (const node of mesh.nodes.values()) {
    mesh.updateNode(node.id, { loads: { fx: 0, fy: 0, moment: 0 } });
  }
  // Clear all distributed loads on beams
  for (const beam of mesh.beamElements.values()) {
    mesh.updateBeamElement(beam.id, { distributedLoad: undefined });
  }

  // Apply point loads from load case
  for (const pl of loadCase.pointLoads) {
    const node = mesh.getNode(pl.nodeId);
    if (node) {
      mesh.updateNode(pl.nodeId, {
        loads: {
          fx: node.loads.fx + pl.fx,
          fy: node.loads.fy + pl.fy,
          moment: node.loads.moment + pl.mz
        }
      });
    }
  }

  // Apply distributed loads from load case
  for (const dl of loadCase.distributedLoads) {
    const beam = mesh.getBeamElement(dl.elementId);
    if (beam) {
      mesh.updateBeamElement(dl.elementId, {
        distributedLoad: {
          qx: dl.qx,
          qy: dl.qy,
          qxEnd: dl.qxEnd,
          qyEnd: dl.qyEnd,
          startT: dl.startT,
          endT: dl.endT,
          coordSystem: dl.coordSystem
        }
      });
    }
  }

  // Apply edge loads from load case
  if (loadCase.edgeLoads) {
    for (const el of loadCase.edgeLoads) {
      const plate = mesh.getPlateRegion(el.plateId);
      if (plate) {
        const nodalForces = convertEdgeLoadToNodalForces(mesh, plate, el);
        for (const nf of nodalForces) {
          const node = mesh.getNode(nf.nodeId);
          if (node) {
            mesh.updateNode(nf.nodeId, {
              loads: {
                fx: node.loads.fx + nf.fx,
                fy: node.loads.fy + nf.fy,
                moment: node.loads.moment
              }
            });
          }
        }
      }
    }
  }

  // Apply thermal loads from load case
  if (loadCase.thermalLoads) {
    for (const tl of loadCase.thermalLoads) {
      const element = mesh.getElement(tl.elementId);
      if (!element) continue;
      const nodes = mesh.getElementNodes(element);
      if (nodes.length !== 3) continue;
      const material = mesh.getMaterial(element.materialId);
      if (!material) continue;

      const F = calculateThermalNodalForces(
        nodes[0], nodes[1], nodes[2],
        material, element.thickness, tl.deltaT, 'plane_stress'
      );

      for (let i = 0; i < 3; i++) {
        const node = mesh.getNode(nodes[i].id);
        if (node) {
          mesh.updateNode(node.id, {
            loads: {
              fx: node.loads.fx + F[i * 2],
              fy: node.loads.fy + F[i * 2 + 1],
              moment: node.loads.moment
            }
          });
        }
      }
    }
  }
}

// Apply combined loads from multiple load cases with factors
export function applyCombinedLoadsToMesh(mesh: Mesh, loadCases: ILoadCase[], combination: ILoadCombination): void {
  // Clear all existing loads
  for (const node of mesh.nodes.values()) {
    mesh.updateNode(node.id, { loads: { fx: 0, fy: 0, moment: 0 } });
  }
  for (const beam of mesh.beamElements.values()) {
    mesh.updateBeamElement(beam.id, { distributedLoad: undefined });
  }

  for (const lc of loadCases) {
    const factor = combination.factors.get(lc.id) ?? 0;
    if (factor === 0) continue;

    for (const pl of lc.pointLoads) {
      const node = mesh.getNode(pl.nodeId);
      if (node) {
        mesh.updateNode(pl.nodeId, {
          loads: {
            fx: node.loads.fx + pl.fx * factor,
            fy: node.loads.fy + pl.fy * factor,
            moment: node.loads.moment + pl.mz * factor
          }
        });
      }
    }

    for (const dl of lc.distributedLoads) {
      const beam = mesh.getBeamElement(dl.elementId);
      if (beam) {
        const existing = beam.distributedLoad ?? { qx: 0, qy: 0 };
        mesh.updateBeamElement(dl.elementId, {
          distributedLoad: {
            qx: existing.qx + dl.qx * factor,
            qy: existing.qy + dl.qy * factor,
            qxEnd: (existing.qxEnd ?? existing.qx) + (dl.qxEnd ?? dl.qx) * factor,
            qyEnd: (existing.qyEnd ?? existing.qy) + (dl.qyEnd ?? dl.qy) * factor,
            startT: dl.startT,
            endT: dl.endT,
            coordSystem: dl.coordSystem
          }
        });
      }
    }

    // Apply edge loads with factor
    if (lc.edgeLoads) {
      for (const el of lc.edgeLoads) {
        const plate = mesh.getPlateRegion(el.plateId);
        if (plate) {
          const factoredLoad = { ...el, px: el.px * factor, py: el.py * factor };
          const nodalForces = convertEdgeLoadToNodalForces(mesh, plate, factoredLoad);
          for (const nf of nodalForces) {
            const node = mesh.getNode(nf.nodeId);
            if (node) {
              mesh.updateNode(nf.nodeId, {
                loads: {
                  fx: node.loads.fx + nf.fx,
                  fy: node.loads.fy + nf.fy,
                  moment: node.loads.moment
                }
              });
            }
          }
        }
      }
    }
  }
}

const demoMesh = createDemoBeamModel();
// The demo model has node IDs starting at 1; node 2 is the midpoint
const demoLoadCases = createDefaultLoadCases(2);

const initialState: FEMState = {
  mesh: demoMesh,
  result: null,
  selectedTool: 'select',
  selection: createEmptySelection(),
  viewState: { offsetX: 150, offsetY: 350, scale: 80 },
  analysisType: 'frame',
  showDeformed: false,
  deformationScale: 100,
  showStress: false,
  stressType: 'vonMises',
  pendingNodes: [],
  gridSize: 0.5,
  snapToGrid: true,
  showMoment: true,
  showShear: false,
  showNormal: false,
  diagramScale: 50,
  selectedSection: 'IPE 200',
  viewMode: 'geometry',
  activeLoadCase: 1,
  showProfileNames: false,
  showReactions: true,
  showDimensions: true,
  showNodes: true,
  showMembers: true,
  showSupports: true,
  showLoads: true,
  showNodeLabels: true,
  showMemberLabels: true,
  forceUnit: 'kN',
  displacementUnit: 'mm',
  activeCombination: null,
  showEnvelope: false,
  autoRecalculate: true,
  meshVersion: 0,
  undoStack: [],
  redoStack: [],
  loadCases: demoLoadCases,
  loadCombinations: createDefaultCombinations(),
  projectInfo: {
    name: 'Untitled Project',
    engineer: '',
    company: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    notes: '',
    location: ''
  },
  structuralGrid: createDefaultStructuralGrid(),
  codeCheckBeamId: null
};

// Apply demo load case loads to mesh so they render on first load
applyLoadCaseToMesh(initialState.mesh, initialState.loadCases[0]);

function femReducer(state: FEMState, action: FEMAction): FEMState {
  switch (action.type) {
    case 'SET_MESH':
      return { ...state, mesh: action.payload, result: null };

    case 'SET_RESULT':
      return { ...state, result: action.payload };

    case 'SET_TOOL':
      return { ...state, selectedTool: action.payload, pendingNodes: [] };

    case 'SET_SELECTION':
      return {
        ...state,
        selection: {
          nodeIds: action.payload.nodeIds ?? new Set(),
          elementIds: action.payload.elementIds ?? new Set(),
          pointLoadNodeIds: action.payload.pointLoadNodeIds ?? new Set(),
          distLoadBeamIds: action.payload.distLoadBeamIds ?? new Set(),
          plateIds: action.payload.plateIds ?? new Set()
        }
      };

    case 'CLEAR_SELECTION':
      return { ...state, selection: createEmptySelection() };

    case 'SELECT_NODE': {
      const newNodeIds = new Set(state.selection.nodeIds);
      newNodeIds.add(action.payload);
      return { ...state, selection: { ...state.selection, nodeIds: newNodeIds } };
    }

    case 'SELECT_ELEMENT': {
      const newElementIds = new Set(state.selection.elementIds);
      newElementIds.add(action.payload);
      return { ...state, selection: { ...state.selection, elementIds: newElementIds } };
    }

    case 'DESELECT_NODE': {
      const newNodeIds = new Set(state.selection.nodeIds);
      newNodeIds.delete(action.payload);
      return { ...state, selection: { ...state.selection, nodeIds: newNodeIds } };
    }

    case 'DESELECT_ELEMENT': {
      const newElementIds = new Set(state.selection.elementIds);
      newElementIds.delete(action.payload);
      return { ...state, selection: { ...state.selection, elementIds: newElementIds } };
    }

    case 'SELECT_POINT_LOAD': {
      const newIds = new Set(state.selection.pointLoadNodeIds);
      newIds.add(action.payload);
      return { ...state, selection: { ...state.selection, pointLoadNodeIds: newIds } };
    }

    case 'DESELECT_POINT_LOAD': {
      const newIds = new Set(state.selection.pointLoadNodeIds);
      newIds.delete(action.payload);
      return { ...state, selection: { ...state.selection, pointLoadNodeIds: newIds } };
    }

    case 'SELECT_DIST_LOAD': {
      const newIds = new Set(state.selection.distLoadBeamIds);
      newIds.add(action.payload);
      return { ...state, selection: { ...state.selection, distLoadBeamIds: newIds } };
    }

    case 'DESELECT_DIST_LOAD': {
      const newIds = new Set(state.selection.distLoadBeamIds);
      newIds.delete(action.payload);
      return { ...state, selection: { ...state.selection, distLoadBeamIds: newIds } };
    }

    case 'SET_VIEW_STATE':
      return { ...state, viewState: { ...state.viewState, ...action.payload } };

    case 'SET_ANALYSIS_TYPE':
      return { ...state, analysisType: action.payload, result: null };

    case 'SET_SHOW_DEFORMED':
      return { ...state, showDeformed: action.payload };

    case 'SET_DEFORMATION_SCALE':
      return { ...state, deformationScale: action.payload };

    case 'SET_SHOW_STRESS':
      return { ...state, showStress: action.payload };

    case 'SET_STRESS_TYPE':
      return { ...state, stressType: action.payload };

    case 'ADD_PENDING_NODE':
      return { ...state, pendingNodes: [...state.pendingNodes, action.payload] };

    case 'CLEAR_PENDING_NODES':
      return { ...state, pendingNodes: [] };

    case 'REFRESH_MESH':
      return { ...state, meshVersion: state.meshVersion + 1 };

    case 'SET_GRID_SIZE':
      return { ...state, gridSize: action.payload };

    case 'SET_SNAP_TO_GRID':
      return { ...state, snapToGrid: action.payload };

    case 'SET_SHOW_MOMENT':
      return { ...state, showMoment: action.payload };

    case 'SET_SHOW_SHEAR':
      return { ...state, showShear: action.payload };

    case 'SET_SHOW_NORMAL':
      return { ...state, showNormal: action.payload };

    case 'SET_DIAGRAM_SCALE':
      return { ...state, diagramScale: action.payload };

    case 'SET_SELECTED_SECTION':
      return { ...state, selectedSection: action.payload };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_ACTIVE_LOAD_CASE':
      return { ...state, activeLoadCase: action.payload };

    case 'SET_SHOW_PROFILE_NAMES':
      return { ...state, showProfileNames: action.payload };

    case 'SET_SHOW_REACTIONS':
      return { ...state, showReactions: action.payload };

    case 'SET_SHOW_DIMENSIONS':
      return { ...state, showDimensions: action.payload };

    case 'PUSH_UNDO': {
      const meshSnapshot = JSON.stringify(state.mesh.toJSON());
      const lcSnapshot = JSON.stringify(serializeLoadCases(state.loadCases));
      const snapshot = JSON.stringify({ mesh: meshSnapshot, loadCases: lcSnapshot });
      const newStack = [...state.undoStack, snapshot];
      if (newStack.length > 50) newStack.shift();
      return { ...state, undoStack: newStack, redoStack: [] };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const newUndo = [...state.undoStack];
      const snapshot = newUndo.pop()!;
      const currentMeshSnapshot = JSON.stringify(state.mesh.toJSON());
      const currentLcSnapshot = JSON.stringify(serializeLoadCases(state.loadCases));
      const redoSnapshot = JSON.stringify({ mesh: currentMeshSnapshot, loadCases: currentLcSnapshot });

      const parsed = JSON.parse(snapshot);
      const restoredMesh = Mesh.fromJSON(JSON.parse(parsed.mesh));
      const restoredLoadCases = deserializeLoadCases(JSON.parse(parsed.loadCases));

      return {
        ...state,
        mesh: restoredMesh,
        loadCases: restoredLoadCases,
        undoStack: newUndo,
        redoStack: [...state.redoStack, redoSnapshot],
        meshVersion: state.meshVersion + 1,
        result: null
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const newRedo = [...state.redoStack];
      const snapshot = newRedo.pop()!;
      const currentMeshSnapshot = JSON.stringify(state.mesh.toJSON());
      const currentLcSnapshot = JSON.stringify(serializeLoadCases(state.loadCases));
      const undoSnapshot = JSON.stringify({ mesh: currentMeshSnapshot, loadCases: currentLcSnapshot });

      const parsed = JSON.parse(snapshot);
      const restoredMesh = Mesh.fromJSON(JSON.parse(parsed.mesh));
      const restoredLoadCases = deserializeLoadCases(JSON.parse(parsed.loadCases));

      return {
        ...state,
        mesh: restoredMesh,
        loadCases: restoredLoadCases,
        undoStack: [...state.undoStack, undoSnapshot],
        redoStack: newRedo,
        meshVersion: state.meshVersion + 1,
        result: null
      };
    }

    case 'SET_LOAD_CASES':
      return { ...state, loadCases: action.payload };

    case 'SET_LOAD_COMBINATIONS':
      return { ...state, loadCombinations: action.payload };

    case 'SET_ACTIVE_COMBINATION':
      return { ...state, activeCombination: action.payload };

    case 'ADD_POINT_LOAD': {
      const { lcId, nodeId, fx, fy, mz } = action.payload;
      const newLoadCases = state.loadCases.map(lc => {
        if (lc.id !== lcId) return lc;
        // Replace existing load for this node or add new
        const filtered = lc.pointLoads.filter(pl => pl.nodeId !== nodeId);
        if (fx !== 0 || fy !== 0 || mz !== 0) {
          filtered.push({ nodeId, fx, fy, mz });
        }
        return { ...lc, pointLoads: filtered };
      });
      return { ...state, loadCases: newLoadCases };
    }

    case 'ADD_DISTRIBUTED_LOAD': {
      const { lcId, beamId, qx, qy, qxEnd, qyEnd, startT, endT, coordSystem } = action.payload;
      const newLoadCases = state.loadCases.map(lc => {
        if (lc.id !== lcId) return lc;
        const filtered = lc.distributedLoads.filter(dl => dl.elementId !== beamId);
        if (qx !== 0 || qy !== 0 || (qxEnd !== undefined && qxEnd !== 0) || (qyEnd !== undefined && qyEnd !== 0)) {
          filtered.push({ elementId: beamId, qx, qy, qxEnd, qyEnd, startT, endT, coordSystem });
        }
        return { ...lc, distributedLoads: filtered };
      });
      return { ...state, loadCases: newLoadCases };
    }

    case 'REMOVE_POINT_LOAD': {
      const { lcId, nodeId } = action.payload;
      const newLoadCases = state.loadCases.map(lc => {
        if (lc.id !== lcId) return lc;
        return { ...lc, pointLoads: lc.pointLoads.filter(pl => pl.nodeId !== nodeId) };
      });
      return { ...state, loadCases: newLoadCases };
    }

    case 'REMOVE_DISTRIBUTED_LOAD': {
      const { lcId, beamId } = action.payload;
      const newLoadCases = state.loadCases.map(lc => {
        if (lc.id !== lcId) return lc;
        return { ...lc, distributedLoads: lc.distributedLoads.filter(dl => dl.elementId !== beamId) };
      });
      return { ...state, loadCases: newLoadCases };
    }

    case 'SELECT_PLATE': {
      const newPlateIds = new Set(state.selection.plateIds);
      newPlateIds.add(action.payload);
      return { ...state, selection: { ...state.selection, plateIds: newPlateIds } };
    }

    case 'DESELECT_PLATE': {
      const newPlateIds = new Set(state.selection.plateIds);
      newPlateIds.delete(action.payload);
      return { ...state, selection: { ...state.selection, plateIds: newPlateIds } };
    }

    case 'ADD_EDGE_LOAD': {
      const { lcId, plateId, edge, px, py } = action.payload;
      const newLoadCases = state.loadCases.map(lc => {
        if (lc.id !== lcId) return lc;
        const filtered = (lc.edgeLoads || []).filter(
          el => !(el.plateId === plateId && el.edge === edge)
        );
        if (px !== 0 || py !== 0) {
          filtered.push({ plateId, edge, px, py });
        }
        return { ...lc, edgeLoads: filtered };
      });
      return { ...state, loadCases: newLoadCases };
    }

    case 'REMOVE_EDGE_LOAD': {
      const { lcId, plateId, edge } = action.payload;
      const newLoadCases = state.loadCases.map(lc => {
        if (lc.id !== lcId) return lc;
        return {
          ...lc,
          edgeLoads: (lc.edgeLoads || []).filter(
            el => !(el.plateId === plateId && el.edge === edge)
          )
        };
      });
      return { ...state, loadCases: newLoadCases };
    }

    case 'ADD_THERMAL_LOAD': {
      const { lcId, elementId, plateId, deltaT } = action.payload;
      const newLoadCases = state.loadCases.map(lc => {
        if (lc.id !== lcId) return lc;
        const filtered = (lc.thermalLoads || []).filter(tl => tl.elementId !== elementId);
        if (deltaT !== 0) {
          filtered.push({ elementId, plateId, deltaT });
        }
        return { ...lc, thermalLoads: filtered };
      });
      return { ...state, loadCases: newLoadCases };
    }

    case 'REMOVE_THERMAL_LOAD': {
      const { lcId, elementId } = action.payload;
      const newLoadCases = state.loadCases.map(lc => {
        if (lc.id !== lcId) return lc;
        return { ...lc, thermalLoads: (lc.thermalLoads || []).filter(tl => tl.elementId !== elementId) };
      });
      return { ...state, loadCases: newLoadCases };
    }

    case 'SET_PROJECT_INFO':
      return { ...state, projectInfo: { ...state.projectInfo, ...action.payload } };

    case 'LOAD_PROJECT': {
      const { mesh, loadCases, loadCombinations, projectInfo, structuralGrid } = action.payload;
      return {
        ...state,
        mesh,
        loadCases,
        loadCombinations,
        projectInfo,
        structuralGrid: structuralGrid ?? createDefaultStructuralGrid(),
        result: null,
        undoStack: [],
        redoStack: [],
        selection: createEmptySelection(),
        meshVersion: state.meshVersion + 1
      };
    }

    case 'SET_STRUCTURAL_GRID':
      return { ...state, structuralGrid: action.payload };

    case 'SET_SHOW_GRID_LINES':
      return { ...state, structuralGrid: { ...state.structuralGrid, showGridLines: action.payload } };

    case 'SET_SNAP_TO_GRID_LINES':
      return { ...state, structuralGrid: { ...state.structuralGrid, snapToGridLines: action.payload } };

    case 'SET_SHOW_NODES':
      return { ...state, showNodes: action.payload };

    case 'SET_SHOW_MEMBERS':
      return { ...state, showMembers: action.payload };

    case 'SET_SHOW_SUPPORTS':
      return { ...state, showSupports: action.payload };

    case 'SET_SHOW_LOADS':
      return { ...state, showLoads: action.payload };

    case 'SET_SHOW_NODE_LABELS':
      return { ...state, showNodeLabels: action.payload };

    case 'SET_SHOW_MEMBER_LABELS':
      return { ...state, showMemberLabels: action.payload };

    case 'SET_FORCE_UNIT':
      return { ...state, forceUnit: action.payload };

    case 'SET_DISPLACEMENT_UNIT':
      return { ...state, displacementUnit: action.payload };

    case 'SET_AUTO_RECALCULATE':
      return { ...state, autoRecalculate: action.payload };

    case 'SET_SHOW_ENVELOPE':
      return { ...state, showEnvelope: action.payload };

    case 'SET_CODE_CHECK_BEAM':
      return { ...state, codeCheckBeamId: action.payload };

    case 'CLEANUP_PLATE_LOADS': {
      const { plateId, elementIds } = action.payload;
      const elementIdSet = new Set(elementIds);
      const cleanedLoadCases = state.loadCases.map(lc => ({
        ...lc,
        edgeLoads: (lc.edgeLoads || []).filter(el => el.plateId !== plateId),
        thermalLoads: (lc.thermalLoads || []).filter(tl =>
          tl.plateId !== plateId && !elementIdSet.has(tl.elementId)
        )
      }));
      return { ...state, loadCases: cleanedLoadCases };
    }

    default:
      return state;
  }
}

interface FEMContextType {
  state: FEMState;
  dispatch: React.Dispatch<FEMAction>;
  pushUndo: () => void;
}

const FEMContext = createContext<FEMContextType | null>(null);

export function FEMProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(femReducer, initialState);

  const pushUndo = useCallback(() => {
    dispatch({ type: 'PUSH_UNDO' });
  }, []);

  return (
    <FEMContext.Provider value={{ state, dispatch, pushUndo }}>
      {children}
    </FEMContext.Provider>
  );
}

export function useFEM() {
  const context = useContext(FEMContext);
  if (!context) {
    throw new Error('useFEM must be used within a FEMProvider');
  }
  return context;
}
