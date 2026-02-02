import { useRef, useEffect, useCallback, useState } from 'react';
import { useFEM, applyLoadCaseToMesh } from '../../context/FEMContext';
import { INode, IBeamElement, IBeamSection } from '../../core/fem/types';
import { getStressColor } from '../../utils/colors';
import { calculateBeamLength, calculateBeamAngle } from '../../core/fem/Beam';
import { formatForce, formatMoment } from '../../core/fem/BeamForces';
import { SectionDialog } from '../SectionDialog/SectionDialog';
import { LoadDialog } from '../LoadDialog/LoadDialog';
import { BarPropertiesDialog } from '../BarPropertiesDialog/BarPropertiesDialog';
import { NodePropertiesDialog } from '../NodePropertiesDialog/NodePropertiesDialog';
import { LineLoadDialog } from '../LineLoadDialog/LineLoadDialog';
import { PlateDialog } from '../PlateDialog/PlateDialog';
import { EdgeLoadDialog } from '../EdgeLoadDialog/EdgeLoadDialog';
import { ThermalLoadDialog } from '../ThermalLoadDialog/ThermalLoadDialog';
import { generatePlateRegionMesh, removePlateRegion } from '../../core/fem/PlateRegion';
import { buildNodeIdToIndex } from '../../core/solver/Assembler';
import { checkSteelSection } from '../../core/standards/SteelCheck';
import { STEEL_GRADES } from '../../core/standards/EurocodeNL';
import './MeshEditor.css';

export function MeshEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch, pushUndo } = useFEM();
  const {
    mesh,
    result,
    selectedTool,
    selection,
    viewState,
    analysisType,
    showDeformed,
    deformationScale,
    showStress,
    stressType,
    pendingNodes,
    gridSize,
    snapToGrid,
    showMoment,
    showShear,
    showNormal,
    diagramScale,
    viewMode,
    showProfileNames,
    showReactions,
    meshVersion,
    structuralGrid,
    loadCases,
    activeLoadCase,
    showDimensions,
    showNodes,
    showMembers,
    showSupports,
    showLoads,
    showNodeLabels,
    showMemberLabels,
    forceUnit
  } = state;

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<number | null>(null);
  const [gizmoAxis, setGizmoAxis] = useState<'x' | 'y' | 'free' | null>(null);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [dragNodeOrigin, setDragNodeOrigin] = useState<{ x: number; y: number } | null>(null);
  const [snapNodeId, setSnapNodeId] = useState<number | null>(null);
  const [editingDimension, setEditingDimension] = useState<{
    beamId: number;
    screenX: number;
    screenY: number;
    currentLength: number;
  } | null>(null);

  // Pending beam awaiting section profile selection
  const [pendingBeamNodeIds, setPendingBeamNodeIds] = useState<[number, number] | null>(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);

  // Remember last used beam section so continuous beam drawing skips the dialog
  const [lastUsedSection, setLastUsedSection] = useState<{ section: IBeamSection; profileName: string } | null>(null);

  // Load dialog for editing point loads
  const [editingLoadNodeId, setEditingLoadNodeId] = useState<number | null>(null);

  // Bar properties dialog (double-click on bar)
  const [editingBarId, setEditingBarId] = useState<number | null>(null);

  // Line load input dialog
  const [lineLoadBeamId, setLineLoadBeamId] = useState<number | null>(null);

  // Node properties dialog (double-click on node)
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);

  // Hovered beam for line load / addLoad tool highlight
  const [hoveredBeamId, setHoveredBeamId] = useState<number | null>(null);

  // Hovered node for pre-highlight
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  // Line load shape handle resizing
  const [resizingLoadBeamId, setResizingLoadBeamId] = useState<number | null>(null);
  const [resizeStartQy, setResizeStartQy] = useState<number>(0);
  const [resizingLoadEnd, setResizingLoadEnd] = useState<'start' | 'end' | null>(null);

  // Beam mid-gizmo dragging
  const [draggedBeamId, setDraggedBeamId] = useState<number | null>(null);
  const [beamDragOrigins, setBeamDragOrigins] = useState<{ n1: { x: number; y: number }; n2: { x: number; y: number } } | null>(null);

  // Grid line interaction
  const [draggedGridLineId, setDraggedGridLineId] = useState<number | null>(null);
  const [draggedGridLineType, setDraggedGridLineType] = useState<'vertical' | 'horizontal' | null>(null);

  // Selection box (rubber band)
  const [selectionBox, setSelectionBox] = useState<{
    startX: number; startY: number; endX: number; endY: number;
  } | null>(null);

  // Length input for beam drawing (triggered by typing a number while placing beam)
  const [beamLengthInput, setBeamLengthInput] = useState<string | null>(null);

  // Plate drawing tool state
  const [plateFirstCorner, setPlateFirstCorner] = useState<{x: number, y: number} | null>(null);
  const [showPlateDialog, setShowPlateDialog] = useState(false);
  const [pendingPlateRect, setPendingPlateRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  // Edge load dialog
  const [edgeLoadPlateId, setEdgeLoadPlateId] = useState<number | null>(null);
  const [edgeLoadEdge, setEdgeLoadEdge] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');

  // Thermal load dialog
  const [thermalLoadElementIds, setThermalLoadElementIds] = useState<number[]>([]);
  const [thermalLoadPlateId, setThermalLoadPlateId] = useState<number | undefined>(undefined);

  // Draw gizmo for selected node
  const drawGizmo = useCallback((
    ctx: CanvasRenderingContext2D,
    screen: { x: number; y: number }
  ) => {
    const arrowLength = 50;
    const arrowHead = 12;

    // X axis (red)
    ctx.strokeStyle = gizmoAxis === 'x' ? '#ff6b6b' : '#ef4444';
    ctx.fillStyle = gizmoAxis === 'x' ? '#ff6b6b' : '#ef4444';
    ctx.lineWidth = gizmoAxis === 'x' ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x + arrowLength, screen.y);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(screen.x + arrowLength + arrowHead, screen.y);
    ctx.lineTo(screen.x + arrowLength, screen.y - 5);
    ctx.lineTo(screen.x + arrowLength, screen.y + 5);
    ctx.closePath();
    ctx.fill();
    // Label
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('X', screen.x + arrowLength + 16, screen.y + 4);

    // Y axis (green)
    ctx.strokeStyle = gizmoAxis === 'y' ? '#6bff6b' : '#22c55e';
    ctx.fillStyle = gizmoAxis === 'y' ? '#6bff6b' : '#22c55e';
    ctx.lineWidth = gizmoAxis === 'y' ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x, screen.y - arrowLength);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y - arrowLength - arrowHead);
    ctx.lineTo(screen.x - 5, screen.y - arrowLength);
    ctx.lineTo(screen.x + 5, screen.y - arrowLength);
    ctx.closePath();
    ctx.fill();
    // Label
    ctx.fillText('Z', screen.x - 4, screen.y - arrowLength - 16);

    // Center square
    ctx.fillStyle = gizmoAxis === 'free' ? '#60a5fa' : '#4299e1';
    ctx.fillRect(screen.x - 6, screen.y - 6, 12, 12);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(screen.x - 6, screen.y - 6, 12, 12);
  }, [gizmoAxis]);

  const getGizmoAxis = useCallback((screenX: number, screenY: number, nodeScreen: { x: number; y: number }): 'x' | 'y' | 'free' | null => {
    const tolerance = 10;
    const arrowLength = 50;

    // Check X axis arrow
    if (Math.abs(screenY - nodeScreen.y) < tolerance &&
        screenX > nodeScreen.x + 6 && screenX < nodeScreen.x + arrowLength + 15) {
      return 'x';
    }

    // Check Y axis arrow
    if (Math.abs(screenX - nodeScreen.x) < tolerance &&
        screenY < nodeScreen.y - 6 && screenY > nodeScreen.y - arrowLength - 15) {
      return 'y';
    }

    // Check center square (free drag)
    if (Math.abs(screenX - nodeScreen.x) <= 8 && Math.abs(screenY - nodeScreen.y) <= 8) {
      return 'free';
    }

    return null;
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const x = (screenX - viewState.offsetX) / viewState.scale;
    const y = -(screenY - viewState.offsetY) / viewState.scale;
    return { x, y };
  }, [viewState]);

  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const x = worldX * viewState.scale + viewState.offsetX;
    const y = -worldY * viewState.scale + viewState.offsetY;
    return { x, y };
  }, [viewState]);

  const snapToGridFn = useCallback((x: number, y: number, useBarSnap?: boolean) => {
    let snappedX = x;
    let snappedY = y;

    if (snapToGrid) {
      // Use 100mm snap for bar placement, otherwise use grid size
      const snap = useBarSnap ? 0.1 : gridSize;
      snappedX = Math.round(x / snap) * snap;
      snappedY = Math.round(y / snap) * snap;
    }

    // Also snap to structural grid lines if enabled
    if (structuralGrid.snapToGridLines) {
      const tolerance = gridSize * 0.5;
      for (const line of structuralGrid.verticalLines) {
        if (Math.abs(x - line.position) < tolerance) {
          snappedX = line.position;
          break;
        }
      }
      for (const line of structuralGrid.horizontalLines) {
        if (Math.abs(y - line.position) < tolerance) {
          snappedY = line.position;
          break;
        }
      }
    }

    return { x: snappedX, y: snappedY };
  }, [snapToGrid, gridSize, structuralGrid]);

  const findNodeAtScreen = useCallback((screenX: number, screenY: number): INode | null => {
    const tolerance = 10 / viewState.scale;
    const world = screenToWorld(screenX, screenY);

    for (const node of mesh.nodes.values()) {
      const dx = node.x - world.x;
      const dy = node.y - world.y;
      if (Math.sqrt(dx * dx + dy * dy) < tolerance) {
        return node;
      }
    }
    return null;
  }, [mesh, viewState, screenToWorld]);

  const findElementAtScreen = useCallback((screenX: number, screenY: number): number | null => {
    const world = screenToWorld(screenX, screenY);

    for (const element of mesh.elements.values()) {
      const nodes = mesh.getElementNodes(element);
      if (nodes.length !== 3) continue;

      if (pointInTriangle(world, nodes[0], nodes[1], nodes[2])) {
        return element.id;
      }
    }
    return null;
  }, [mesh, screenToWorld]);

  const findBeamAtScreen = useCallback((screenX: number, screenY: number): IBeamElement | null => {
    const world = screenToWorld(screenX, screenY);
    const tolerance = 15 / viewState.scale;

    for (const beam of mesh.beamElements.values()) {
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      // Point to line segment distance
      const dist = pointToLineDistance(world, n1, n2);
      if (dist < tolerance) {
        return beam;
      }
    }
    return null;
  }, [mesh, screenToWorld, viewState.scale]);

  // Find beam at screen coordinates AND return parametric position (0-1) along beam
  const findBeamAtScreenWithPosition = useCallback((screenX: number, screenY: number): { beam: IBeamElement; t: number } | null => {
    const world = screenToWorld(screenX, screenY);
    const tolerance = 15 / viewState.scale;

    for (const beam of mesh.beamElements.values()) {
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;

      let t = ((world.x - n1.x) * dx + (world.y - n1.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const closestX = n1.x + t * dx;
      const closestY = n1.y + t * dy;
      const dist = Math.sqrt((world.x - closestX) ** 2 + (world.y - closestY) ** 2);

      if (dist < tolerance) {
        return { beam, t };
      }
    }
    return null;
  }, [mesh, screenToWorld, viewState.scale]);

  const findDimensionAtScreen = useCallback((screenX: number, screenY: number): {
    beamId: number; midX: number; midY: number; length: number;
  } | null => {
    const dimOffset = 30;

    for (const beam of mesh.beamElements.values()) {
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      const p1 = worldToScreen(n1.x, n1.y);
      const p2 = worldToScreen(n2.x, n2.y);

      const length = calculateBeamLength(n1, n2);

      // Compute perpendicular in screen space (Y is flipped vs world)
      const screenAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const perpAngle = screenAngle - Math.PI / 2;

      const offsetX = Math.cos(perpAngle) * dimOffset;
      const offsetY = Math.sin(perpAngle) * dimOffset;

      const d1 = { x: p1.x + offsetX, y: p1.y + offsetY };
      const d2 = { x: p2.x + offsetX, y: p2.y + offsetY };

      const midX = (d1.x + d2.x) / 2;
      const midY = (d1.y + d2.y) / 2;

      if (Math.abs(screenX - midX) < 40 && Math.abs(screenY - midY) < 14) {
        return { beamId: beam.id, midX, midY, length };
      }
    }

    return null;
  }, [mesh, worldToScreen]);

  // Find load resize handle at screen position (for selected beams with distributed loads)
  const findLoadHandleAtScreen = useCallback((screenX: number, screenY: number): {
    beamId: number; end: 'start' | 'end';
  } | null => {
    const handleHitRadius = 8;

    // Check both element selection and dist load selection
    const beamIdsToCheck = new Set([...selection.elementIds, ...selection.distLoadBeamIds]);
    for (const beamId of beamIdsToCheck) {
      const beam = mesh.getBeamElement(beamId);
      if (!beam || !beam.distributedLoad) continue;
      const { qy } = beam.distributedLoad;
      if (qy === 0) continue;

      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      const p1 = worldToScreen(n1.x, n1.y);
      const p2 = worldToScreen(n2.x, n2.y);

      const startT = beam.distributedLoad.startT ?? 0;
      const endT = beam.distributedLoad.endT ?? 1;
      const coordSystem = beam.distributedLoad.coordSystem ?? 'local';
      const isGlobal = coordSystem === 'global';
      const screenAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const perpAngle = isGlobal ? Math.PI / 2 : screenAngle + Math.PI / 2;
      const arrowLength = Math.min(40, Math.abs(qy) / 500 * 40 + 20);

      const loadP1 = {
        x: p1.x + (p2.x - p1.x) * startT,
        y: p1.y + (p2.y - p1.y) * startT
      };
      const loadP2 = {
        x: p1.x + (p2.x - p1.x) * endT,
        y: p1.y + (p2.y - p1.y) * endT
      };

      const startTop = {
        x: loadP1.x + Math.cos(perpAngle) * arrowLength * (qy > 0 ? 1 : -1),
        y: loadP1.y + Math.sin(perpAngle) * arrowLength * (qy > 0 ? 1 : -1)
      };
      const endTop = {
        x: loadP2.x + Math.cos(perpAngle) * arrowLength * (qy > 0 ? 1 : -1),
        y: loadP2.y + Math.sin(perpAngle) * arrowLength * (qy > 0 ? 1 : -1)
      };

      const dStart = Math.sqrt((screenX - startTop.x) ** 2 + (screenY - startTop.y) ** 2);
      if (dStart < handleHitRadius) return { beamId: beam.id, end: 'start' };

      const dEnd = Math.sqrt((screenX - endTop.x) ** 2 + (screenY - endTop.y) ** 2);
      if (dEnd < handleHitRadius) return { beamId: beam.id, end: 'end' };
    }

    return null;
  }, [mesh, selection, worldToScreen]);

  // Find point load arrow at screen position
  const findPointLoadAtScreen = useCallback((screenX: number, screenY: number): number | null => {
    for (const node of mesh.nodes.values()) {
      if (node.loads.fx === 0 && node.loads.fy === 0 && node.loads.moment === 0) continue;
      const screen = worldToScreen(node.x, node.y);
      const mag = Math.sqrt(node.loads.fx ** 2 + node.loads.fy ** 2);
      if (mag === 0) continue;

      const arrowLength = 50;
      const dx = (node.loads.fx / mag) * arrowLength;
      const dy = -(node.loads.fy / mag) * arrowLength;
      const startX = screen.x - dx;
      const startY = screen.y - dy;

      // Point-to-segment distance
      const segDx = screen.x - startX;
      const segDy = screen.y - startY;
      const lenSq = segDx * segDx + segDy * segDy;
      if (lenSq === 0) continue;
      let t = ((screenX - startX) * segDx + (screenY - startY) * segDy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const closestX = startX + t * segDx;
      const closestY = startY + t * segDy;
      const dist = Math.sqrt((screenX - closestX) ** 2 + (screenY - closestY) ** 2);
      if (dist < 10) return node.id;
    }
    return null;
  }, [mesh, worldToScreen]);

  // Find distributed load at screen position
  const findDistLoadAtScreen = useCallback((screenX: number, screenY: number): number | null => {
    for (const beam of mesh.beamElements.values()) {
      if (!beam.distributedLoad) continue;
      const { qy } = beam.distributedLoad;
      if (qy === 0) continue;

      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      const p1 = worldToScreen(n1.x, n1.y);
      const p2 = worldToScreen(n2.x, n2.y);

      const screenAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const perpAngle = screenAngle + Math.PI / 2;
      const arrowLength = Math.min(40, Math.abs(qy) / 500 * 40 + 20);
      const sign = qy > 0 ? 1 : -1;

      // Check if click is between the beam line and the arrow tops
      // Build bounding polygon: p1, p2, endTop, startTop
      const startTop = {
        x: p1.x + Math.cos(perpAngle) * arrowLength * sign,
        y: p1.y + Math.sin(perpAngle) * arrowLength * sign
      };
      const endTop = {
        x: p2.x + Math.cos(perpAngle) * arrowLength * sign,
        y: p2.y + Math.sin(perpAngle) * arrowLength * sign
      };

      // Simple check: point-to-segment distance for both beam line and top line
      const distToBeam = pointToSegmentDist(screenX, screenY, p1.x, p1.y, p2.x, p2.y);
      const distToTop = pointToSegmentDist(screenX, screenY, startTop.x, startTop.y, endTop.x, endTop.y);

      // Skip if click is right on the beam line (within 5px) - let beam handler take priority
      if (distToBeam < 5) continue;

      if (distToBeam < arrowLength + 5 && distToTop < arrowLength + 5 &&
          (distToBeam < 10 || distToTop < 10 ||
           (distToBeam < arrowLength && distToTop < arrowLength))) {
        return beam.id;
      }
    }
    return null;
  }, [mesh, worldToScreen]);

  const applyNewDimension = useCallback((beamId: number, newLength: number) => {
    if (isNaN(newLength) || newLength <= 0) return;

    const beam = mesh.getBeamElement(beamId);
    if (!beam) return;

    const nodes = mesh.getBeamElementNodes(beam);
    if (!nodes) return;
    const [n1, n2] = nodes;

    const currentLength = calculateBeamLength(n1, n2);
    if (currentLength === 0) return;

    const dx = (n2.x - n1.x) / currentLength;
    const dy = (n2.y - n1.y) / currentLength;

    // Move the unconstrained end; prefer moving n2
    const n2Constrained = n2.constraints.x || n2.constraints.y || n2.constraints.rotation;
    const n1Constrained = n1.constraints.x || n1.constraints.y || n1.constraints.rotation;

    if (n2Constrained && !n1Constrained) {
      mesh.updateNode(n1.id, { x: n2.x - dx * newLength, y: n2.y - dy * newLength });
    } else {
      mesh.updateNode(n2.id, { x: n1.x + dx * newLength, y: n1.y + dy * newLength });
    }

    dispatch({ type: 'REFRESH_MESH' });
    dispatch({ type: 'SET_RESULT', payload: null });
  }, [mesh, dispatch]);

  const getNodeIdToIndex = useCallback(() => {
    return buildNodeIdToIndex(mesh, analysisType);
  }, [mesh, analysisType]);

  const drawSupportSymbol = useCallback((
    ctx: CanvasRenderingContext2D,
    screen: { x: number; y: number },
    node: INode
  ) => {
    const { constraints } = node;

    if (constraints.x && constraints.y && constraints.rotation) {
      // Inklemming (fixed) - filled rectangle
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(screen.x - 12, screen.y - 6, 24, 12);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x - 12, screen.y - 6, 24, 12);
      // Hatch pattern
      ctx.beginPath();
      for (let i = -10; i <= 10; i += 5) {
        ctx.moveTo(screen.x + i, screen.y + 6);
        ctx.lineTo(screen.x + i - 6, screen.y + 16);
      }
      ctx.stroke();
    } else if (constraints.x && constraints.y) {
      // Scharnier (pinned) - triangle
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y);
      ctx.lineTo(screen.x - 12, screen.y + 20);
      ctx.lineTo(screen.x + 12, screen.y + 20);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Hatch pattern below
      ctx.beginPath();
      ctx.moveTo(screen.x - 14, screen.y + 22);
      ctx.lineTo(screen.x + 14, screen.y + 22);
      ctx.stroke();
      for (let i = -12; i <= 12; i += 6) {
        ctx.beginPath();
        ctx.moveTo(screen.x + i, screen.y + 22);
        ctx.lineTo(screen.x + i - 6, screen.y + 30);
        ctx.stroke();
      }
    } else if (constraints.y) {
      // Roloplegging (Z-roller) - standard structural engineering roller symbol
      // Triangle dimensions (~12px equilateral)
      const triHalfBase = 7;
      const triHeight = 12;
      const circleRadius = 3.5;
      const circleSpacing = 5; // horizontal offset from center for each circle
      const circleTopY = screen.y + triHeight + 1; // 1px gap below triangle base
      const circleCenterY = circleTopY + circleRadius;
      const groundLineY = circleCenterY + circleRadius + 1; // 1px gap below circles

      // 1. Equilateral triangle pointing down (apex at node)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y);
      ctx.lineTo(screen.x - triHalfBase, screen.y + triHeight);
      ctx.lineTo(screen.x + triHalfBase, screen.y + triHeight);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 2. Two roller circles below the triangle base
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(screen.x - circleSpacing, circleCenterY, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(screen.x + circleSpacing, circleCenterY, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3. Horizontal ground line below circles
      ctx.beginPath();
      ctx.moveTo(screen.x - 14, groundLineY);
      ctx.lineTo(screen.x + 14, groundLineY);
      ctx.stroke();

      // 4. Hatch marks below ground line
      for (let i = -12; i <= 12; i += 6) {
        ctx.beginPath();
        ctx.moveTo(screen.x + i, groundLineY);
        ctx.lineTo(screen.x + i - 5, groundLineY + 7);
        ctx.stroke();
      }
    } else if (constraints.x) {
      // Horizontal roller - vertical triangle
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y);
      ctx.lineTo(screen.x - 16, screen.y - 12);
      ctx.lineTo(screen.x - 16, screen.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Rollers
      ctx.beginPath();
      ctx.arc(screen.x - 21, screen.y - 6, 4, 0, Math.PI * 2);
      ctx.arc(screen.x - 21, screen.y + 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, []);

  const drawLoadArrow = useCallback((
    ctx: CanvasRenderingContext2D,
    screen: { x: number; y: number },
    node: INode
  ) => {
    const { loads } = node;

    // Point load arrow
    if (loads.fx !== 0 || loads.fy !== 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.lineWidth = 3;

      const mag = Math.sqrt(loads.fx ** 2 + loads.fy ** 2);
      const arrowLength = 50;
      const dx = (loads.fx / mag) * arrowLength;
      const dy = -(loads.fy / mag) * arrowLength;

      // Draw from outside pointing to node
      const startX = screen.x - dx;
      const startY = screen.y - dy;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(screen.x, screen.y);
      ctx.stroke();

      // Arrow head at node
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y);
      ctx.lineTo(
        screen.x - 12 * Math.cos(angle - 0.4),
        screen.y - 12 * Math.sin(angle - 0.4)
      );
      ctx.lineTo(
        screen.x - 12 * Math.cos(angle + 0.4),
        screen.y - 12 * Math.sin(angle + 0.4)
      );
      ctx.closePath();
      ctx.fill();

      // Force label
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ef4444';
      const forceText = formatForce(mag);
      ctx.fillText(forceText, startX - 30, startY - 5);
    }

    // Moment arrow
    if (loads.moment !== 0) {
      ctx.strokeStyle = '#9333ea';
      ctx.fillStyle = '#9333ea';
      ctx.lineWidth = 2;

      const radius = 20;
      const direction = loads.moment > 0 ? 1 : -1;

      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, -0.3 * Math.PI, 0.8 * Math.PI * direction, direction < 0);
      ctx.stroke();

      // Arrow head
      const endAngle = 0.8 * Math.PI * direction;
      const arrowX = screen.x + radius * Math.cos(endAngle);
      const arrowY = screen.y + radius * Math.sin(endAngle);
      const arrowAngle = endAngle + (direction > 0 ? Math.PI / 2 : -Math.PI / 2);

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - 8 * Math.cos(arrowAngle - 0.4),
        arrowY - 8 * Math.sin(arrowAngle - 0.4)
      );
      ctx.lineTo(
        arrowX - 8 * Math.cos(arrowAngle + 0.4),
        arrowY - 8 * Math.sin(arrowAngle + 0.4)
      );
      ctx.closePath();
      ctx.fill();

      // Moment label
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(formatMoment(Math.abs(loads.moment)), screen.x + 25, screen.y - 25);
    }
  }, []);

  const drawDistributedLoad = useCallback((
    ctx: CanvasRenderingContext2D,
    beam: IBeamElement,
    n1: INode,
    n2: INode,
    isSelected: boolean
  ) => {
    if (!beam.distributedLoad) return;
    const { qx, qy } = beam.distributedLoad;
    const qyE = beam.distributedLoad.qyEnd ?? qy;
    if (qx === 0 && qy === 0 && qyE === 0) return;

    const coordSystem = beam.distributedLoad.coordSystem ?? 'local';
    const startT = beam.distributedLoad.startT ?? 0;
    const endT = beam.distributedLoad.endT ?? 1;
    const isVariable = qyE !== qy;

    const p1 = worldToScreen(n1.x, n1.y);
    const p2 = worldToScreen(n2.x, n2.y);

    const isGlobal = coordSystem === 'global';

    // Use screen-space angle (Y flipped vs world coords) for correct perpendicular direction
    const screenAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const perpAngle = isGlobal ? Math.PI / 2 : screenAngle + Math.PI / 2;

    // Compute start and end points on beam for partial loads
    const loadP1 = {
      x: p1.x + (p2.x - p1.x) * startT,
      y: p1.y + (p2.y - p1.y) * startT
    };
    const loadP2 = {
      x: p1.x + (p2.x - p1.x) * endT,
      y: p1.y + (p2.y - p1.y) * endT
    };

    // Arrow lengths: for trapezoidal loads, interpolate between start and end
    const maxQ = Math.max(Math.abs(qy), Math.abs(qyE));
    const baseLen = Math.min(40, maxQ / 500 * 40 + 20);
    const startLen = maxQ === 0 ? 20 : (Math.abs(qy) / maxQ) * baseLen;
    const endLen = maxQ === 0 ? 20 : (Math.abs(qyE) / maxQ) * baseLen;

    const numArrows = Math.max(2, Math.round(8 * (endT - startT)));

    const loadColor = isSelected ? '#ef4444' : '#3b82f6';
    ctx.strokeStyle = loadColor;
    ctx.fillStyle = loadColor;
    ctx.lineWidth = 2;

    const topPoints: { x: number; y: number }[] = [];

    for (let i = 0; i <= numArrows; i++) {
      const t = i / numArrows;
      const px = loadP1.x + (loadP2.x - loadP1.x) * t;
      const py = loadP1.y + (loadP2.y - loadP1.y) * t;

      // Interpolate arrow length and sign for trapezoidal
      const currentQ = qy + (qyE - qy) * t;
      const currentLen = startLen + (endLen - startLen) * t;
      const sign = currentQ >= 0 ? 1 : -1;

      // Arrow start (top)
      const topX = px + Math.cos(perpAngle) * currentLen * sign;
      const topY = py + Math.sin(perpAngle) * currentLen * sign;
      topPoints.push({ x: topX, y: topY });

      // Only draw arrow if load is non-zero at this point
      if (Math.abs(currentQ) > 0.1) {
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Arrow head
        const arrowDir = Math.atan2(py - topY, px - topX);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 8 * Math.cos(arrowDir - 0.4), py - 8 * Math.sin(arrowDir - 0.4));
        ctx.lineTo(px - 8 * Math.cos(arrowDir + 0.4), py - 8 * Math.sin(arrowDir + 0.4));
        ctx.closePath();
        ctx.fill();
      }
    }

    // Connect tops of arrows with a line (for trapezoidal: sloped line)
    if (topPoints.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(topPoints[0].x, topPoints[0].y);
      for (let i = 1; i < topPoints.length; i++) {
        ctx.lineTo(topPoints[i].x, topPoints[i].y);
      }
      ctx.stroke();
    }

    const startTop = topPoints[0];
    const endTop = topPoints[topPoints.length - 1];

    // Load value label
    ctx.font = 'bold 11px sans-serif';
    const midX = (startTop.x + endTop.x) / 2;
    const midY = (startTop.y + endTop.y) / 2 - 10;
    const qLabel = isGlobal ? 'q(G)' : 'q';
    if (isVariable) {
      const qText = `${qLabel} = ${(Math.abs(qy) / 1000).toFixed(1)}..${(Math.abs(qyE) / 1000).toFixed(1)} kN/m`;
      ctx.fillText(qText, midX - 45, midY);
    } else {
      const qText = `${qLabel} = ${(Math.abs(qy) / 1000).toFixed(1)} kN/m`;
      ctx.fillText(qText, midX - 30, midY);
    }

    // Draw resize handles on selected beams with loads
    if (isSelected) {
      const handleSize = 6;
      const half = handleSize / 2;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = loadColor;
      ctx.lineWidth = 2;

      // Start handle
      ctx.fillRect(startTop.x - half, startTop.y - half, handleSize, handleSize);
      ctx.strokeRect(startTop.x - half, startTop.y - half, handleSize, handleSize);

      // End handle
      ctx.fillRect(endTop.x - half, endTop.y - half, handleSize, handleSize);
      ctx.strokeRect(endTop.x - half, endTop.y - half, handleSize, handleSize);
    }
  }, [worldToScreen]);

  const constraintTools = ['addPinned', 'addXRoller', 'addZRoller', 'addZSpring', 'addRotSpring', 'addXSpring', 'addFixed'] as const;
  const isConstraintTool = constraintTools.includes(selectedTool as typeof constraintTools[number]);

  const drawDimensions = useCallback((ctx: CanvasRenderingContext2D) => {
    const dimColor = '#718096';
    const dimOffset = 30; // px offset perpendicular to beam

    for (const beam of mesh.beamElements.values()) {
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      const p1 = worldToScreen(n1.x, n1.y);
      const p2 = worldToScreen(n2.x, n2.y);

      const length = calculateBeamLength(n1, n2);

      // Compute perpendicular direction in screen space (Y is flipped vs world)
      const screenAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const perpAngle = screenAngle - Math.PI / 2;

      const offsetX = Math.cos(perpAngle) * dimOffset;
      const offsetY = Math.sin(perpAngle) * dimOffset;

      // Dimension line endpoints (offset from beam endpoints)
      const d1 = { x: p1.x + offsetX, y: p1.y + offsetY };
      const d2 = { x: p2.x + offsetX, y: p2.y + offsetY };

      // Extension lines (dashed, from beam endpoints to dimension line)
      ctx.strokeStyle = dimColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(d1.x, d1.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(d2.x, d2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dimension line (solid with arrowheads)
      ctx.strokeStyle = dimColor;
      ctx.fillStyle = dimColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(d1.x, d1.y);
      ctx.lineTo(d2.x, d2.y);
      ctx.stroke();

      // Arrowheads
      const arrowSize = 8;
      const beamScreenAngle = Math.atan2(d2.y - d1.y, d2.x - d1.x);

      // Arrow at d1 (pointing towards d2)
      ctx.beginPath();
      ctx.moveTo(d1.x, d1.y);
      ctx.lineTo(
        d1.x + arrowSize * Math.cos(beamScreenAngle + 0.4),
        d1.y + arrowSize * Math.sin(beamScreenAngle + 0.4)
      );
      ctx.lineTo(
        d1.x + arrowSize * Math.cos(beamScreenAngle - 0.4),
        d1.y + arrowSize * Math.sin(beamScreenAngle - 0.4)
      );
      ctx.closePath();
      ctx.fill();

      // Arrow at d2 (pointing towards d1)
      ctx.beginPath();
      ctx.moveTo(d2.x, d2.y);
      ctx.lineTo(
        d2.x - arrowSize * Math.cos(beamScreenAngle - 0.4),
        d2.y - arrowSize * Math.sin(beamScreenAngle - 0.4)
      );
      ctx.lineTo(
        d2.x - arrowSize * Math.cos(beamScreenAngle + 0.4),
        d2.y - arrowSize * Math.sin(beamScreenAngle + 0.4)
      );
      ctx.closePath();
      ctx.fill();

      // Label centered on dimension line
      const labelText = `${(length * 1000).toFixed(0)} mm`;
      ctx.font = 'bold 11px sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = 14;

      const midX = (d1.x + d2.x) / 2;
      const midY = (d1.y + d2.y) / 2;

      // White background for readability
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(midX - textWidth / 2 - 3, midY - textHeight / 2 - 1, textWidth + 6, textHeight + 2);
      ctx.strokeStyle = dimColor;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(midX - textWidth / 2 - 3, midY - textHeight / 2 - 1, textWidth + 6, textHeight + 2);

      ctx.fillStyle = dimColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, midX, midY);

      // Reset text alignment
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }
  }, [mesh, worldToScreen]);

  const drawConstraintPreview = useCallback((
    ctx: CanvasRenderingContext2D,
    screenPos: { x: number; y: number },
    tool: string
  ) => {
    ctx.globalAlpha = 0.5;

    // Create a mock node for drawing
    let constraints = { x: false, y: false, rotation: false };
    switch (tool) {
      case 'addPinned': constraints = { x: true, y: true, rotation: false }; break;
      case 'addXRoller': constraints = { x: true, y: false, rotation: false }; break;
      case 'addZRoller': constraints = { x: false, y: true, rotation: false }; break;
      case 'addFixed': constraints = { x: true, y: true, rotation: true }; break;
      case 'addZSpring':
        constraints = { x: false, y: true, rotation: false };
        break;
      case 'addXSpring':
        constraints = { x: true, y: false, rotation: false };
        break;
      case 'addRotSpring':
        constraints = { x: false, y: false, rotation: true };
        break;
    }

    const mockNode = {
      id: -1,
      x: 0, y: 0,
      constraints,
      loads: { fx: 0, fy: 0, moment: 0 }
    };

    drawSupportSymbol(ctx, screenPos, mockNode);

    // For spring types, draw a spring symbol overlay
    if (tool === 'addZSpring' || tool === 'addXSpring' || tool === 'addRotSpring') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      const sx = screenPos.x;
      const sy = screenPos.y;

      if (tool === 'addZSpring') {
        // Vertical spring zigzag below
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const springTop = sy + 8;
        const springBot = sy + 28;
        const numZigs = 3;
        const segH = (springBot - springTop) / (numZigs * 2);
        ctx.lineTo(sx, springTop);
        for (let i = 0; i < numZigs; i++) {
          ctx.lineTo(sx + 8, springTop + segH * (i * 2 + 1));
          ctx.lineTo(sx - 8, springTop + segH * (i * 2 + 2));
        }
        ctx.lineTo(sx, springBot);
        ctx.stroke();
        // Ground line
        ctx.beginPath();
        ctx.moveTo(sx - 12, springBot + 2);
        ctx.lineTo(sx + 12, springBot + 2);
        ctx.stroke();
      } else if (tool === 'addXSpring') {
        // Horizontal spring zigzag to the left
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const springLeft = sx - 8;
        const springRight = sx - 28;
        const numZigs = 3;
        const segW = (springLeft - springRight) / (numZigs * 2);
        ctx.lineTo(springLeft, sy);
        for (let i = 0; i < numZigs; i++) {
          ctx.lineTo(springLeft - segW * (i * 2 + 1), sy + 8);
          ctx.lineTo(springLeft - segW * (i * 2 + 2), sy - 8);
        }
        ctx.lineTo(springRight, sy);
        ctx.stroke();
        // Wall line
        ctx.beginPath();
        ctx.moveTo(springRight - 2, sy - 12);
        ctx.lineTo(springRight - 2, sy + 12);
        ctx.stroke();
      } else if (tool === 'addRotSpring') {
        // Rotational spring - arc with zigzag
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0.3 * Math.PI, 0.7 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 1.3 * Math.PI, 1.7 * Math.PI);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1.0;
  }, [drawSupportSymbol]);

  const drawForceDiagram = useCallback((
    ctx: CanvasRenderingContext2D,
    diagramType: 'normal' | 'shear' | 'moment',
    globalLabels?: { x: number; y: number; w: number; h: number }[]
  ) => {
    if (!result) return;

    // Use global label list for collision detection across all beams and diagram types
    const allPlacedLabels = globalLabels || [];

    for (const beam of mesh.beamElements.values()) {
      const forces = result.beamForces.get(beam.id);
      if (!forces) continue;

      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      const p1 = worldToScreen(n1.x, n1.y);
      const p2 = worldToScreen(n2.x, n2.y);

      const L = calculateBeamLength(n1, n2);
      // Use screen-space angle for perpendicular direction (Y is flipped vs world)
      const screenAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const perpAngle = screenAngle - Math.PI / 2;

      let values: number[];
      let maxVal: number;
      let color: string;
      let fillColor: string;

      switch (diagramType) {
        case 'normal':
          values = forces.normalForce;
          maxVal = forces.maxN || 1;
          color = '#22c55e';
          fillColor = 'rgba(34, 197, 94, 0.3)';
          break;
        case 'shear':
          values = forces.shearForce;
          maxVal = forces.maxV || 1;
          color = '#3b82f6';
          fillColor = 'rgba(59, 130, 246, 0.3)';
          break;
        case 'moment':
        default:
          values = forces.bendingMoment;
          maxVal = forces.maxM || 1;
          color = '#ef4444';
          fillColor = 'rgba(239, 68, 68, 0.3)';
          break;
      }

      const scale = diagramScale / maxVal;

      // Draw filled diagram
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < forces.stations.length; i++) {
        const t = forces.stations[i] / L;
        const baseX = p1.x + (p2.x - p1.x) * t;
        const baseY = p1.y + (p2.y - p1.y) * t;

        const diagramValue = values[i];
        // Flip moment diagram to show on tension side (structural convention)
        const offset = (diagramType === 'moment' ? -diagramValue : diagramValue) * scale;

        const px = baseX + Math.cos(perpAngle) * offset;
        const py = baseY + Math.sin(perpAngle) * offset;

        points.push({ x: px, y: py });
        ctx.lineTo(px, py);
      }

      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.fill();

      // Draw hatching for shear force diagrams
      if (diagramType === 'shear') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        const hatchSpacing = 6;
        const beamScreenLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        const numHatches = Math.floor(beamScreenLen / hatchSpacing);
        for (let h = 1; h < numHatches; h++) {
          const t = h / numHatches;
          const baseX = p1.x + (p2.x - p1.x) * t;
          const baseY = p1.y + (p2.y - p1.y) * t;
          // Interpolate diagram point
          const stationIdx = Math.min(Math.floor(t * (forces.stations.length - 1)), forces.stations.length - 2);
          const localT = t * (forces.stations.length - 1) - stationIdx;
          const val = values[stationIdx] + (values[stationIdx + 1] - values[stationIdx]) * localT;
          const offset = val * scale;
          const px = baseX + Math.cos(perpAngle) * offset;
          const py = baseY + Math.sin(perpAngle) * offset;
          ctx.beginPath();
          ctx.moveTo(baseX, baseY);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
      }

      // Draw outline
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      for (const pt of points) {
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Draw perpendicular tick marks at beam ends for shear force diagram (sign indicators)
      if (diagramType === 'shear') {
        const tickLen = 5; // half-length of tick mark
        // Tick at start (p1)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x - Math.cos(perpAngle) * tickLen, p1.y - Math.sin(perpAngle) * tickLen);
        ctx.lineTo(p1.x + Math.cos(perpAngle) * tickLen, p1.y + Math.sin(perpAngle) * tickLen);
        ctx.stroke();
        // Tick at end (p2)
        ctx.beginPath();
        ctx.moveTo(p2.x - Math.cos(perpAngle) * tickLen, p2.y - Math.sin(perpAngle) * tickLen);
        ctx.lineTo(p2.x + Math.cos(perpAngle) * tickLen, p2.y + Math.sin(perpAngle) * tickLen);
        ctx.stroke();
      }

      // Draw baseline
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw values at key points with collision avoidance
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = color;

      // Collision avoidance: use global labels list across all beams
      const tryPlaceLabel = (text: string, lx: number, ly: number, bgColor?: string): void => {
        const w = ctx.measureText(text).width + 4;
        const h = 14;
        let finalY = ly;

        // Iteratively check overlap with existing labels and shift to resolve
        let maxIterations = 10;
        let hasOverlap = true;
        while (hasOverlap && maxIterations > 0) {
          hasOverlap = false;
          for (const placed of allPlacedLabels) {
            if (Math.abs(lx - placed.x) < (w + placed.w) / 2 &&
                Math.abs(finalY - placed.y) < (h + placed.h) / 2) {
              // Shift in the direction that creates the least displacement
              const shiftUp = placed.y - placed.h / 2 - h / 2;
              const shiftDown = placed.y + placed.h / 2 + h / 2;
              finalY = Math.abs(shiftUp - ly) < Math.abs(shiftDown - ly) ? shiftUp : shiftDown;
              hasOverlap = true;
              break; // re-check from start after shifting
            }
          }
          maxIterations--;
        }

        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(lx - 2, finalY - 12, w, h);
          ctx.fillStyle = color;
        }
        ctx.fillText(text, lx, finalY);
        allPlacedLabels.push({ x: lx + w / 2, y: finalY, w, h });
      };

      // Start value
      const startVal = values[0];
      if (Math.abs(startVal) > maxVal * 0.01) {
        const label = diagramType === 'moment' ? formatMoment(startVal) : formatForce(startVal);
        if (diagramType === 'moment') {
          // Place on tension side (same direction as diagram curve) with extra offset past the curve
          const startOffset = (-startVal) * scale; // moment uses -value for tension side
          const labelPx = p1.x + Math.cos(perpAngle) * startOffset;
          const labelPy = p1.y + Math.sin(perpAngle) * startOffset;
          // Offset further past the curve in the perpendicular direction
          const extraOffset = startOffset >= 0 ? 14 : -14;
          tryPlaceLabel(label, labelPx - 20, labelPy + Math.sin(perpAngle) * extraOffset);
        } else {
          tryPlaceLabel(label, p1.x - 40, p1.y - 10);
        }
      }

      // End value
      const endVal = values[values.length - 1];
      if (Math.abs(endVal) > maxVal * 0.01) {
        const label = diagramType === 'moment' ? formatMoment(endVal) : formatForce(endVal);
        if (diagramType === 'moment') {
          // Place on tension side (same direction as diagram curve) with extra offset past the curve
          const endOffset = (-endVal) * scale; // moment uses -value for tension side
          const labelPx = p2.x + Math.cos(perpAngle) * endOffset;
          const labelPy = p2.y + Math.sin(perpAngle) * endOffset;
          const extraOffset = endOffset >= 0 ? 14 : -14;
          tryPlaceLabel(label, labelPx + 5, labelPy + Math.sin(perpAngle) * extraOffset);
        } else {
          tryPlaceLabel(label, p2.x + 5, p2.y - 10);
        }
      }

      // Max value (find it)
      let maxIdx = 0;
      let absMax = 0;
      for (let i = 0; i < values.length; i++) {
        if (Math.abs(values[i]) > absMax) {
          absMax = Math.abs(values[i]);
          maxIdx = i;
        }
      }

      if (maxIdx > 0 && maxIdx < values.length - 1) {
        const t = forces.stations[maxIdx] / L;
        const labelX = p1.x + (p2.x - p1.x) * t;
        const labelY = p1.y + (p2.y - p1.y) * t;
        const diagramValue = values[maxIdx];
        // Apply same flip as the diagram drawing (moment is inverted for tension side)
        const offset = (diagramType === 'moment' ? -diagramValue : diagramValue) * scale;

        const label = diagramType === 'moment' ? formatMoment(values[maxIdx]) : formatForce(values[maxIdx]);
        // Position label on the diagram curve side, offset by a few pixels past the curve
        const labelOffsetX = labelX + Math.cos(perpAngle) * offset - 22;
        const labelOffsetY = labelY + Math.sin(perpAngle) * offset + (diagramType === 'moment' ? 14 : -8);
        tryPlaceLabel(label, labelOffsetX, labelOffsetY, '#fff');
      }
    }
  }, [result, mesh, worldToScreen, diagramScale]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const fmtForce = (val: number) => {
      if (forceUnit === 'N') return `${val.toFixed(0)} N`;
      return `${(val / 1000).toFixed(1)} kN`;
    };
    const fmtMoment = (val: number) => {
      if (forceUnit === 'N') return `${val.toFixed(0)} N·m`;
      return `${(val / 1000).toFixed(2)} kN·m`;
    };

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;

    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(width, height);

    const startX = Math.floor(topLeft.x / gridSize) * gridSize;
    const endX = Math.ceil(bottomRight.x / gridSize) * gridSize;
    const startY = Math.floor(bottomRight.y / gridSize) * gridSize;
    const endY = Math.ceil(topLeft.y / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      const screen = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(screen.x, 0);
      ctx.lineTo(screen.x, height);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      const screen = worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(0, screen.y);
      ctx.lineTo(width, screen.y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 2;
    const origin = worldToScreen(0, 0);

    // X axis
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();

    // Draw structural grid lines (stramienen / levels)
    if (structuralGrid.showGridLines) {
      ctx.save();
      ctx.setLineDash([16, 8]);
      ctx.lineWidth = 1.5;

      // Compute grid extent for clipping lines
      const vLines = structuralGrid.verticalLines;
      const hLines = structuralGrid.horizontalLines;
      const vPositions = vLines.map(l => l.position);
      const hPositions = hLines.map(l => l.position);
      const gridMinX = vPositions.length > 0 ? Math.min(...vPositions) : 0;
      const gridMaxX = vPositions.length > 0 ? Math.max(...vPositions) : 0;
      const gridMinY = hPositions.length > 0 ? Math.min(...hPositions) : 0;
      const gridMaxY = hPositions.length > 0 ? Math.max(...hPositions) : 0;
      const gridPadding = 0.5; // meters overshoot

      // Vertical grid lines — clip to horizontal grid extent
      for (const line of vLines) {
        const top = hPositions.length > 0 ? worldToScreen(line.position, gridMaxY + gridPadding) : { x: 0, y: 0 };
        const bot = hPositions.length > 0 ? worldToScreen(line.position, gridMinY - gridPadding) : { x: 0, y: height };
        const screenPos = worldToScreen(line.position, 0);
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(screenPos.x, hPositions.length > 0 ? top.y : 0);
        ctx.lineTo(screenPos.x, hPositions.length > 0 ? bot.y : height);
        ctx.stroke();

        // Circle label at top
        const labelY = (hPositions.length > 0 ? top.y : 0) - 20;
        ctx.setLineDash([]);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(screenPos.x, Math.max(labelY, 20), 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.name, screenPos.x, Math.max(labelY, 20));
        ctx.setLineDash([16, 8]);
      }

      // Horizontal grid lines — clip to vertical grid extent
      for (const line of hLines) {
        const left = vPositions.length > 0 ? worldToScreen(gridMinX - gridPadding, line.position) : { x: 0, y: 0 };
        const right2 = vPositions.length > 0 ? worldToScreen(gridMaxX + gridPadding, line.position) : { x: width, y: 0 };
        const screenPos = worldToScreen(0, line.position);
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(vPositions.length > 0 ? left.x : 0, screenPos.y);
        ctx.lineTo(vPositions.length > 0 ? right2.x : width, screenPos.y);
        ctx.stroke();

        // Label at left
        const labelX = (vPositions.length > 0 ? left.x : 0) - 20;
        ctx.setLineDash([]);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.name, Math.max(labelX, 8), screenPos.y - 8);
        ctx.setLineDash([16, 8]);
      }

      ctx.setLineDash([]);

      // Auto structural grid dimensioning
      // Horizontal dimensions between vertical grid lines (below structure)
      if (vLines.length >= 2) {
        const sorted = [...vLines].sort((a, b) => a.position - b.position);
        const dimY = gridMinY - gridPadding - 0.3;
        const dimScreenY = worldToScreen(0, dimY).y;

        ctx.strokeStyle = '#f59e0b';
        ctx.fillStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i < sorted.length - 1; i++) {
          const x1 = sorted[i].position;
          const x2 = sorted[i + 1].position;
          const s1 = worldToScreen(x1, dimY);
          const s2 = worldToScreen(x2, dimY);
          const dist = Math.abs(x2 - x1) * 1000; // meters → mm

          // Dimension line
          ctx.beginPath();
          ctx.moveTo(s1.x, dimScreenY);
          ctx.lineTo(s2.x, dimScreenY);
          ctx.stroke();

          // Ticks
          ctx.beginPath();
          ctx.moveTo(s1.x, dimScreenY - 4);
          ctx.lineTo(s1.x, dimScreenY + 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s2.x, dimScreenY - 4);
          ctx.lineTo(s2.x, dimScreenY + 4);
          ctx.stroke();

          // Label (clickable — underlined)
          const midX = (s1.x + s2.x) / 2;
          const dimLabel = `${dist.toFixed(0)}`;
          ctx.fillText(dimLabel, midX, dimScreenY + 4);
          // Draw subtle underline to indicate clickability
          const textW = ctx.measureText(dimLabel).width;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.setLineDash([2, 2]);
          ctx.moveTo(midX - textW / 2, dimScreenY + 16);
          ctx.lineTo(midX + textW / 2, dimScreenY + 16);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = '#f59e0b';
        }
      }

      // Vertical dimensions between horizontal grid lines (left of structure)
      if (hLines.length >= 2) {
        const sorted = [...hLines].sort((a, b) => a.position - b.position);
        const dimX = gridMinX - gridPadding - 0.3;
        const dimScreenX = worldToScreen(dimX, 0).x;

        ctx.strokeStyle = '#f59e0b';
        ctx.fillStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < sorted.length - 1; i++) {
          const y1 = sorted[i].position;
          const y2 = sorted[i + 1].position;
          const s1 = worldToScreen(dimX, y1);
          const s2 = worldToScreen(dimX, y2);
          const dist = Math.abs(y2 - y1) * 1000; // meters → mm

          // Dimension line
          ctx.beginPath();
          ctx.moveTo(dimScreenX, s1.y);
          ctx.lineTo(dimScreenX, s2.y);
          ctx.stroke();

          // Ticks
          ctx.beginPath();
          ctx.moveTo(dimScreenX - 4, s1.y);
          ctx.lineTo(dimScreenX + 4, s1.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(dimScreenX - 4, s2.y);
          ctx.lineTo(dimScreenX + 4, s2.y);
          ctx.stroke();

          // Label (clickable — underlined)
          const midY = (s1.y + s2.y) / 2;
          const vDimLabel = `${dist.toFixed(0)}`;
          ctx.fillText(vDimLabel, dimScreenX - 6, midY);
          // Draw subtle underline to indicate clickability
          const vTextW = ctx.measureText(vDimLabel).width;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.setLineDash([2, 2]);
          ctx.moveTo(dimScreenX - 6 - vTextW, midY + 7);
          ctx.lineTo(dimScreenX - 6, midY + 7);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = '#f59e0b';
        }
      }

      // Draw '-' remove buttons below each grid line label (stacked vertically)
      ctx.setLineDash([]);
      // Vertical line '-' buttons (below the label circle)
      if (vLines.length > 1) {
        for (const line of vLines) {
          const screenPos = worldToScreen(line.position, 0);
          const topY = hPositions.length > 0
            ? worldToScreen(line.position, gridMaxY + gridPadding).y
            : 0;
          const labelY = Math.max(topY - 20, 20);
          const minBtnX = screenPos.x;
          const minBtnY = labelY + 22;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.beginPath();
          ctx.arc(minBtnX, minBtnY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(minBtnX, minBtnY, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('−', minBtnX, minBtnY);
        }
      }
      // Horizontal line '-' buttons (below each label)
      if (hLines.length > 1) {
        for (const line of hLines) {
          const screenPos = worldToScreen(0, line.position);
          const leftX = vPositions.length > 0
            ? worldToScreen(gridMinX - gridPadding, line.position).x
            : 0;
          const labelX = Math.max(leftX - 20, 8);
          const minBtnX = labelX;
          const minBtnY = screenPos.y - 8 + 20;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.beginPath();
          ctx.arc(minBtnX, minBtnY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(minBtnX, minBtnY, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('−', minBtnX, minBtnY);
        }
      }

      // Draw '+' add buttons (stacked above the '-' button of the last grid line)
      ctx.setLineDash([]);
      // Vertical '+' above the '-' of the last vertical grid line
      if (vLines.length > 0) {
        const lastVLine = [...vLines].sort((a, b) => a.position - b.position).pop()!;
        const sp = worldToScreen(lastVLine.position, 0);
        const topY = hPositions.length > 0
          ? worldToScreen(lastVLine.position, gridMaxY + gridPadding).y
          : 0;
        const labelY = Math.max(topY - 20, 20);
        // Place '+' above the '-' button: '-' is at labelY+22, '+' goes at labelY+40
        const addBtnX = sp.x;
        const addBtnY = labelY + 40;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.beginPath();
        ctx.arc(addBtnX, addBtnY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(addBtnX, addBtnY, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', addBtnX, addBtnY);
      }

      // Horizontal '+' stacked below the '-' of the last horizontal grid line
      if (hLines.length > 0) {
        const lastHLine = [...hLines].sort((a, b) => a.position - b.position).pop()!;
        const sp = worldToScreen(0, lastHLine.position);
        const leftX = vPositions.length > 0
          ? worldToScreen(gridMinX - gridPadding, lastHLine.position).x
          : 0;
        const addBtnX = Math.max(leftX - 20, 8);
        const addBtnY = sp.y - 8 + 38;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.beginPath();
        ctx.arc(addBtnX, addBtnY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(addBtnX, addBtnY, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', addBtnX, addBtnY);
      }

      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    const nodeIdToIndex = result ? getNodeIdToIndex() : null;
    const dofsPerNode = analysisType === 'frame' ? 3 : analysisType === 'plate_bending' ? 3 : 2;

    // Draw triangle elements (for plane stress/strain)
    for (const element of mesh.elements.values()) {
      const nodes = mesh.getElementNodes(element);
      if (nodes.length !== 3) continue;

      let drawNodes = nodes;

      if (viewMode === 'results' && showDeformed && result && nodeIdToIndex) {
        drawNodes = nodes.map(n => {
          const idx = nodeIdToIndex.get(n.id);
          if (idx === undefined) return n;
          if (analysisType === 'plate_bending') {
            // w (deflection) mapped to y-offset for 2D visualization
            const w = result.displacements[idx * 3] * deformationScale;
            return { ...n, y: n.y + w };
          }
          const u = result.displacements[idx * 2] * deformationScale;
          const v = result.displacements[idx * 2 + 1] * deformationScale;
          return { ...n, x: n.x + u, y: n.y + v };
        });
      }

      const p1 = worldToScreen(drawNodes[0].x, drawNodes[0].y);
      const p2 = worldToScreen(drawNodes[1].x, drawNodes[1].y);
      const p3 = worldToScreen(drawNodes[2].x, drawNodes[2].y);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();

      // Fill with stress color or material color
      if (showStress && result) {
        const stress = result.elementStresses.get(element.id);
        if (stress) {
          let value: number;
          let minVal = result.minVonMises;
          let maxVal = result.maxVonMises;
          switch (stressType) {
            case 'sigmaX': value = stress.sigmaX; break;
            case 'sigmaY': value = stress.sigmaY; break;
            case 'tauXY': value = stress.tauXY; break;
            case 'mx': value = stress.mx ?? 0; minVal = result.minMoment ?? 0; maxVal = result.maxMoment ?? 1; break;
            case 'my': value = stress.my ?? 0; minVal = result.minMoment ?? 0; maxVal = result.maxMoment ?? 1; break;
            case 'mxy': value = stress.mxy ?? 0; minVal = result.minMoment ?? 0; maxVal = result.maxMoment ?? 1; break;
            default: value = stress.vonMises;
          }
          ctx.fillStyle = getStressColor(value, minVal, maxVal);
        }
      } else {
        const material = mesh.getMaterial(element.materialId);
        // Check for thermal load overlay
        const activeLc = loadCases.find(lc => lc.id === activeLoadCase);
        const hasThermal = activeLc?.thermalLoads?.some(tl => tl.elementId === element.id);
        if (hasThermal) {
          ctx.fillStyle = '#f59e0b50'; // light orange for thermal
        } else {
          ctx.fillStyle = material ? material.color + '40' : '#3b82f640';
        }
      }
      ctx.fill();

      // Stroke
      const isSelected = selection.elementIds.has(element.id);
      ctx.strokeStyle = isSelected ? '#e94560' : '#3b82f6';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    }

    // Draw plate region boundaries
    for (const plate of mesh.plateRegions.values()) {
      const isPlateSelected = selection.plateIds.has(plate.id);
      const bl = worldToScreen(plate.x, plate.y);
      const br = worldToScreen(plate.x + plate.width, plate.y);
      const tr = worldToScreen(plate.x + plate.width, plate.y + plate.height);
      const tl = worldToScreen(plate.x, plate.y + plate.height);

      // Light background fill
      ctx.fillStyle = isPlateSelected ? 'rgba(233, 69, 96, 0.08)' : 'rgba(59, 130, 246, 0.05)';
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(tl.x, tl.y);
      ctx.closePath();
      ctx.fill();

      // Dashed boundary rectangle
      ctx.strokeStyle = isPlateSelected ? '#e94560' : '#3b82f680';
      ctx.lineWidth = isPlateSelected ? 2 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(tl.x, tl.y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw edge load arrows for this plate
      if (showLoads && viewMode !== 'geometry') {
        const activeLc = loadCases.find(lc => lc.id === activeLoadCase);
        if (activeLc && activeLc.edgeLoads) {
          for (const el of activeLc.edgeLoads) {
            if (el.plateId !== plate.id) continue;
            const edgeNodes = plate.edges[el.edge].nodeIds;
            if (edgeNodes.length < 2) continue;

            const mag = Math.sqrt(el.px ** 2 + el.py ** 2);
            if (mag < 0.01) continue;

            // Draw arrows along the edge
            const arrowLen = Math.min(30, mag / 500 * 30 + 15);
            ctx.strokeStyle = '#3b82f6';
            ctx.fillStyle = '#3b82f6';
            ctx.lineWidth = 2;

            for (const nodeId of edgeNodes) {
              const node = mesh.getNode(nodeId);
              if (!node) continue;
              const sp = worldToScreen(node.x, node.y);

              // Arrow direction: normalized (px, py) in screen coords
              const dx = el.px / mag * arrowLen;
              const dy = -(el.py / mag) * arrowLen; // flip Y for screen

              const startX = sp.x - dx;
              const startY = sp.y - dy;

              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(sp.x, sp.y);
              ctx.stroke();

              // Arrow head
              const angle = Math.atan2(dy, dx);
              ctx.beginPath();
              ctx.moveTo(sp.x, sp.y);
              ctx.lineTo(sp.x - 8 * Math.cos(angle - 0.4), sp.y - 8 * Math.sin(angle - 0.4));
              ctx.lineTo(sp.x - 8 * Math.cos(angle + 0.4), sp.y - 8 * Math.sin(angle + 0.4));
              ctx.closePath();
              ctx.fill();
            }

            // Label
            const firstNode = mesh.getNode(edgeNodes[0]);
            const lastNode = mesh.getNode(edgeNodes[edgeNodes.length - 1]);
            if (firstNode && lastNode) {
              const sp1 = worldToScreen(firstNode.x, firstNode.y);
              const sp2 = worldToScreen(lastNode.x, lastNode.y);
              const midX = (sp1.x + sp2.x) / 2;
              const midY = (sp1.y + sp2.y) / 2;
              ctx.font = 'bold 10px sans-serif';
              ctx.fillStyle = '#3b82f6';
              const pxKN = (el.px / 1000).toFixed(1);
              const pyKN = (el.py / 1000).toFixed(1);
              ctx.fillText(`p = (${pxKN}, ${pyKN}) kN/m`, midX + 5, midY - arrowLen - 5);
            }
          }
        }
      }
    }

    // Draw thermal load labels on plates
    if (showLoads && viewMode !== 'geometry') {
      const activeLcForTherm = loadCases.find(lc => lc.id === activeLoadCase);
      if (activeLcForTherm?.thermalLoads) {
        // Group by plate
        const plateDeltas = new Map<number, number>();
        for (const tl of activeLcForTherm.thermalLoads) {
          if (tl.plateId !== undefined) {
            plateDeltas.set(tl.plateId, tl.deltaT);
          }
        }
        for (const [pId, dT] of plateDeltas) {
          const plate = mesh.getPlateRegion(pId);
          if (!plate) continue;
          const cx = plate.x + plate.width / 2;
          const cy = plate.y + plate.height / 2;
          const sp = worldToScreen(cx, cy);
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#f59e0b';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`ΔT = ${dT}°C`, sp.x, sp.y);
        }
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }
    }

    // Draw beam elements
    for (const beam of mesh.beamElements.values()) {
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      let drawN1 = n1;
      let drawN2 = n2;

      // Track cubic deformation curve points for drawing
      let deformedCurvePoints: { x: number; y: number }[] | null = null;

      if (viewMode === 'results' && showDeformed && result && nodeIdToIndex) {
        const idx1 = nodeIdToIndex.get(n1.id);
        const idx2 = nodeIdToIndex.get(n2.id);
        if (idx1 !== undefined && idx2 !== undefined) {
          const u1 = result.displacements[idx1 * dofsPerNode] * deformationScale;
          const v1 = result.displacements[idx1 * dofsPerNode + 1] * deformationScale;
          const u2 = result.displacements[idx2 * dofsPerNode] * deformationScale;
          const v2 = result.displacements[idx2 * dofsPerNode + 1] * deformationScale;
          drawN1 = { ...n1, x: n1.x + u1, y: n1.y + v1 };
          drawN2 = { ...n2, x: n2.x + u2, y: n2.y + v2 };

          // Cubic Hermite interpolation using rotation DOFs for frame analysis
          if (dofsPerNode === 3) {
            const theta1 = result.displacements[idx1 * 3 + 2] * deformationScale;
            const theta2 = result.displacements[idx2 * 3 + 2] * deformationScale;
            const L = calculateBeamLength(n1, n2);
            const alpha = calculateBeamAngle(n1, n2);
            const cosA = Math.cos(alpha);
            const sinA = Math.sin(alpha);

            // Transform global displacements to local beam coordinates
            const u1_loc = u1 * cosA + v1 * sinA;
            const v1_loc = -u1 * sinA + v1 * cosA;
            const u2_loc = u2 * cosA + v2 * sinA;
            const v2_loc = -u2 * sinA + v2 * cosA;

            const numPts = 16;
            deformedCurvePoints = [];
            for (let i = 0; i <= numPts; i++) {
              const t = i / numPts;
              // Hermite shape functions
              const H1 = 1 - 3 * t * t + 2 * t * t * t;
              const H2 = t - 2 * t * t + t * t * t;
              const H3 = 3 * t * t - 2 * t * t * t;
              const H4 = -t * t + t * t * t;

              // Local interpolated displacements
              const u_loc = (1 - t) * u1_loc + t * u2_loc;
              const v_loc = H1 * v1_loc + H2 * theta1 * L + H3 * v2_loc + H4 * theta2 * L;

              // Undeformed position along beam
              const x_base = n1.x + (n2.x - n1.x) * t;
              const y_base = n1.y + (n2.y - n1.y) * t;

              // Add displacement (transform local back to global)
              const dx = u_loc * cosA - v_loc * sinA;
              const dy = u_loc * sinA + v_loc * cosA;

              deformedCurvePoints.push(worldToScreen(x_base + dx, y_base + dy));
            }
          }
        }
      }

      const p1 = worldToScreen(drawN1.x, drawN1.y);
      const p2 = worldToScreen(drawN2.x, drawN2.y);

      // Draw beam as thick line (or cubic curve when deformed)
      const isSelected = selection.elementIds.has(beam.id);
      const isHovered = hoveredBeamId === beam.id;

      if (showMembers) {
        ctx.strokeStyle = isSelected ? '#e94560' : isHovered ? '#fbbf24' : '#60a5fa';
        ctx.lineWidth = isSelected ? 6 : isHovered ? 5 : 4;
        ctx.lineCap = 'round';

        if (deformedCurvePoints && deformedCurvePoints.length > 1) {
          // Draw smooth cubic deformation curve
          ctx.beginPath();
          ctx.moveTo(deformedCurvePoints[0].x, deformedCurvePoints[0].y);
          for (let i = 1; i < deformedCurvePoints.length; i++) {
            ctx.lineTo(deformedCurvePoints[i].x, deformedCurvePoints[i].y);
          }
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // Draw end circles (bar symbol)
        const circleR = 4;
        ctx.fillStyle = isSelected ? '#e94560' : isHovered ? '#fbbf24' : '#60a5fa';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw distributed load if present (only in loads/results view)
      if (showLoads && viewMode !== 'geometry') {
        const isLoadSelected = isSelected || selection.distLoadBeamIds.has(beam.id);
        drawDistributedLoad(ctx, beam, n1, n2, isLoadSelected);
      }

      // Draw profile name on beam (only if a named profile is assigned)
      if (showProfileNames && beam.profileName) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#8b949e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(beam.profileName, midX, midY - 6);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      // Draw I-section symbol at beam midpoint (bar symbol)
      if (showProfileNames && beam.section) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const beamAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const perpAngle = beamAngle + Math.PI / 2;
        const h = 10; // half-height of I-section symbol
        const fw = 6; // flange half-width

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(perpAngle);
        ctx.strokeStyle = isSelected ? '#e94560' : '#8b949e';
        ctx.lineWidth = 1.5;
        // Web (vertical line)
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(0, h);
        ctx.stroke();
        // Top flange
        ctx.beginPath();
        ctx.moveTo(-fw, -h);
        ctx.lineTo(fw, -h);
        ctx.stroke();
        // Bottom flange
        ctx.beginPath();
        ctx.moveTo(-fw, h);
        ctx.lineTo(fw, h);
        ctx.stroke();
        ctx.restore();
      }

      // Draw hinge symbols (small circles) at released beam ends
      if (beam.endReleases) {
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        if (beam.endReleases.startMoment) {
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        if (beam.endReleases.endMoment) {
          ctx.beginPath();
          ctx.arc(p2.x, p2.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Draw member label (beam ID)
      if (showMemberLabels) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#60a5fa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${beam.id}`, midX, midY + 6);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }

      // Draw UC badge when results are available
      if (viewMode === 'results' && result && beam.section) {
        const forces = result.beamForces.get(beam.id);
        if (forces) {
          const grade = STEEL_GRADES[2]; // S355
          const sectionProps = {
            A: beam.section.A,
            I: beam.section.I,
            h: beam.section.h,
            profileName: beam.profileName,
          };
          const check = checkSteelSection(sectionProps, forces, grade);
          const uc = check.UC_max;
          const isOk = uc <= 1.0;

          // Position: offset from beam end (3/4 along beam)
          const t = 0.75;
          const bx = p1.x + (p2.x - p1.x) * t;
          const by = p1.y + (p2.y - p1.y) * t;

          const label = `UC ${uc.toFixed(2)}`;
          ctx.font = 'bold 9px sans-serif';
          const tw = ctx.measureText(label).width + 8;
          const th = 14;

          // Badge background
          ctx.fillStyle = isOk ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
          const rx = bx - tw / 2;
          const ry = by - th - 4;
          ctx.beginPath();
          ctx.roundRect(rx, ry, tw, th, 3);
          ctx.fill();

          // Badge text
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, bx, ry + th / 2);

          // Checkmark or cross icon
          const iconX = bx - tw / 2 + 8;
          const iconY = ry + th / 2;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          if (isOk) {
            ctx.beginPath();
            ctx.moveTo(iconX - 3, iconY);
            ctx.lineTo(iconX - 1, iconY + 2);
            ctx.lineTo(iconX + 3, iconY - 2);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(iconX - 2, iconY - 2);
            ctx.lineTo(iconX + 2, iconY + 2);
            ctx.moveTo(iconX + 2, iconY - 2);
            ctx.lineTo(iconX - 2, iconY + 2);
            ctx.stroke();
          }

          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    // Draw dimensions when enabled
    if (showDimensions) {
      drawDimensions(ctx);
    }

    // Draw force diagrams (only in results view)
    if (viewMode === 'results' && result) {
      // Shared label collision list across all diagram types
      const diagramLabels: { x: number; y: number; w: number; h: number }[] = [];
      if (showNormal) drawForceDiagram(ctx, 'normal', diagramLabels);
      if (showShear) drawForceDiagram(ctx, 'shear', diagramLabels);
      if (showMoment) drawForceDiagram(ctx, 'moment', diagramLabels);
    }

    // Draw pending element preview
    if ((selectedTool === 'addElement' || selectedTool === 'addBeam') && pendingNodes.length > 0) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      const pendingNodeObjs = pendingNodes.map(id => mesh.getNode(id)).filter(n => n) as INode[];

      if (pendingNodeObjs.length >= 1) {
        ctx.beginPath();
        const p = worldToScreen(pendingNodeObjs[0].x, pendingNodeObjs[0].y);
        ctx.moveTo(p.x, p.y);

        for (let i = 1; i < pendingNodeObjs.length; i++) {
          const pn = worldToScreen(pendingNodeObjs[i].x, pendingNodeObjs[i].y);
          ctx.lineTo(pn.x, pn.y);
        }

        // Draw preview line from last pending node to cursor position
        if (cursorPos) {
          ctx.lineTo(cursorPos.x, cursorPos.y);

          // Show preview length label near cursor
          if (selectedTool === 'addBeam' && pendingNodes.length === 1) {
            const lastNode = pendingNodeObjs[pendingNodeObjs.length - 1];
            const lastP = worldToScreen(lastNode.x, lastNode.y);
            const cursorWorld = screenToWorld(cursorPos.x, cursorPos.y);
            const dx = cursorWorld.x - lastNode.x;
            const dy = cursorWorld.y - lastNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const midX = (lastP.x + cursorPos.x) / 2;
            const midY = (lastP.y + cursorPos.y) / 2;

            ctx.setLineDash([]);
            ctx.font = 'bold 11px sans-serif';
            const label = `${(dist * 1000).toFixed(0)} mm`;
            const textW = ctx.measureText(label).width + 8;
            ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
            ctx.fillRect(midX - textW / 2, midY - 18, textW, 16);
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, midX, midY - 10);
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
            ctx.setLineDash([5, 5]);
          }
        }

        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // Draw plate rubber-band preview
    if (selectedTool === 'addPlate' && plateFirstCorner && cursorPos) {
      const cursorWorld = screenToWorld(cursorPos.x, cursorPos.y);
      const snappedCursor = snapToGridFn(cursorWorld.x, cursorWorld.y);
      const p1 = worldToScreen(plateFirstCorner.x, plateFirstCorner.y);
      const p2 = worldToScreen(snappedCursor.x, plateFirstCorner.y);
      const p3 = worldToScreen(snappedCursor.x, snappedCursor.y);
      const p4 = worldToScreen(plateFirstCorner.x, snappedCursor.y);

      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Show dimensions
      const w = Math.abs(snappedCursor.x - plateFirstCorner.x);
      const h = Math.abs(snappedCursor.y - plateFirstCorner.y);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#3b82f6';
      const midX = (p1.x + p3.x) / 2;
      const midY = (p1.y + p3.y) / 2;
      ctx.fillText(`${(w * 1000).toFixed(0)} x ${(h * 1000).toFixed(0)} mm`, midX + 5, midY - 5);
    }

    // Draw nodes
    for (const node of mesh.nodes.values()) {
      let drawNode = node;

      if (viewMode === 'results' && showDeformed && result && nodeIdToIndex) {
        const idx = nodeIdToIndex.get(node.id);
        if (idx !== undefined) {
          const u = result.displacements[idx * dofsPerNode] * deformationScale;
          const v = result.displacements[idx * dofsPerNode + 1] * deformationScale;
          drawNode = { ...node, x: node.x + u, y: node.y + v };
        }
      }

      const screen = worldToScreen(drawNode.x, drawNode.y);
      const isSelected = selection.nodeIds.has(node.id);
      const isPending = pendingNodes.includes(node.id);

      // Draw constraint symbol FIRST (behind node)
      if (showSupports && (node.constraints.x || node.constraints.y || node.constraints.rotation)) {
        drawSupportSymbol(ctx, screen, node);
      }

      // Draw load arrow (only in loads/results view)
      if (showLoads && viewMode !== 'geometry' && (node.loads.fx !== 0 || node.loads.fy !== 0 || node.loads.moment !== 0)) {
        const isLoadSelected = selection.pointLoadNodeIds.has(node.id);
        if (isLoadSelected) {
          // Highlight glow for selected point loads
          ctx.save();
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
          drawLoadArrow(ctx, screen, node);
          ctx.restore();
        } else {
          drawLoadArrow(ctx, screen, node);
        }
      }

      // Draw hovered node highlight ring
      const isHoveredNode = hoveredNodeId === node.id;
      if (isHoveredNode && !isSelected && !isPending) {
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw node
      if (showNodes) {
        // Check if this is a plate mesh node (belongs to a plate region)
        const isPlateNode = Array.from(mesh.plateRegions.values()).some(pr => pr.nodeIds.includes(node.id) && !pr.cornerNodeIds.includes(node.id));
        const nodeRadius = isPlateNode ? 3 : 6;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, nodeRadius, 0, Math.PI * 2);

        if (isPending) {
          ctx.fillStyle = '#fbbf24';
        } else if (isSelected) {
          ctx.fillStyle = '#e94560';
        } else if (isPlateNode) {
          ctx.fillStyle = '#8b949e'; // gray for plate mesh nodes
        } else {
          ctx.fillStyle = '#4ade80';
        }
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node label
      if (showNodeLabels) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${node.id}`, screen.x + 10, screen.y - 10);
      }
    }

    // Draw gizmo for single selected node
    if (selection.nodeIds.size === 1 && selectedTool === 'select') {
      const selectedNodeId = Array.from(selection.nodeIds)[0];
      const selectedNode = mesh.getNode(selectedNodeId);
      if (selectedNode) {
        const screen = worldToScreen(selectedNode.x, selectedNode.y);
        drawGizmo(ctx, screen);
      }
    }

    // Draw beam mid-gizmo for single selected beam
    if (selection.elementIds.size === 1 && selection.nodeIds.size === 0 && selectedTool === 'select') {
      const selectedBeamId = Array.from(selection.elementIds)[0];
      const selectedBeam = mesh.getBeamElement(selectedBeamId);
      if (selectedBeam) {
        const beamNodes = mesh.getBeamElementNodes(selectedBeam);
        if (beamNodes) {
          const [bn1, bn2] = beamNodes;
          const sp1 = worldToScreen(bn1.x, bn1.y);
          const sp2 = worldToScreen(bn2.x, bn2.y);
          const midSX = (sp1.x + sp2.x) / 2;
          const midSY = (sp1.y + sp2.y) / 2;

          // Draw move handle at midpoint
          const handleR = 10;
          ctx.fillStyle = draggedBeamId === selectedBeamId ? '#60a5fa' : '#4299e1';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(midSX, midSY, handleR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw move arrows inside the circle
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          const arrowR = 5;
          // Horizontal arrows
          ctx.beginPath();
          ctx.moveTo(midSX - arrowR, midSY);
          ctx.lineTo(midSX + arrowR, midSY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(midSX + arrowR, midSY);
          ctx.lineTo(midSX + arrowR - 3, midSY - 2);
          ctx.moveTo(midSX + arrowR, midSY);
          ctx.lineTo(midSX + arrowR - 3, midSY + 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(midSX - arrowR, midSY);
          ctx.lineTo(midSX - arrowR + 3, midSY - 2);
          ctx.moveTo(midSX - arrowR, midSY);
          ctx.lineTo(midSX - arrowR + 3, midSY + 2);
          ctx.stroke();
          // Vertical arrows
          ctx.beginPath();
          ctx.moveTo(midSX, midSY - arrowR);
          ctx.lineTo(midSX, midSY + arrowR);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(midSX, midSY - arrowR);
          ctx.lineTo(midSX - 2, midSY - arrowR + 3);
          ctx.moveTo(midSX, midSY - arrowR);
          ctx.lineTo(midSX + 2, midSY - arrowR + 3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(midSX, midSY + arrowR);
          ctx.lineTo(midSX - 2, midSY + arrowR - 3);
          ctx.moveTo(midSX, midSY + arrowR);
          ctx.lineTo(midSX + 2, midSY + arrowR - 3);
          ctx.stroke();
        }
      }
    }

    // Draw point load preview at cursor when addLoad tool active
    if ((selectedTool === 'addLoad' || selectedTool === 'addLineLoad') && cursorPos) {
      ctx.strokeStyle = selectedTool === 'addLoad' ? '#ef4444' : '#3b82f6';
      ctx.fillStyle = selectedTool === 'addLoad' ? '#ef4444' : '#3b82f6';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 3;

      if (selectedTool === 'addLoad') {
        // Ghost point load arrow pointing down
        ctx.beginPath();
        ctx.moveTo(cursorPos.x, cursorPos.y - 50);
        ctx.lineTo(cursorPos.x, cursorPos.y);
        ctx.stroke();
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(cursorPos.x, cursorPos.y);
        ctx.lineTo(cursorPos.x - 6, cursorPos.y - 12);
        ctx.lineTo(cursorPos.x + 6, cursorPos.y - 12);
        ctx.closePath();
        ctx.fill();
      } else {
        // Ghost distributed load arrows
        const arrowSpacing = 20;
        for (let i = -2; i <= 2; i++) {
          const ax = cursorPos.x + i * arrowSpacing;
          ctx.beginPath();
          ctx.moveTo(ax, cursorPos.y - 35);
          ctx.lineTo(ax, cursorPos.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax, cursorPos.y);
          ctx.lineTo(ax - 4, cursorPos.y - 8);
          ctx.lineTo(ax + 4, cursorPos.y - 8);
          ctx.closePath();
          ctx.fill();
        }
        // Top line
        ctx.beginPath();
        ctx.moveTo(cursorPos.x - 2 * arrowSpacing, cursorPos.y - 35);
        ctx.lineTo(cursorPos.x + 2 * arrowSpacing, cursorPos.y - 35);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }

    // Draw reaction forces if result exists (only in results view)
    if (viewMode === 'results' && result && analysisType === 'frame' && showReactions) {
      ctx.font = 'bold 10px sans-serif';

      for (const node of mesh.nodes.values()) {
        if (!node.constraints.x && !node.constraints.y && !node.constraints.rotation) continue;

        const idx = nodeIdToIndex?.get(node.id);
        if (idx === undefined) continue;

        const screen = worldToScreen(node.x, node.y);

        // Reaction forces
        const Rx = node.constraints.x ? result.reactions[idx * 3] : 0;
        const Ry = node.constraints.y ? result.reactions[idx * 3 + 1] : 0;
        const Rm = node.constraints.rotation ? result.reactions[idx * 3 + 2] : 0;

        const reactionColor = '#10b981';
        const arrowLen = 40;
        const supportOffset = 30; // offset below support symbol
        let labelY = screen.y + supportOffset + arrowLen + 8;

        // Draw Rx arrow (horizontal, positioned below support symbol)
        if (Math.abs(Rx) > 0.01) {
          const dir = Rx > 0 ? 1 : -1;
          ctx.strokeStyle = reactionColor;
          ctx.fillStyle = reactionColor;
          ctx.lineWidth = 2;
          // Position arrow below the support symbol
          const rxY = screen.y + supportOffset + 10;
          const startX = screen.x - dir * arrowLen;
          const tipX = screen.x;
          ctx.beginPath();
          ctx.moveTo(startX, rxY);
          ctx.lineTo(tipX, rxY);
          ctx.stroke();
          // Arrow head pointing toward node
          ctx.beginPath();
          ctx.moveTo(tipX, rxY);
          ctx.lineTo(tipX - dir * 8, rxY - 4);
          ctx.lineTo(tipX - dir * 8, rxY + 4);
          ctx.closePath();
          ctx.fill();
          // Label below arrow
          ctx.fillStyle = reactionColor;
          ctx.fillText(`Rx: ${fmtForce(Rx)}`, screen.x - 30, labelY);
          labelY += 12;
        }

        // Draw Ry arrow (vertical, starting below support)
        if (Math.abs(Ry) > 0.01) {
          ctx.strokeStyle = reactionColor;
          ctx.fillStyle = reactionColor;
          ctx.lineWidth = 2;
          if (Ry > 0) {
            // Positive (upward): arrow below support pointing up
            const startY = screen.y + supportOffset + arrowLen;
            const tipY = screen.y + supportOffset;
            ctx.beginPath();
            ctx.moveTo(screen.x, startY);
            ctx.lineTo(screen.x, tipY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screen.x, tipY);
            ctx.lineTo(screen.x - 4, tipY + 8);
            ctx.lineTo(screen.x + 4, tipY + 8);
            ctx.closePath();
            ctx.fill();
          } else {
            // Negative (downward): arrow below support pointing down
            const startY = screen.y + supportOffset;
            const tipY = screen.y + supportOffset + arrowLen;
            ctx.beginPath();
            ctx.moveTo(screen.x, startY);
            ctx.lineTo(screen.x, tipY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screen.x, tipY);
            ctx.lineTo(screen.x - 4, tipY - 8);
            ctx.lineTo(screen.x + 4, tipY - 8);
            ctx.closePath();
            ctx.fill();
          }
          // Label
          ctx.fillStyle = reactionColor;
          ctx.fillText(`Rz: ${fmtForce(Ry)}`, screen.x - 30, labelY);
          labelY += 12;
        }

        // Draw Rm arc arrow (moment)
        if (Math.abs(Rm) > 0.01) {
          const arcR = 16;
          ctx.strokeStyle = reactionColor;
          ctx.lineWidth = 2;
          const startAngle = Rm > 0 ? -Math.PI * 0.75 : Math.PI * 0.25;
          const endAngle = Rm > 0 ? Math.PI * 0.25 : -Math.PI * 0.75;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, arcR, startAngle, endAngle, Rm < 0);
          ctx.stroke();
          // Arrow tip on arc
          const tipAngle = endAngle;
          const tipX = screen.x + arcR * Math.cos(tipAngle);
          const tipY = screen.y + arcR * Math.sin(tipAngle);
          const tangent = Rm > 0 ? tipAngle + Math.PI / 2 : tipAngle - Math.PI / 2;
          ctx.fillStyle = reactionColor;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - 6 * Math.cos(tangent - 0.5), tipY - 6 * Math.sin(tangent - 0.5));
          ctx.lineTo(tipX - 6 * Math.cos(tangent + 0.5), tipY - 6 * Math.sin(tangent + 0.5));
          ctx.closePath();
          ctx.fill();
          // Label
          ctx.fillText(`Rm: ${fmtMoment(Rm)}`, screen.x - 25, labelY);
        }
      }
    }

    // Draw navigation cube (top-left overlay)
    {
      const cubeX = 16;
      const cubeY = 16;
      const cubeW = 130;
      const cubeH = 90;

      // Background
      ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cubeX, cubeY, cubeW, cubeH, 6);
      ctx.fill();
      ctx.stroke();

      const axisOriginX = cubeX + 20;
      const axisOriginY = cubeY + 58;
      const axisLen = 32;
      const arrowH = 7;

      // X axis (right) - red
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(axisOriginX, axisOriginY);
      ctx.lineTo(axisOriginX + axisLen, axisOriginY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(axisOriginX + axisLen + arrowH, axisOriginY);
      ctx.lineTo(axisOriginX + axisLen, axisOriginY - 3);
      ctx.lineTo(axisOriginX + axisLen, axisOriginY + 3);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('+X', axisOriginX + axisLen + 10, axisOriginY + 4);

      // Z axis (up) - green
      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(axisOriginX, axisOriginY);
      ctx.lineTo(axisOriginX, axisOriginY - axisLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(axisOriginX, axisOriginY - axisLen - arrowH);
      ctx.lineTo(axisOriginX - 3, axisOriginY - axisLen);
      ctx.lineTo(axisOriginX + 3, axisOriginY - axisLen);
      ctx.closePath();
      ctx.fill();
      ctx.fillText('+Z', axisOriginX - 4, axisOriginY - axisLen - 10);

      // Sign conventions on right side of cube
      const convX = axisOriginX + axisLen + 36;
      const convY = cubeY + 20;

      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#8b949e';

      // Force convention: downward arrow with "−"
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(convX, convY);
      ctx.lineTo(convX, convY + 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(convX, convY + 17);
      ctx.lineTo(convX - 3, convY + 13);
      ctx.lineTo(convX + 3, convY + 13);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#8b949e';
      ctx.fillText('F−', convX + 6, convY + 14);

      // Moment convention: CCW arc with "+"
      const mCx = convX;
      const mCy = convY + 38;
      const mR = 9;
      ctx.strokeStyle = '#9333ea';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mCx, mCy, mR, -0.6 * Math.PI, 0.6 * Math.PI, false);
      ctx.stroke();
      // Arrow at end of arc
      const endA = 0.6 * Math.PI;
      const aex = mCx + mR * Math.cos(endA);
      const aey = mCy + mR * Math.sin(endA);
      ctx.fillStyle = '#9333ea';
      ctx.beginPath();
      ctx.moveTo(aex + 3, aey + 2);
      ctx.lineTo(aex - 3, aey - 1);
      ctx.lineTo(aex + 1, aey - 4);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#8b949e';
      ctx.fillText('M+', mCx + mR + 5, mCy + 4);
    }

    // Draw snap indicator when near a node (constraint or beam tool)
    if (snapNodeId !== null && cursorPos) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw constraint preview at cursor position
    if (isConstraintTool && cursorPos) {
      drawConstraintPreview(ctx, cursorPos, selectedTool);
    }

    // Draw move preview (ghost of selected elements at new position)
    if (moveMode && cursorPos && selection.nodeIds.size > 0) {
      const world = screenToWorld(cursorPos.x, cursorPos.y);
      const snapped = snapToGridFn(world.x, world.y);

      // Calculate centroid of selected nodes
      let sumX = 0, sumY = 0, count = 0;
      for (const nodeId of selection.nodeIds) {
        const node = mesh.getNode(nodeId);
        if (node) { sumX += node.x; sumY += node.y; count++; }
      }
      if (count > 0) {
        const deltaX = snapped.x - sumX / count;
        const deltaY = snapped.y - sumY / count;

        ctx.globalAlpha = 0.4;

        // Draw ghost beams connected to selected nodes
        for (const beam of mesh.beamElements.values()) {
          const n1 = mesh.getNode(beam.nodeIds[0]);
          const n2 = mesh.getNode(beam.nodeIds[1]);
          if (!n1 || !n2) continue;
          const sel1 = selection.nodeIds.has(n1.id);
          const sel2 = selection.nodeIds.has(n2.id);
          if (!sel1 && !sel2) continue;
          const gp1 = worldToScreen(sel1 ? n1.x + deltaX : n1.x, sel1 ? n1.y + deltaY : n1.y);
          const gp2 = worldToScreen(sel2 ? n2.x + deltaX : n2.x, sel2 ? n2.y + deltaY : n2.y);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 4;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(gp1.x, gp1.y);
          ctx.lineTo(gp2.x, gp2.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw ghost nodes
        for (const nodeId of selection.nodeIds) {
          const node = mesh.getNode(nodeId);
          if (!node) continue;
          const gs = worldToScreen(node.x + deltaX, node.y + deltaY);
          ctx.beginPath();
          ctx.arc(gs.x, gs.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
      }
    }

    // Draw beam angle labels during node or beam dragging
    if (draggedNode !== null || draggedBeamId !== null) {
      const beamsToLabel = new Set<number>();
      if (draggedNode !== null) {
        // Find all beams connected to the dragged node
        for (const beam of mesh.beamElements.values()) {
          if (beam.nodeIds[0] === draggedNode || beam.nodeIds[1] === draggedNode) {
            beamsToLabel.add(beam.id);
          }
        }
      }
      if (draggedBeamId !== null) {
        beamsToLabel.add(draggedBeamId);
      }

      for (const beamId of beamsToLabel) {
        const beam = mesh.getBeamElement(beamId);
        if (!beam) continue;
        const bn1 = mesh.getNode(beam.nodeIds[0]);
        const bn2 = mesh.getNode(beam.nodeIds[1]);
        if (!bn1 || !bn2) continue;

        const sp1 = worldToScreen(bn1.x, bn1.y);
        const sp2 = worldToScreen(bn2.x, bn2.y);
        const midSX = (sp1.x + sp2.x) / 2;
        const midSY = (sp1.y + sp2.y) / 2;

        // Calculate angle in degrees (world coordinates, measured from horizontal)
        const angleDeg = Math.atan2(bn2.y - bn1.y, bn2.x - bn1.x) * (180 / Math.PI);
        const label = `${Math.abs(angleDeg).toFixed(1)}°`;

        ctx.font = 'bold 11px sans-serif';
        const textW = ctx.measureText(label).width + 8;
        const labelX = midSX;
        const labelY = midSY + 18;

        ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
        ctx.fillRect(labelX - textW / 2, labelY - 8, textW, 16);
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX, labelY);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }
    }

    // Draw selection box (window vs crossing)
    if (selectionBox) {
      const { startX, startY, endX, endY } = selectionBox;
      const bx = Math.min(startX, endX);
      const by = Math.min(startY, endY);
      const bw = Math.abs(endX - startX);
      const bh = Math.abs(endY - startY);

      // Detect drag direction: endX < startX = crossing (left), else = window (right)
      const isCrossing = endX < startX;

      if (isCrossing) {
        // Crossing selection: dashed border, lighter fill
        ctx.fillStyle = 'rgba(74, 222, 128, 0.05)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      } else {
        // Window selection: solid border, darker fill
        ctx.fillStyle = 'rgba(74, 222, 128, 0.15)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(bx, by, bw, bh);
      }
    }

  }, [
    mesh, result, selection, viewState, showDeformed, deformationScale,
    showStress, stressType, pendingNodes, selectedTool, gridSize, analysisType,
    showMoment, showShear, showNormal, diagramScale, viewMode, showProfileNames, showReactions, meshVersion,
    showNodes, showMembers, showSupports, showLoads, showNodeLabels, showMemberLabels, showDimensions, forceUnit,
    isConstraintTool, cursorPos, snapNodeId, hoveredBeamId, hoveredNodeId, moveMode, selectionBox, draggedBeamId, draggedNode,
    structuralGrid, plateFirstCorner, loadCases, activeLoadCase,
    screenToWorld, worldToScreen, snapToGridFn, getNodeIdToIndex, drawSupportSymbol, drawLoadArrow,
    drawDistributedLoad, drawForceDiagram, drawGizmo, drawDimensions, drawConstraintPreview
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Clear last used beam section when switching away from addBeam tool
  useEffect(() => {
    if (selectedTool !== 'addBeam') {
      setLastUsedSection(null);
    }
  }, [selectedTool]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      // Handle 'M' key - immediately activate move mode
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (selection.nodeIds.size > 0) {
          setMoveMode(true);
          dispatch({ type: 'SET_TOOL', payload: 'select' });
        }
      }

      // When drawing beam with first node placed, typing a digit opens length input
      if (selectedTool === 'addBeam' && pendingNodes.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (/^[0-9.]$/.test(e.key) && beamLengthInput === null) {
          e.preventDefault();
          setBeamLengthInput(e.key);
          return;
        }
      }

      // Handle Escape - cancel current tool / move mode
      if (e.key === 'Escape') {
        if (beamLengthInput !== null) {
          setBeamLengthInput(null);
          return;
        }
        if (plateFirstCorner) {
          setPlateFirstCorner(null);
          return;
        }
        setPendingCommand(null);
        setMoveMode(false);
        // Return to select tool from any placement tool
        if (selectedTool !== 'select') {
          dispatch({ type: 'SET_TOOL', payload: 'select' });
        }
      }

      // Handle Delete key
      if (e.key === 'Delete') {
        if (selection.nodeIds.size > 0 || selection.elementIds.size > 0 || selection.plateIds.size > 0) {
          pushUndo();
          // Delete selected plates first (removes their elements/nodes)
          for (const plateId of selection.plateIds) {
            const plate = mesh.getPlateRegion(plateId);
            const elementIds = plate ? [...plate.elementIds] : [];
            removePlateRegion(mesh, plateId);
            dispatch({ type: 'CLEANUP_PLATE_LOADS', payload: { plateId, elementIds } });
          }
          // Delete selected nodes (cascades to connected beams)
          for (const nodeId of selection.nodeIds) {
            mesh.removeNode(nodeId);
          }
          // Delete selected elements (that weren't already removed with plates)
          for (const elementId of selection.elementIds) {
            mesh.removeElement(elementId);
          }
          dispatch({ type: 'CLEAR_SELECTION' });
          dispatch({ type: 'REFRESH_MESH' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, pendingCommand, mesh, dispatch, selectedTool, pushUndo, pendingNodes, beamLengthInput]);

  // LC filtering: apply active load case to mesh when LC tab changes
  useEffect(() => {
    const activeLc = loadCases.find(lc => lc.id === activeLoadCase);
    if (activeLc) {
      applyLoadCaseToMesh(mesh, activeLc);
      dispatch({ type: 'REFRESH_MESH' });
    }
  }, [activeLoadCase, loadCases, mesh, dispatch]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle move mode (M+Enter)
    if (moveMode && selection.nodeIds.size > 0) {
      pushUndo();
      const world = screenToWorld(x, y);
      const snapped = snapToGridFn(world.x, world.y);

      // Calculate the centroid of selected nodes
      let sumX = 0, sumY = 0;
      for (const nodeId of selection.nodeIds) {
        const node = mesh.getNode(nodeId);
        if (node) {
          sumX += node.x;
          sumY += node.y;
        }
      }
      const centroidX = sumX / selection.nodeIds.size;
      const centroidY = sumY / selection.nodeIds.size;

      // Move all selected nodes by the delta
      const deltaX = snapped.x - centroidX;
      const deltaY = snapped.y - centroidY;

      for (const nodeId of selection.nodeIds) {
        const node = mesh.getNode(nodeId);
        if (node) {
          mesh.updateNode(nodeId, {
            x: node.x + deltaX,
            y: node.y + deltaY
          });
        }
      }

      setMoveMode(false);
      dispatch({ type: 'REFRESH_MESH' });
      return;
    }

    if (selectedTool === 'pan' || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Check grid line label click (circles) for dragging
    if (structuralGrid.showGridLines) {
      const vLines = structuralGrid.verticalLines;
      const hLines = structuralGrid.horizontalLines;
      const vPositions = vLines.map(l => l.position);
      const hPositions = hLines.map(l => l.position);
      const gridMaxY = hPositions.length > 0 ? Math.max(...hPositions) : 0;
      const gridMinX = vPositions.length > 0 ? Math.min(...vPositions) : 0;
      const gridPadding = 0.5;

      // Check vertical line circle labels
      for (const line of vLines) {
        const screenPos = worldToScreen(line.position, 0);
        const topY = hPositions.length > 0
          ? worldToScreen(line.position, gridMaxY + gridPadding).y
          : 0;
        const labelY = Math.max(topY - 20, 20);
        const dist = Math.sqrt((x - screenPos.x) ** 2 + (y - labelY) ** 2);
        if (dist < 14) {
          setDraggedGridLineId(line.id);
          setDraggedGridLineType('vertical');
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
          return;
        }
      }

      // Check horizontal line labels
      for (const line of hLines) {
        const screenPos = worldToScreen(0, line.position);
        const leftX = vPositions.length > 0
          ? worldToScreen(gridMinX - gridPadding, line.position).x
          : 0;
        const labelX = Math.max(leftX - 20, 8);
        const dist = Math.sqrt((x - labelX - 15) ** 2 + (y - (screenPos.y - 8)) ** 2);
        if (dist < 14) {
          setDraggedGridLineId(line.id);
          setDraggedGridLineType('horizontal');
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
          return;
        }
      }

      // Check '-' buttons for removing grid lines (vertical: below label circle)
      if (vLines.length > 1) {
        for (const line of vLines) {
          const screenPos = worldToScreen(line.position, 0);
          const topY = hPositions.length > 0
            ? worldToScreen(line.position, gridMaxY + gridPadding).y
            : 0;
          const labelY = Math.max(topY - 20, 20);
          const minBtnX = screenPos.x;
          const minBtnY = labelY + 22;
          if (Math.sqrt((x - minBtnX) ** 2 + (y - minBtnY) ** 2) < 10) {
            dispatch({
              type: 'SET_STRUCTURAL_GRID',
              payload: { ...structuralGrid, verticalLines: vLines.filter(l => l.id !== line.id) }
            });
            return;
          }
        }
      }
      if (hLines.length > 1) {
        for (const line of hLines) {
          const screenPos = worldToScreen(0, line.position);
          const leftX = vPositions.length > 0
            ? worldToScreen(gridMinX - gridPadding, line.position).x
            : 0;
          const labelX = Math.max(leftX - 20, 8);
          const minBtnX = labelX;
          const minBtnY = screenPos.y - 8 + 20;
          if (Math.sqrt((x - minBtnX) ** 2 + (y - minBtnY) ** 2) < 10) {
            dispatch({
              type: 'SET_STRUCTURAL_GRID',
              payload: { ...structuralGrid, horizontalLines: hLines.filter(l => l.id !== line.id) }
            });
            return;
          }
        }
      }

      // Check '+' buttons at ends of grid (stacked below '-')
      // Vertical: '+' below the '-' of the last vertical grid line
      if (vLines.length > 0) {
        const lastVLine = [...vLines].sort((a, b) => a.position - b.position).pop()!;
        const sp = worldToScreen(lastVLine.position, 0);
        const topY = hPositions.length > 0
          ? worldToScreen(lastVLine.position, gridMaxY + gridPadding).y
          : 0;
        const labelY = Math.max(topY - 20, 20);
        const addBtnX = sp.x;
        const addBtnY = labelY + 40;
        if (Math.sqrt((x - addBtnX) ** 2 + (y - addBtnY) ** 2) < 10) {
          // Add new vertical grid line 500mm to the right
          const newPos = lastVLine.position + 0.5;
          const usedNames = new Set(vLines.map(l => l.name));
          let newName = '';
          for (let i = 0; i < 26; i++) {
            const n = String.fromCharCode(65 + i);
            if (!usedNames.has(n)) { newName = n; break; }
          }
          if (!newName) newName = `G${vLines.length + 1}`;
          const newLine = { id: Date.now(), name: newName, position: newPos, orientation: 'vertical' as const };
          dispatch({
            type: 'SET_STRUCTURAL_GRID',
            payload: { ...structuralGrid, verticalLines: [...vLines, newLine] }
          });
          return;
        }
      }

      // Horizontal: '+' below the '-' of the last horizontal grid line
      if (hLines.length > 0) {
        const lastHLine = [...hLines].sort((a, b) => a.position - b.position).pop()!;
        const sp = worldToScreen(0, lastHLine.position);
        const leftX = vPositions.length > 0
          ? worldToScreen(gridMinX - gridPadding, lastHLine.position).x
          : 0;
        const addBtnX = Math.max(leftX - 20, 8);
        const addBtnY = sp.y - 8 + 38;
        if (Math.sqrt((x - addBtnX) ** 2 + (y - addBtnY) ** 2) < 10) {
          // Add new horizontal grid line 500mm above
          const newPos = lastHLine.position + 0.5;
          const newName = `+${(newPos).toFixed(3)}`;
          const newLine = { id: Date.now(), name: newName, position: newPos, orientation: 'horizontal' as const };
          dispatch({
            type: 'SET_STRUCTURAL_GRID',
            payload: { ...structuralGrid, horizontalLines: [...hLines, newLine] }
          });
          return;
        }
      }

      // Check grid dimension label click (click to edit spacing)
      // Horizontal dimensions between vertical grid lines
      if (vLines.length >= 2) {
        const sorted = [...vLines].sort((a, b) => a.position - b.position);
        const gridMinY_local = hPositions.length > 0 ? Math.min(...hPositions) : 0;
        const dimY = gridMinY_local - gridPadding - 0.3;
        const dimScreenY = worldToScreen(0, dimY).y;

        for (let i = 0; i < sorted.length - 1; i++) {
          const x1 = sorted[i].position;
          const x2 = sorted[i + 1].position;
          const s1 = worldToScreen(x1, dimY);
          const s2 = worldToScreen(x2, dimY);
          const midX = (s1.x + s2.x) / 2;

          // Check if click is near the dimension label
          if (Math.abs(x - midX) < 25 && Math.abs(y - (dimScreenY + 10)) < 12) {
            const currentDist = Math.abs(x2 - x1) * 1000; // m -> mm
            const newValStr = prompt(`Edit grid spacing (mm):`, currentDist.toFixed(0));
            if (newValStr !== null) {
              const newValMm = parseFloat(newValStr);
              if (!isNaN(newValMm) && newValMm > 0) {
                const newValM = newValMm / 1000;
                // Move the right grid line so that spacing equals newValM
                const newPos = x1 + newValM;
                const delta = newPos - x2;
                // Shift this line and all lines to its right
                const updatedVLines = sorted.map((l, idx) => {
                  if (idx > i) return { ...l, position: l.position + delta };
                  return l;
                });
                dispatch({
                  type: 'SET_STRUCTURAL_GRID',
                  payload: { ...structuralGrid, verticalLines: updatedVLines }
                });
              }
            }
            return;
          }
        }
      }

      // Vertical dimensions between horizontal grid lines
      if (hLines.length >= 2) {
        const sorted = [...hLines].sort((a, b) => a.position - b.position);
        const gridMinX_local = vPositions.length > 0 ? Math.min(...vPositions) : 0;
        const dimX = gridMinX_local - gridPadding - 0.3;
        const dimScreenX = worldToScreen(dimX, 0).x;

        for (let i = 0; i < sorted.length - 1; i++) {
          const y1 = sorted[i].position;
          const y2 = sorted[i + 1].position;
          const s1 = worldToScreen(dimX, y1);
          const s2 = worldToScreen(dimX, y2);
          const midY = (s1.y + s2.y) / 2;

          // Check if click is near the dimension label
          if (Math.abs(x - (dimScreenX - 6)) < 25 && Math.abs(y - midY) < 12) {
            const currentDist = Math.abs(y2 - y1) * 1000; // m -> mm
            const newValStr = prompt(`Edit grid spacing (mm):`, currentDist.toFixed(0));
            if (newValStr !== null) {
              const newValMm = parseFloat(newValStr);
              if (!isNaN(newValMm) && newValMm > 0) {
                const newValM = newValMm / 1000;
                const newPos = y1 + newValM;
                const delta = newPos - y2;
                const updatedHLines = sorted.map((l, idx) => {
                  if (idx > i) return { ...l, position: l.position + delta };
                  return l;
                });
                dispatch({
                  type: 'SET_STRUCTURAL_GRID',
                  payload: { ...structuralGrid, horizontalLines: updatedHLines }
                });
              }
            }
            return;
          }
        }
      }
    }

    if (selectedTool === 'select') {
      // Check load resize handle interaction (for selected beams/loads with distributed loads)
      if (viewMode !== 'geometry' && (selection.elementIds.size > 0 || selection.distLoadBeamIds.size > 0)) {
        const handle = findLoadHandleAtScreen(x, y);
        if (handle) {
          const beam = mesh.getBeamElement(handle.beamId);
          if (beam?.distributedLoad) {
            pushUndo();
            setResizingLoadBeamId(handle.beamId);
            setResizingLoadEnd(handle.end);
            setResizeStartQy(beam.distributedLoad.qy);
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            return;
          }
        }
      }

      // Check beam mid-gizmo interaction (when a single beam is selected)
      if (selection.elementIds.size === 1 && selection.nodeIds.size === 0) {
        const selectedBeamId = Array.from(selection.elementIds)[0];
        const selectedBeam = mesh.getBeamElement(selectedBeamId);
        if (selectedBeam) {
          const beamNodes = mesh.getBeamElementNodes(selectedBeam);
          if (beamNodes) {
            const [bn1, bn2] = beamNodes;
            const sp1 = worldToScreen(bn1.x, bn1.y);
            const sp2 = worldToScreen(bn2.x, bn2.y);
            const midSX = (sp1.x + sp2.x) / 2;
            const midSY = (sp1.y + sp2.y) / 2;
            const dist = Math.sqrt((x - midSX) ** 2 + (y - midSY) ** 2);
            if (dist <= 12) {
              pushUndo();
              setDraggedBeamId(selectedBeamId);
              setBeamDragOrigins({ n1: { x: bn1.x, y: bn1.y }, n2: { x: bn2.x, y: bn2.y } });
              setIsDragging(true);
              setDragStart({ x: e.clientX, y: e.clientY });
              return;
            }
          }
        }
      }

      // Check gizmo interaction first (when a single node is already selected)
      if (selection.nodeIds.size === 1) {
        const selectedNodeId = Array.from(selection.nodeIds)[0];
        const selectedNode = mesh.getNode(selectedNodeId);
        if (selectedNode) {
          const nodeScreen = worldToScreen(selectedNode.x, selectedNode.y);
          const axis = getGizmoAxis(x, y, nodeScreen);
          if (axis) {
            pushUndo();
            setGizmoAxis(axis);
            setDraggedNode(selectedNodeId);
            setDragNodeOrigin({ x: selectedNode.x, y: selectedNode.y });
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            return;
          }
        }
      }

      // Check dimension label click (geometry view only)
      if (viewMode === 'geometry') {
        const dim = findDimensionAtScreen(x, y);
        if (dim) {
          setEditingDimension({
            beamId: dim.beamId,
            screenX: dim.midX,
            screenY: dim.midY,
            currentLength: dim.length
          });
          return;
        }
      }

      // Check node selection FIRST (nodes have priority over loads)
      const node = findNodeAtScreen(x, y);
      if (node) {
        if (e.shiftKey) {
          // Toggle selection
          if (selection.nodeIds.has(node.id)) {
            dispatch({ type: 'DESELECT_NODE', payload: node.id });
          } else {
            dispatch({ type: 'SELECT_NODE', payload: node.id });
          }
        } else {
          // Exclusive selection, prepare for dragging
          dispatch({ type: 'SET_SELECTION', payload: { nodeIds: new Set([node.id]), elementIds: new Set(), pointLoadNodeIds: new Set(), distLoadBeamIds: new Set() } });
          // Don't allow dragging plate mesh nodes (only corner nodes)
          const isPlateInteriorNode = Array.from(mesh.plateRegions.values()).some(
            pr => pr.nodeIds.includes(node.id) && !pr.cornerNodeIds.includes(node.id)
          );
          if (!isPlateInteriorNode) {
            setDraggedNode(node.id);
            setDragNodeOrigin({ x: node.x, y: node.y });
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
          }
        }
        return;
      }

      // Check load hit-testing (after nodes, before beams in non-geometry view)
      if (viewMode !== 'geometry') {
        const pointLoadNodeId = findPointLoadAtScreen(x, y);
        if (pointLoadNodeId !== null) {
          if (e.shiftKey) {
            if (selection.pointLoadNodeIds.has(pointLoadNodeId)) {
              dispatch({ type: 'DESELECT_POINT_LOAD', payload: pointLoadNodeId });
            } else {
              dispatch({ type: 'SELECT_POINT_LOAD', payload: pointLoadNodeId });
            }
          } else {
            dispatch({
              type: 'SET_SELECTION',
              payload: { nodeIds: new Set(), elementIds: new Set(), pointLoadNodeIds: new Set([pointLoadNodeId]), distLoadBeamIds: new Set() }
            });
          }
          return;
        }

        const distLoadBeamId = findDistLoadAtScreen(x, y);
        if (distLoadBeamId !== null) {
          if (e.shiftKey) {
            if (selection.distLoadBeamIds.has(distLoadBeamId)) {
              dispatch({ type: 'DESELECT_DIST_LOAD', payload: distLoadBeamId });
            } else {
              dispatch({ type: 'SELECT_DIST_LOAD', payload: distLoadBeamId });
            }
          } else {
            dispatch({
              type: 'SET_SELECTION',
              payload: { nodeIds: new Set(), elementIds: new Set(), pointLoadNodeIds: new Set(), distLoadBeamIds: new Set([distLoadBeamId]) }
            });
          }
          return;
        }
      }

      // Check for beam selection
      const beam = findBeamAtScreen(x, y);
      if (beam) {
        if (e.shiftKey) {
          if (selection.elementIds.has(beam.id)) {
            dispatch({ type: 'DESELECT_ELEMENT', payload: beam.id });
          } else {
            dispatch({ type: 'SELECT_ELEMENT', payload: beam.id });
          }
        } else {
          dispatch({ type: 'SET_SELECTION', payload: { nodeIds: new Set(), elementIds: new Set([beam.id]), pointLoadNodeIds: new Set(), distLoadBeamIds: new Set() } });
        }
        return;
      }

      const elementId = findElementAtScreen(x, y);
      if (elementId) {
        // Check if this element belongs to a plate - if so, select the plate
        const plate = mesh.getPlateForElement(elementId);
        if (plate) {
          if (e.shiftKey) {
            if (selection.plateIds.has(plate.id)) {
              dispatch({ type: 'DESELECT_PLATE', payload: plate.id });
            } else {
              dispatch({ type: 'SELECT_PLATE', payload: plate.id });
            }
          } else {
            const plateElementIds = new Set(plate.elementIds);
            dispatch({ type: 'SET_SELECTION', payload: { nodeIds: new Set(), elementIds: plateElementIds, pointLoadNodeIds: new Set(), distLoadBeamIds: new Set(), plateIds: new Set([plate.id]) } });
          }
          return;
        }
        if (e.shiftKey) {
          if (selection.elementIds.has(elementId)) {
            dispatch({ type: 'DESELECT_ELEMENT', payload: elementId });
          } else {
            dispatch({ type: 'SELECT_ELEMENT', payload: elementId });
          }
        } else {
          dispatch({ type: 'SET_SELECTION', payload: { nodeIds: new Set(), elementIds: new Set([elementId]), pointLoadNodeIds: new Set(), distLoadBeamIds: new Set(), plateIds: new Set() } });
        }
        return;
      }

      // Check if clicking inside a plate region boundary
      {
        const world = screenToWorld(x, y);
        for (const plate of mesh.plateRegions.values()) {
          if (world.x >= plate.x && world.x <= plate.x + plate.width &&
              world.y >= plate.y && world.y <= plate.y + plate.height) {
            if (e.shiftKey) {
              if (selection.plateIds.has(plate.id)) {
                dispatch({ type: 'DESELECT_PLATE', payload: plate.id });
              } else {
                dispatch({ type: 'SELECT_PLATE', payload: plate.id });
              }
            } else {
              const plateElementIds = new Set(plate.elementIds);
              dispatch({ type: 'SET_SELECTION', payload: { nodeIds: new Set(), elementIds: plateElementIds, pointLoadNodeIds: new Set(), distLoadBeamIds: new Set(), plateIds: new Set([plate.id]) } });
            }
            return;
          }
        }
      }

      // No node, beam, or element hit — start selection box
      setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (selectedTool === 'addNode') {
      pushUndo();
      const world = screenToWorld(x, y);
      const snapped = snapToGridFn(world.x, world.y);
      mesh.addNode(snapped.x, snapped.y);
      dispatch({ type: 'REFRESH_MESH' });
    }

    if (selectedTool === 'addElement') {
      const node = findNodeAtScreen(x, y);
      if (node) {
        if (pendingNodes.includes(node.id)) return;

        dispatch({ type: 'ADD_PENDING_NODE', payload: node.id });

        if (pendingNodes.length === 2) {
          pushUndo();
          const nodeIds = [...pendingNodes, node.id] as [number, number, number];
          mesh.addTriangleElement(nodeIds);
          dispatch({ type: 'CLEAR_PENDING_NODES' });
          dispatch({ type: 'REFRESH_MESH' });
        }
      }
    }

    if (selectedTool === 'addBeam') {
      // Find existing node or create new one at click position
      let node = findNodeAtScreen(x, y);
      if (!node) {
        pushUndo();
        const world = screenToWorld(x, y);
        let snapped = snapToGridFn(world.x, world.y, true);
        // Shift angle snapping for second node
        if (pendingNodes.length === 1 && e.shiftKey) {
          const firstNode = mesh.getNode(pendingNodes[0]);
          if (firstNode) {
            const dx = snapped.x - firstNode.x;
            const dy = snapped.y - firstNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            const snapAngle = Math.round(angle / (Math.PI / 8)) * (Math.PI / 8);
            snapped = {
              x: firstNode.x + dist * Math.cos(snapAngle),
              y: firstNode.y + dist * Math.sin(snapAngle)
            };
          }
        }
        node = mesh.addNode(snapped.x, snapped.y);
        dispatch({ type: 'REFRESH_MESH' });
      }

      if (pendingNodes.includes(node.id)) return;

      dispatch({ type: 'ADD_PENDING_NODE', payload: node.id });

      if (pendingNodes.length === 1) {
        const nodeIds = [...pendingNodes, node.id] as [number, number];

        if (lastUsedSection) {
          // Reuse last section: create beam immediately and continue chain
          pushUndo();
          mesh.addBeamElement(nodeIds, 1, lastUsedSection.section, lastUsedSection.profileName);
          dispatch({ type: 'REFRESH_MESH' });
          dispatch({ type: 'SET_RESULT', payload: null });
          // Continue chain: end node becomes start of next beam
          dispatch({ type: 'CLEAR_PENDING_NODES' });
          dispatch({ type: 'ADD_PENDING_NODE', payload: node.id });
        } else {
          // First beam: show section dialog
          setPendingBeamNodeIds(nodeIds);
          setShowSectionDialog(true);
          dispatch({ type: 'CLEAR_PENDING_NODES' });
        }
      }
    }

    if (selectedTool === 'addConstraint') {
      const node = findNodeAtScreen(x, y);
      if (node) {
        pushUndo();
        // Cycle through support types: none -> pinned -> roller -> fixed -> none
        let newConstraints;
        if (!node.constraints.x && !node.constraints.y && !node.constraints.rotation) {
          // None -> Pinned (scharnier)
          newConstraints = { x: true, y: true, rotation: false };
        } else if (node.constraints.x && node.constraints.y && !node.constraints.rotation) {
          // Pinned -> Roller (roloplegging)
          newConstraints = { x: false, y: true, rotation: false };
        } else if (!node.constraints.x && node.constraints.y && !node.constraints.rotation) {
          // Roller -> Fixed (inklemming)
          newConstraints = { x: true, y: true, rotation: true };
        } else {
          // Fixed -> None
          newConstraints = { x: false, y: false, rotation: false };
        }
        mesh.updateNode(node.id, { constraints: newConstraints });
        dispatch({ type: 'REFRESH_MESH' });
      }
    }

    if (isConstraintTool) {
      const node = findNodeAtScreen(x, y);
      if (node) {
        pushUndo();
        let newConstraints = { x: false, y: false, rotation: false };
        switch (selectedTool) {
          case 'addPinned':
            newConstraints = { x: true, y: true, rotation: false };
            break;
          case 'addXRoller':
            newConstraints = { x: true, y: false, rotation: false };
            break;
          case 'addZRoller':
            newConstraints = { x: false, y: true, rotation: false };
            break;
          case 'addFixed':
            newConstraints = { x: true, y: true, rotation: true };
            break;
          case 'addZSpring':
            newConstraints = { x: false, y: true, rotation: false };
            break;
          case 'addXSpring':
            newConstraints = { x: true, y: false, rotation: false };
            break;
          case 'addRotSpring':
            newConstraints = { x: false, y: false, rotation: true };
            break;
        }
        mesh.updateNode(node.id, { constraints: newConstraints });
        dispatch({ type: 'REFRESH_MESH' });
      }
    }

    if (selectedTool === 'addLoad') {
      const node = findNodeAtScreen(x, y);
      if (node) {
        // Open load dialog for existing node
        if (viewMode === 'geometry') {
          dispatch({ type: 'SET_VIEW_MODE', payload: 'loads' });
        }
        setEditingLoadNodeId(node.id);
        return;
      }

      // If clicking on a bar, split it and apply load at that point
      const hit = findBeamAtScreenWithPosition(x, y);
      if (hit) {
        pushUndo();
        const newNode = mesh.splitBeamAt(hit.beam.id, hit.t);
        if (newNode) {
          dispatch({ type: 'REFRESH_MESH' });
          if (viewMode === 'geometry') {
            dispatch({ type: 'SET_VIEW_MODE', payload: 'loads' });
          }
          setEditingLoadNodeId(newNode.id);
        }
      }
    }

    if (selectedTool === 'addLineLoad') {
      const beam = findBeamAtScreen(x, y);
      if (beam) {
        if (viewMode === 'geometry') {
          dispatch({ type: 'SET_VIEW_MODE', payload: 'loads' });
        }
        setLineLoadBeamId(beam.id);
      }
    }

    if (selectedTool === 'addPlate') {
      const world = screenToWorld(x, y);
      const snapped = snapToGridFn(world.x, world.y);
      if (!plateFirstCorner) {
        setPlateFirstCorner(snapped);
      } else {
        // Compute rectangle from two corners
        const x0 = Math.min(plateFirstCorner.x, snapped.x);
        const y0 = Math.min(plateFirstCorner.y, snapped.y);
        const w = Math.abs(snapped.x - plateFirstCorner.x);
        const h = Math.abs(snapped.y - plateFirstCorner.y);
        if (w > 0.001 && h > 0.001) {
          setPendingPlateRect({ x: x0, y: y0, w, h });
          setShowPlateDialog(true);
        }
        setPlateFirstCorner(null);
      }
    }

    if (selectedTool === 'addEdgeLoad') {
      const world = screenToWorld(x, y);
      // Find closest plate edge within tolerance
      const tolerance = 15 / viewState.scale;
      let closestPlateId: number | null = null;
      let closestEdge: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
      let closestDist = Infinity;

      for (const plate of mesh.plateRegions.values()) {
        // Check each edge
        const edges: Array<{ edge: 'top' | 'bottom' | 'left' | 'right'; x1: number; y1: number; x2: number; y2: number }> = [
          { edge: 'bottom', x1: plate.x, y1: plate.y, x2: plate.x + plate.width, y2: plate.y },
          { edge: 'top', x1: plate.x, y1: plate.y + plate.height, x2: plate.x + plate.width, y2: plate.y + plate.height },
          { edge: 'left', x1: plate.x, y1: plate.y, x2: plate.x, y2: plate.y + plate.height },
          { edge: 'right', x1: plate.x + plate.width, y1: plate.y, x2: plate.x + plate.width, y2: plate.y + plate.height },
        ];
        for (const e of edges) {
          const dx = e.x2 - e.x1;
          const dy = e.y2 - e.y1;
          const lenSq = dx * dx + dy * dy;
          if (lenSq === 0) continue;
          let t = ((world.x - e.x1) * dx + (world.y - e.y1) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const cx = e.x1 + t * dx;
          const cy = e.y1 + t * dy;
          const dist = Math.sqrt((world.x - cx) ** 2 + (world.y - cy) ** 2);
          if (dist < closestDist && dist < tolerance) {
            closestDist = dist;
            closestPlateId = plate.id;
            closestEdge = e.edge;
          }
        }
      }

      if (closestPlateId !== null) {
        setEdgeLoadPlateId(closestPlateId);
        setEdgeLoadEdge(closestEdge);
      }
    }

    if (selectedTool === 'addThermalLoad') {
      const world = screenToWorld(x, y);
      // Check if clicked inside a plate region
      for (const plate of mesh.plateRegions.values()) {
        if (world.x >= plate.x && world.x <= plate.x + plate.width &&
            world.y >= plate.y && world.y <= plate.y + plate.height) {
          setThermalLoadElementIds(plate.elementIds);
          setThermalLoadPlateId(plate.id);
          return;
        }
      }
      // Check if clicked on individual triangle element
      for (const element of mesh.elements.values()) {
        const nodes = mesh.getElementNodes(element);
        if (nodes.length !== 3) continue;
        // Point-in-triangle test
        const [p1, p2, p3] = nodes;
        const d1 = (world.x - p2.x) * (p1.y - p2.y) - (p1.x - p2.x) * (world.y - p2.y);
        const d2 = (world.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (world.y - p3.y);
        const d3 = (world.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (world.y - p1.y);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        if (!(hasNeg && hasPos)) {
          setThermalLoadElementIds([element.id]);
          setThermalLoadPlateId(undefined);
          return;
        }
      }
    }

    if (selectedTool === 'delete') {
      const node = findNodeAtScreen(x, y);
      if (node) {
        pushUndo();
        mesh.removeNode(node.id);
        dispatch({ type: 'REFRESH_MESH' });
        return;
      }

      const beam = findBeamAtScreen(x, y);
      if (beam) {
        pushUndo();
        mesh.removeElement(beam.id);
        dispatch({ type: 'REFRESH_MESH' });
        return;
      }

      // Check if clicking inside a plate region
      const world = screenToWorld(x, y);
      let clickedPlateId: number | null = null;
      for (const plate of mesh.plateRegions.values()) {
        if (world.x >= plate.x && world.x <= plate.x + plate.width &&
            world.y >= plate.y && world.y <= plate.y + plate.height) {
          clickedPlateId = plate.id;
          break;
        }
      }
      if (clickedPlateId !== null) {
        pushUndo();
        const plate = mesh.getPlateRegion(clickedPlateId);
        const elementIds = plate ? [...plate.elementIds] : [];
        removePlateRegion(mesh, clickedPlateId);
        dispatch({ type: 'CLEANUP_PLATE_LOADS', payload: { plateId: clickedPlateId, elementIds } });
        dispatch({ type: 'REFRESH_MESH' });
        return;
      }

      const elementId = findElementAtScreen(x, y);
      if (elementId) {
        pushUndo();
        mesh.removeElement(elementId);
        dispatch({ type: 'REFRESH_MESH' });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Track cursor position during move mode
    if (moveMode) {
      setCursorPos({ x: mx, y: my });
    }

    // Detect beam/node under cursor for all tools (pre-highlight)
    const nearNode = findNodeAtScreen(mx, my);
    const nearBeam = findBeamAtScreen(mx, my);
    setHoveredNodeId(nearNode?.id ?? null);

    // Track cursor position for constraint/beam/load tool preview
    if (isConstraintTool || selectedTool === 'addBeam') {
      if (nearNode) {
        const snapped = worldToScreen(nearNode.x, nearNode.y);
        setCursorPos({ x: snapped.x, y: snapped.y });
        setSnapNodeId(nearNode.id);
      } else if (selectedTool === 'addBeam' && pendingNodes.length === 1 && e.shiftKey) {
        // Shift angle snapping: snap to nearest 22.5° increment
        const firstNode = mesh.getNode(pendingNodes[0]);
        if (firstNode) {
          const firstScreen = worldToScreen(firstNode.x, firstNode.y);
          const dx = mx - firstScreen.x;
          const dy = my - firstScreen.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const snapAngle = Math.round(angle / (Math.PI / 8)) * (Math.PI / 8);
          setCursorPos({
            x: firstScreen.x + dist * Math.cos(snapAngle),
            y: firstScreen.y + dist * Math.sin(snapAngle)
          });
          setSnapNodeId(null);
        } else {
          setCursorPos({ x: mx, y: my });
          setSnapNodeId(null);
        }
      } else {
        // Snap cursor preview to grid for addBeam
        const world = screenToWorld(mx, my);
        const useBarSnap = selectedTool === 'addBeam';
        const snapped = snapToGridFn(world.x, world.y, useBarSnap);
        const screenSnapped = worldToScreen(snapped.x, snapped.y);
        setCursorPos({ x: screenSnapped.x, y: screenSnapped.y });
        setSnapNodeId(null);
      }
      setHoveredBeamId(nearBeam?.id ?? null);
    } else if (selectedTool === 'addNode' || selectedTool === 'addLoad' || selectedTool === 'addLineLoad') {
      // Snap cursor preview to grid for addNode/addLoad tools
      const world = screenToWorld(mx, my);
      const snapped = snapToGridFn(world.x, world.y);
      const screenSnapped = worldToScreen(snapped.x, snapped.y);
      setCursorPos({ x: screenSnapped.x, y: screenSnapped.y });
      setHoveredBeamId(nearBeam?.id ?? null);
      setSnapNodeId(null);
    } else {
      if (snapNodeId !== null) setSnapNodeId(null);
      if (cursorPos !== null) setCursorPos(null);
      setHoveredBeamId(nearBeam?.id ?? null);
    }

    // Gizmo hover detection (only when not dragging)
    if (!isDragging && selection.nodeIds.size === 1 && selectedTool === 'select') {
      const selectedNodeId = Array.from(selection.nodeIds)[0];
      const selectedNode = mesh.getNode(selectedNodeId);
      if (selectedNode) {
        const nodeScreen = worldToScreen(selectedNode.x, selectedNode.y);
        setGizmoAxis(getGizmoAxis(mx, my, nodeScreen));
      }
    }

    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    // Handle selection box dragging
    if (selectionBox) {
      setSelectionBox({ ...selectionBox, endX: mx, endY: my });
      return;
    }

    // Handle load resize dragging
    if (resizingLoadBeamId !== null) {
      const beam = mesh.getBeamElement(resizingLoadBeamId);
      if (beam && beam.distributedLoad) {
        const nodes = mesh.getBeamElementNodes(beam);
        if (nodes) {
          const [n1, n2] = nodes;
          const p1 = worldToScreen(n1.x, n1.y);
          const p2 = worldToScreen(n2.x, n2.y);
          const beamScreenLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

          if (resizingLoadEnd && beamScreenLen > 0) {
            // Dragging start or end handle along beam axis → change startT/endT
            const beamDirX = (p2.x - p1.x) / beamScreenLen;
            const beamDirY = (p2.y - p1.y) / beamScreenLen;

            // Project mouse position onto beam axis
            const mouseScreenX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
            const mouseScreenY = e.clientY - canvasRef.current!.getBoundingClientRect().top;
            const relX = mouseScreenX - p1.x;
            const relY = mouseScreenY - p1.y;
            const proj = (relX * beamDirX + relY * beamDirY) / beamScreenLen;
            const t = Math.max(0, Math.min(1, proj));

            const currentStartT = beam.distributedLoad.startT ?? 0;
            const currentEndT = beam.distributedLoad.endT ?? 1;

            if (resizingLoadEnd === 'start') {
              const newStartT = Math.min(t, currentEndT - 0.01);
              beam.distributedLoad = { ...beam.distributedLoad, startT: Math.max(0, newStartT) };
            } else {
              const newEndT = Math.max(t, currentStartT + 0.01);
              beam.distributedLoad = { ...beam.distributedLoad, endT: Math.min(1, newEndT) };
            }
            dispatch({ type: 'REFRESH_MESH' });
          } else {
            // Fallback: magnitude resize (perpendicular drag)
            const angle = calculateBeamAngle(n1, n2);
            const perpAngle = angle + Math.PI / 2;
            const perpDist = dx * Math.cos(perpAngle) + dy * Math.sin(perpAngle);
            const sign = resizeStartQy >= 0 ? 1 : -1;
            const newQy = resizeStartQy + sign * perpDist * 100;
            beam.distributedLoad = { ...beam.distributedLoad, qy: newQy };
            dispatch({ type: 'REFRESH_MESH' });
          }
        }
      }
      return;
    }

    // Handle grid line dragging
    if (draggedGridLineId !== null && draggedGridLineType) {
      const world = screenToWorld(mx, my);
      const snapped = snapToGridFn(world.x, world.y);
      if (draggedGridLineType === 'vertical') {
        const updated = structuralGrid.verticalLines.map(l =>
          l.id === draggedGridLineId ? { ...l, position: snapped.x } : l
        );
        dispatch({ type: 'SET_STRUCTURAL_GRID', payload: { ...structuralGrid, verticalLines: updated } });
      } else {
        const updated = structuralGrid.horizontalLines.map(l =>
          l.id === draggedGridLineId ? { ...l, position: snapped.y } : l
        );
        dispatch({ type: 'SET_STRUCTURAL_GRID', payload: { ...structuralGrid, horizontalLines: updated } });
      }
      return;
    }

    // Handle beam mid-gizmo dragging
    if (draggedBeamId !== null && beamDragOrigins) {
      const beam = mesh.getBeamElement(draggedBeamId);
      if (beam) {
        const beamNodes = mesh.getBeamElementNodes(beam);
        if (beamNodes) {
          // Convert total drag delta from screen to world
          const totalDx = (e.clientX - dragStart.x) / viewState.scale;
          const totalDy = -(e.clientY - dragStart.y) / viewState.scale;

          const newN1X = beamDragOrigins.n1.x + totalDx;
          const newN1Y = beamDragOrigins.n1.y + totalDy;
          const newN2X = beamDragOrigins.n2.x + totalDx;
          const newN2Y = beamDragOrigins.n2.y + totalDy;

          // Snap midpoint to grid, then apply same offset to both nodes
          const midX = (newN1X + newN2X) / 2;
          const midY = (newN1Y + newN2Y) / 2;
          const snapped = snapToGridFn(midX, midY);
          const snapDx = snapped.x - midX;
          const snapDy = snapped.y - midY;

          mesh.updateNode(beamNodes[0].id, { x: newN1X + snapDx, y: newN1Y + snapDy });
          mesh.updateNode(beamNodes[1].id, { x: newN2X + snapDx, y: newN2Y + snapDy });
          dispatch({ type: 'REFRESH_MESH' });
        }
      }
      return;
    }

    if (draggedNode !== null) {
      const node = mesh.getNode(draggedNode);
      if (node) {
        const world = screenToWorld(mx, my);
        const snapped = snapToGridFn(world.x, world.y);

        let newX = snapped.x;
        let newY = snapped.y;

        // Apply axis constraint from gizmo
        if (gizmoAxis === 'x' && dragNodeOrigin) {
          newY = dragNodeOrigin.y;
        } else if (gizmoAxis === 'y' && dragNodeOrigin) {
          newX = dragNodeOrigin.x;
        }

        mesh.updateNode(draggedNode, { x: newX, y: newY });
        dispatch({ type: 'REFRESH_MESH' });
      }
    } else {
      dispatch({
        type: 'SET_VIEW_STATE',
        payload: {
          offsetX: viewState.offsetX + dx,
          offsetY: viewState.offsetY + dy
        }
      });
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    // Finalize selection box
    if (selectionBox) {
      const { startX, startY, endX, endY } = selectionBox;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);

      // Only select if the box has meaningful size (> 3px drag)
      if (maxX - minX > 3 || maxY - minY > 3) {
        const selectedNodes = new Set<number>();
        const selectedElements = new Set<number>();
        const selectedPointLoadNodes = new Set<number>();
        const selectedDistLoadBeams = new Set<number>();

        // Detect crossing (left-drag) vs window (right-drag)
        const isCrossing = selectionBox.endX < selectionBox.startX;

        // Select nodes within box
        for (const node of mesh.nodes.values()) {
          const s = worldToScreen(node.x, node.y);
          if (s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY) {
            selectedNodes.add(node.id);
            // Also select point loads on these nodes (in non-geometry view)
            if (viewMode !== 'geometry' && (node.loads.fx !== 0 || node.loads.fy !== 0 || node.loads.moment !== 0)) {
              selectedPointLoadNodes.add(node.id);
            }
          }
        }

        // Select beams
        for (const beam of mesh.beamElements.values()) {
          const nodes = mesh.getBeamElementNodes(beam);
          if (!nodes) continue;
          const [n1, n2] = nodes;
          const s1 = worldToScreen(n1.x, n1.y);
          const s2 = worldToScreen(n2.x, n2.y);

          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2;

          // Also check load arrow symbolic area
          let loadTopInBox = false;
          if (viewMode !== 'geometry' && beam.distributedLoad && beam.distributedLoad.qy !== 0) {
            const angle = calculateBeamAngle(n1, n2);
            const perpAngle = (beam.distributedLoad.coordSystem === 'global') ? Math.PI / 2 : angle + Math.PI / 2;
            const arrowLen = Math.min(40, Math.abs(beam.distributedLoad.qy) / 500 * 40 + 20);
            const sign = beam.distributedLoad.qy > 0 ? 1 : -1;
            const topMidX = midX + Math.cos(perpAngle) * arrowLen * sign;
            const topMidY = midY + Math.sin(perpAngle) * arrowLen * sign;
            loadTopInBox = topMidX >= minX && topMidX <= maxX && topMidY >= minY && topMidY <= maxY;
          }

          if (isCrossing) {
            // Crossing: select beams that intersect or are contained in the box
            const midInside = midX >= minX && midX <= maxX && midY >= minY && midY <= maxY;
            const crosses = lineIntersectsRect(s1.x, s1.y, s2.x, s2.y, minX, minY, maxX, maxY);
            if (midInside || crosses || loadTopInBox) {
              selectedElements.add(beam.id);
              if (viewMode !== 'geometry' && beam.distributedLoad && beam.distributedLoad.qy !== 0) {
                selectedDistLoadBeams.add(beam.id);
              }
            }
          } else {
            // Window: select beams whose midpoint is fully inside box
            if ((midX >= minX && midX <= maxX && midY >= minY && midY <= maxY) || loadTopInBox) {
              selectedElements.add(beam.id);
              if (viewMode !== 'geometry' && beam.distributedLoad && beam.distributedLoad.qy !== 0) {
                selectedDistLoadBeams.add(beam.id);
              }
            }
          }
        }

        dispatch({
          type: 'SET_SELECTION',
          payload: {
            nodeIds: selectedNodes,
            elementIds: selectedElements,
            pointLoadNodeIds: selectedPointLoadNodes,
            distLoadBeamIds: selectedDistLoadBeams
          }
        });
      } else {
        // Tiny box = click on empty space → clear
        dispatch({ type: 'CLEAR_SELECTION' });
      }

      setSelectionBox(null);
      setIsDragging(false);
      setDraggedNode(null);
      setDragNodeOrigin(null);
      return;
    }

    // Finalize load resize
    if (resizingLoadBeamId !== null) {
      const beam = mesh.getBeamElement(resizingLoadBeamId);
      if (beam?.distributedLoad) {
        const finalQy = beam.distributedLoad.qy;
        // Dispatch to active load case
        dispatch({
          type: 'ADD_DISTRIBUTED_LOAD',
          payload: {
            lcId: state.activeLoadCase,
            beamId: resizingLoadBeamId,
            qx: beam.distributedLoad.qx,
            qy: finalQy,
            qxEnd: beam.distributedLoad.qxEnd,
            qyEnd: beam.distributedLoad.qyEnd,
            startT: beam.distributedLoad.startT,
            endT: beam.distributedLoad.endT,
            coordSystem: beam.distributedLoad.coordSystem
          }
        });
      }
      setResizingLoadBeamId(null);
      setResizeStartQy(0);
      setResizingLoadEnd(null);
    }
    setIsDragging(false);
    setDraggedNode(null);
    setDragNodeOrigin(null);
    setDraggedBeamId(null);
    setBeamDragOrigins(null);
    setDraggedGridLineId(null);
    setDraggedGridLineType(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Double-click on distributed load -> open LineLoadDialog (check before node/beam)
    if (viewMode !== 'geometry') {
      const distLoadBeamId = findDistLoadAtScreen(x, y);
      if (distLoadBeamId !== null) {
        dispatch({
          type: 'SET_SELECTION',
          payload: { nodeIds: new Set(), elementIds: new Set(), pointLoadNodeIds: new Set(), distLoadBeamIds: new Set([distLoadBeamId]) }
        });
        setLineLoadBeamId(distLoadBeamId);
        return;
      }
    }

    // Double-click on a node -> open node properties dialog
    const node = findNodeAtScreen(x, y);
    if (node) {
      setEditingNodeId(node.id);
      return;
    }

    // Double-click on a bar -> check if near UC badge first, then open bar properties
    const beam = findBeamAtScreen(x, y);
    if (beam) {
      // Check if click is near the UC badge (75% along beam)
      if (viewMode === 'results' && result && beam.section) {
        const nodes = mesh.getBeamElementNodes(beam);
        if (nodes) {
          const [n1, n2] = nodes;
          const p1 = worldToScreen(n1.x, n1.y);
          const p2 = worldToScreen(n2.x, n2.y);
          const t = 0.75;
          const bx = p1.x + (p2.x - p1.x) * t;
          const by = p1.y + (p2.y - p1.y) * t;
          const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
          if (dist < 20) {
            // Open code-check tab
            dispatch({ type: 'SET_CODE_CHECK_BEAM', payload: beam.id });
            return;
          }
        }
      }
      setEditingBarId(beam.id);
      return;
    }

    // Double-click on a plate region -> show plate info (future: plate properties dialog)
    const world = screenToWorld(x, y);
    for (const plate of mesh.plateRegions.values()) {
      if (world.x >= plate.x && world.x <= plate.x + plate.width &&
          world.y >= plate.y && world.y <= plate.y + plate.height) {
        // Select the plate
        dispatch({
          type: 'SET_SELECTION',
          payload: { nodeIds: new Set(), elementIds: new Set(), pointLoadNodeIds: new Set(), distLoadBeamIds: new Set(), plateIds: new Set([plate.id]) }
        });
        return;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setEditingDimension(null);
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(10, Math.min(500, viewState.scale * zoomFactor));

    // Zoom towards mouse position
    const worldBeforeX = (mouseX - viewState.offsetX) / viewState.scale;
    const worldBeforeY = (mouseY - viewState.offsetY) / viewState.scale;

    const newOffsetX = mouseX - worldBeforeX * newScale;
    const newOffsetY = mouseY - worldBeforeY * newScale;

    dispatch({
      type: 'SET_VIEW_STATE',
      payload: { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY }
    });
  };

  return (
    <div className="mesh-editor" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setCursorPos(null); setGizmoAxis(null); }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={e => {
          e.preventDefault();
          // Right-click cancels active tool / mode (like Escape)
          if (moveMode) {
            setMoveMode(false);
          } else if (pendingCommand) {
            setPendingCommand(null);
          } else if (editingDimension) {
            setEditingDimension(null);
          } else if (selectedTool !== 'select') {
            dispatch({ type: 'SET_TOOL', payload: 'select' });
          }
        }}
        style={{
          cursor: moveMode ? 'move'
            : isConstraintTool ? 'none'
            : (selectedTool === 'addLoad' || selectedTool === 'addLineLoad' || selectedTool === 'addPlate' || selectedTool === 'addEdgeLoad' || selectedTool === 'addThermalLoad') ? 'crosshair'
            : gizmoAxis === 'x' ? 'ew-resize'
            : gizmoAxis === 'y' ? 'ns-resize'
            : gizmoAxis === 'free' ? 'grab'
            : (isDragging && draggedNode !== null) ? 'grabbing'
            : 'default'
        }}
      />
      {moveMode && (
        <div className="command-indicator">
          Click to place, Escape to cancel
        </div>
      )}
      {beamLengthInput !== null && selectedTool === 'addBeam' && pendingNodes.length === 1 && (
        <div className="beam-length-input-overlay">
          <label>Length (mm):</label>
          <input
            className="dimension-input"
            type="text"
            autoFocus
            defaultValue={beamLengthInput}
            onFocus={(e) => {
              // Place cursor at end
              const len = e.target.value.length;
              e.target.setSelectionRange(len, len);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const valMm = parseFloat(e.currentTarget.value);
                if (!isNaN(valMm) && valMm > 0) {
                  const firstNode = mesh.getNode(pendingNodes[0]);
                  if (firstNode && cursorPos) {
                    const cursorWorld = screenToWorld(cursorPos.x, cursorPos.y);
                    const dx = cursorWorld.x - firstNode.x;
                    const dy = cursorWorld.y - firstNode.y;
                    const currentDist = Math.sqrt(dx * dx + dy * dy);
                    const angle = currentDist > 0.001
                      ? Math.atan2(dy, dx)
                      : 0; // Default to horizontal if cursor is on the node
                    const targetDist = valMm / 1000;
                    const newX = firstNode.x + targetDist * Math.cos(angle);
                    const newY = firstNode.y + targetDist * Math.sin(angle);
                    pushUndo();
                    const newNode = mesh.addNode(newX, newY);
                    const nodeIds: [number, number] = [pendingNodes[0], newNode.id];
                    if (lastUsedSection) {
                      mesh.addBeamElement(nodeIds, 1, lastUsedSection.section, lastUsedSection.profileName);
                      dispatch({ type: 'REFRESH_MESH' });
                      dispatch({ type: 'SET_RESULT', payload: null });
                      dispatch({ type: 'CLEAR_PENDING_NODES' });
                      dispatch({ type: 'ADD_PENDING_NODE', payload: newNode.id });
                    } else {
                      setPendingBeamNodeIds(nodeIds);
                      setShowSectionDialog(true);
                      dispatch({ type: 'CLEAR_PENDING_NODES' });
                    }
                  }
                }
                setBeamLengthInput(null);
              }
              if (e.key === 'Escape') {
                setBeamLengthInput(null);
              }
            }}
            onBlur={() => setBeamLengthInput(null)}
          />
        </div>
      )}
      {editingDimension && (
        <input
          className="dimension-input"
          type="text"
          autoFocus
          defaultValue={(editingDimension.currentLength * 1000).toFixed(0)}
          style={{
            position: 'absolute',
            left: editingDimension.screenX - 38,
            top: editingDimension.screenY - 13,
          }}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const valMm = parseFloat(e.currentTarget.value);
              if (!isNaN(valMm) && valMm > 0) {
                pushUndo();
                applyNewDimension(editingDimension.beamId, valMm / 1000);
              }
              setEditingDimension(null);
            }
            if (e.key === 'Escape') {
              setEditingDimension(null);
            }
          }}
          onBlur={() => setEditingDimension(null)}
        />
      )}
      {showSectionDialog && pendingBeamNodeIds && (
        <SectionDialog
          onSelect={(section: IBeamSection, profileName: string) => {
            pushUndo();
            mesh.addBeamElement(pendingBeamNodeIds, 1, section, profileName);
            dispatch({ type: 'REFRESH_MESH' });
            dispatch({ type: 'SET_RESULT', payload: null });
            // Remember section for continuous beam drawing
            setLastUsedSection({ section, profileName });
            // Continue chain: end node becomes start of next beam
            const endNodeId = pendingBeamNodeIds[1];
            dispatch({ type: 'ADD_PENDING_NODE', payload: endNodeId });
            setShowSectionDialog(false);
            setPendingBeamNodeIds(null);
          }}
          onCancel={() => {
            setShowSectionDialog(false);
            setPendingBeamNodeIds(null);
          }}
        />
      )}
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
      {editingLoadNodeId !== null && (() => {
        const node = mesh.getNode(editingLoadNodeId);
        if (!node) return null;
        // Find existing load in active LC
        const activeLc = state.loadCases.find(lc => lc.id === state.activeLoadCase);
        const existingPl = activeLc?.pointLoads.find(pl => pl.nodeId === editingLoadNodeId);
        return (
          <LoadDialog
            initialFx={existingPl?.fx ?? 0}
            initialFy={existingPl?.fy ?? 0}
            initialMoment={existingPl?.mz ?? 0}
            loadCases={state.loadCases}
            activeLoadCase={state.activeLoadCase}
            onApply={(fx, fy, moment, lcId) => {
              pushUndo();
              dispatch({
                type: 'ADD_POINT_LOAD',
                payload: { lcId, nodeId: editingLoadNodeId, fx, fy, mz: moment }
              });
              // Also apply to mesh for rendering
              mesh.updateNode(editingLoadNodeId, { loads: { fx, fy, moment } });
              dispatch({ type: 'REFRESH_MESH' });
              dispatch({ type: 'SET_RESULT', payload: null });
              dispatch({ type: 'SET_VIEW_MODE', payload: 'loads' });
              setEditingLoadNodeId(null);
            }}
            onCancel={() => setEditingLoadNodeId(null)}
          />
        );
      })()}
      {editingBarId !== null && (() => {
        const beam = mesh.getBeamElement(editingBarId);
        if (!beam) return null;
        const nodes = mesh.getBeamElementNodes(beam);
        if (!nodes) return null;
        const length = calculateBeamLength(nodes[0], nodes[1]);
        return (
          <BarPropertiesDialog
            beam={beam}
            length={length}
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
      {lineLoadBeamId !== null && (() => {
        const beam = mesh.getBeamElement(lineLoadBeamId);
        if (!beam) return null;
        const activeLc = state.loadCases.find(lc => lc.id === state.activeLoadCase);
        const existingDl = activeLc?.distributedLoads.find(dl => dl.elementId === lineLoadBeamId);
        const beamNodes = mesh.getBeamElementNodes(beam);
        const beamLen = beamNodes ? calculateBeamLength(beamNodes[0], beamNodes[1]) : undefined;
        return (
          <LineLoadDialog
            initialQx={existingDl?.qx ?? 0}
            initialQy={existingDl?.qy ?? 0}
            initialQxEnd={existingDl?.qxEnd}
            initialQyEnd={existingDl?.qyEnd}
            initialStartT={beam.distributedLoad?.startT}
            initialEndT={beam.distributedLoad?.endT}
            initialCoordSystem={beam.distributedLoad?.coordSystem}
            beamLength={beamLen}
            loadCases={state.loadCases}
            activeLoadCase={state.activeLoadCase}
            onApply={(qx, qy, lcId, startT, endT, coordSystem, qxEnd, qyEnd) => {
              pushUndo();
              dispatch({
                type: 'ADD_DISTRIBUTED_LOAD',
                payload: { lcId, beamId: lineLoadBeamId, qx, qy, qxEnd, qyEnd, startT, endT, coordSystem }
              });
              // Also apply to mesh for rendering (with partial load and coord system)
              mesh.updateBeamElement(lineLoadBeamId, {
                distributedLoad: { qx, qy, qxEnd, qyEnd, startT, endT, coordSystem }
              });
              dispatch({ type: 'REFRESH_MESH' });
              dispatch({ type: 'SET_RESULT', payload: null });
              dispatch({ type: 'SET_VIEW_MODE', payload: 'loads' });
              setLineLoadBeamId(null);
            }}
            onCancel={() => setLineLoadBeamId(null)}
          />
        );
      })()}
      {showPlateDialog && pendingPlateRect && (
        <PlateDialog
          rectWidth={pendingPlateRect.w}
          rectHeight={pendingPlateRect.h}
          materials={Array.from(mesh.materials.values()).map(m => ({ id: m.id, name: m.name }))}
          onConfirm={(config) => {
            pushUndo();
            const plate = generatePlateRegionMesh(mesh, {
              x: pendingPlateRect.x,
              y: pendingPlateRect.y,
              width: pendingPlateRect.w,
              height: pendingPlateRect.h,
              ...config
            });
            mesh.addPlateRegion(plate);
            dispatch({ type: 'REFRESH_MESH' });
            dispatch({ type: 'SET_RESULT', payload: null });
            // Switch to plane_stress if currently in frame mode
            if (state.analysisType === 'frame') {
              dispatch({ type: 'SET_ANALYSIS_TYPE', payload: 'plane_stress' });
            }
            setShowPlateDialog(false);
            setPendingPlateRect(null);
          }}
          onCancel={() => {
            setShowPlateDialog(false);
            setPendingPlateRect(null);
          }}
        />
      )}
      {edgeLoadPlateId !== null && (
        <EdgeLoadDialog
          edge={edgeLoadEdge}
          loadCases={state.loadCases}
          activeLoadCase={state.activeLoadCase}
          onApply={(px, py, lcId, edge) => {
            pushUndo();
            dispatch({
              type: 'ADD_EDGE_LOAD',
              payload: { lcId, plateId: edgeLoadPlateId, edge, px: px * 1000, py: py * 1000 } // kN/m to N/m
            });
            // Re-apply load case to mesh for rendering
            const activeLc = state.loadCases.find(lc => lc.id === lcId);
            if (activeLc) {
              applyLoadCaseToMesh(mesh, { ...activeLc, edgeLoads: [...(activeLc.edgeLoads || []), { plateId: edgeLoadPlateId, edge, px: px * 1000, py: py * 1000 }] });
            }
            dispatch({ type: 'REFRESH_MESH' });
            dispatch({ type: 'SET_RESULT', payload: null });
            dispatch({ type: 'SET_VIEW_MODE', payload: 'loads' });
            setEdgeLoadPlateId(null);
          }}
          onCancel={() => setEdgeLoadPlateId(null)}
        />
      )}
      {thermalLoadElementIds.length > 0 && (
        <ThermalLoadDialog
          elementIds={thermalLoadElementIds}
          plateId={thermalLoadPlateId}
          onConfirm={(deltaT) => {
            pushUndo();
            for (const elemId of thermalLoadElementIds) {
              dispatch({
                type: 'ADD_THERMAL_LOAD',
                payload: { lcId: activeLoadCase, elementId: elemId, plateId: thermalLoadPlateId, deltaT }
              });
            }
            dispatch({ type: 'REFRESH_MESH' });
            dispatch({ type: 'SET_RESULT', payload: null });
            setThermalLoadElementIds([]);
            setThermalLoadPlateId(undefined);
          }}
          onCancel={() => {
            setThermalLoadElementIds([]);
            setThermalLoadPlateId(undefined);
          }}
        />
      )}
    </div>
  );
}

function pointInTriangle(p: { x: number; y: number }, v1: INode, v2: INode, v3: INode): boolean {
  const sign = (p1: { x: number; y: number }, p2: INode, p3: INode) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);

  const d1 = sign(p, v1, v2);
  const d2 = sign(p, v2, v3);
  const d3 = sign(p, v3, v1);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function lineIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  minX: number, minY: number, maxX: number, maxY: number
): boolean {
  // Check if either endpoint is inside the rect
  if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
  if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;

  // Check intersection with each rect edge
  return (
    segmentsIntersect(x1, y1, x2, y2, minX, minY, maxX, minY) || // top
    segmentsIntersect(x1, y1, x2, y2, maxX, minY, maxX, maxY) || // right
    segmentsIntersect(x1, y1, x2, y2, minX, maxY, maxX, maxY) || // bottom
    segmentsIntersect(x1, y1, x2, y2, minX, minY, minX, maxY)    // left
  );
}

function pointToLineDistance(p: { x: number; y: number }, a: INode, b: INode): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = a.x + t * dx;
  const closestY = a.y + t * dy;

  return Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);
}
