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

  // Beam mid-gizmo dragging
  const [draggedBeamId, setDraggedBeamId] = useState<number | null>(null);
  const [beamDragOrigins, setBeamDragOrigins] = useState<{ n1: { x: number; y: number }; n2: { x: number; y: number } } | null>(null);

  // Selection box (rubber band)
  const [selectionBox, setSelectionBox] = useState<{
    startX: number; startY: number; endX: number; endY: number;
  } | null>(null);

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

  const snapToGridFn = useCallback((x: number, y: number) => {
    let snappedX = x;
    let snappedY = y;

    if (snapToGrid) {
      snappedX = Math.round(x / gridSize) * gridSize;
      snappedY = Math.round(y / gridSize) * gridSize;
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

      const angle = calculateBeamAngle(n1, n2);
      const perpAngle = angle + Math.PI / 2;
      const arrowLength = Math.min(40, Math.abs(qy) / 500 * 40 + 20);

      const startTop = {
        x: p1.x + Math.cos(perpAngle) * arrowLength * (qy > 0 ? 1 : -1),
        y: p1.y + Math.sin(perpAngle) * arrowLength * (qy > 0 ? 1 : -1)
      };
      const endTop = {
        x: p2.x + Math.cos(perpAngle) * arrowLength * (qy > 0 ? 1 : -1),
        y: p2.y + Math.sin(perpAngle) * arrowLength * (qy > 0 ? 1 : -1)
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

      const angle = calculateBeamAngle(n1, n2);
      const perpAngle = angle + Math.PI / 2;
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
    const map = new Map<number, number>();
    let index = 0;
    for (const node of mesh.nodes.values()) {
      map.set(node.id, index);
      index++;
    }
    return map;
  }, [mesh]);

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
      // Roloplegging (roller) - triangle with circles and hatch
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y);
      ctx.lineTo(screen.x - 12, screen.y + 18);
      ctx.lineTo(screen.x + 12, screen.y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Rollers (larger circles with gap)
      ctx.beginPath();
      ctx.arc(screen.x - 6, screen.y + 24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(screen.x + 6, screen.y + 24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Ground line
      ctx.beginPath();
      ctx.moveTo(screen.x - 16, screen.y + 31);
      ctx.lineTo(screen.x + 16, screen.y + 31);
      ctx.stroke();
      // Hatch marks below ground line
      for (let i = -14; i <= 14; i += 6) {
        ctx.beginPath();
        ctx.moveTo(screen.x + i, screen.y + 31);
        ctx.lineTo(screen.x + i - 6, screen.y + 39);
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
    if (qx === 0 && qy === 0) return;

    const coordSystem = beam.distributedLoad.coordSystem ?? 'local';
    const startT = beam.distributedLoad.startT ?? 0;
    const endT = beam.distributedLoad.endT ?? 1;

    const p1 = worldToScreen(n1.x, n1.y);
    const p2 = worldToScreen(n2.x, n2.y);

    const angle = calculateBeamAngle(n1, n2);
    const isGlobal = coordSystem === 'global';

    // For global loads, arrows point straight down (screen y direction)
    // For local loads, arrows are perpendicular to beam
    const perpAngle = isGlobal ? Math.PI / 2 : angle + Math.PI / 2;

    // Compute start and end points on beam for partial loads
    const loadP1 = {
      x: p1.x + (p2.x - p1.x) * startT,
      y: p1.y + (p2.y - p1.y) * startT
    };
    const loadP2 = {
      x: p1.x + (p2.x - p1.x) * endT,
      y: p1.y + (p2.y - p1.y) * endT
    };

    // Draw arrows along load span
    const numArrows = Math.max(2, Math.round(8 * (endT - startT)));
    const arrowLength = Math.min(40, Math.abs(qy) / 500 * 40 + 20);

    const loadColor = isSelected ? '#ef4444' : '#3b82f6';
    ctx.strokeStyle = loadColor;
    ctx.fillStyle = loadColor;
    ctx.lineWidth = 2;

    for (let i = 0; i <= numArrows; i++) {
      const t = i / numArrows;
      const px = loadP1.x + (loadP2.x - loadP1.x) * t;
      const py = loadP1.y + (loadP2.y - loadP1.y) * t;

      // Arrow start (top)
      const startX = px + Math.cos(perpAngle) * arrowLength * (qy > 0 ? 1 : -1);
      const startY = py + Math.sin(perpAngle) * arrowLength * (qy > 0 ? 1 : -1);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Arrow head
      const arrowDir = Math.atan2(py - startY, px - startX);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 8 * Math.cos(arrowDir - 0.4), py - 8 * Math.sin(arrowDir - 0.4));
      ctx.lineTo(px - 8 * Math.cos(arrowDir + 0.4), py - 8 * Math.sin(arrowDir + 0.4));
      ctx.closePath();
      ctx.fill();
    }

    // Connect tops of arrows
    ctx.beginPath();
    const startTop = {
      x: loadP1.x + Math.cos(perpAngle) * arrowLength * (qy > 0 ? 1 : -1),
      y: loadP1.y + Math.sin(perpAngle) * arrowLength * (qy > 0 ? 1 : -1)
    };
    const endTop = {
      x: loadP2.x + Math.cos(perpAngle) * arrowLength * (qy > 0 ? 1 : -1),
      y: loadP2.y + Math.sin(perpAngle) * arrowLength * (qy > 0 ? 1 : -1)
    };
    ctx.moveTo(startTop.x, startTop.y);
    ctx.lineTo(endTop.x, endTop.y);
    ctx.stroke();

    // Load value label
    ctx.font = 'bold 11px sans-serif';
    const midX = (startTop.x + endTop.x) / 2;
    const midY = (startTop.y + endTop.y) / 2 - 10;
    const qLabel = isGlobal ? 'q(G)' : 'q';
    const qText = `${qLabel} = ${(Math.abs(qy) / 1000).toFixed(1)} kN/m`;
    ctx.fillText(qText, midX - 30, midY);

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
    diagramType: 'normal' | 'shear' | 'moment'
  ) => {
    if (!result) return;

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

      // Draw outline
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      for (const pt of points) {
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

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

      // Collision avoidance: track placed label bounding boxes
      const placedLabels: { x: number; y: number; w: number; h: number }[] = [];
      const tryPlaceLabel = (text: string, lx: number, ly: number, bgColor?: string): void => {
        const w = ctx.measureText(text).width + 4;
        const h = 14;
        let finalY = ly;

        // Check overlap with existing labels
        for (const placed of placedLabels) {
          if (Math.abs(lx - placed.x) < (w + placed.w) / 2 &&
              Math.abs(finalY - placed.y) < (h + placed.h) / 2) {
            finalY = placed.y - placed.h; // shift above the conflicting label
          }
        }

        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(lx - 2, finalY - 12, w, h);
          ctx.fillStyle = color;
        }
        ctx.fillText(text, lx, finalY);
        placedLabels.push({ x: lx + w / 2, y: finalY, w, h });
      };

      // Start value
      const startVal = values[0];
      if (Math.abs(startVal) > maxVal * 0.01) {
        const label = diagramType === 'moment' ? formatMoment(startVal) : formatForce(startVal);
        tryPlaceLabel(label, p1.x - 40, p1.y - 10);
      }

      // End value
      const endVal = values[values.length - 1];
      if (Math.abs(endVal) > maxVal * 0.01) {
        const label = diagramType === 'moment' ? formatMoment(endVal) : formatForce(endVal);
        tryPlaceLabel(label, p2.x + 5, p2.y - 10);
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
        const offset = diagramValue * scale;

        const label = diagramType === 'moment' ? formatMoment(values[maxIdx]) : formatForce(values[maxIdx]);
        tryPlaceLabel(label, labelX - 22, labelY + Math.sin(perpAngle) * offset - 8, '#fff');
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
      ctx.setLineDash([8, 4]);
      ctx.lineWidth = 1.5;

      // Vertical grid lines (stramienen)
      for (const line of structuralGrid.verticalLines) {
        const screenPos = worldToScreen(line.position, 0);
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(screenPos.x, 0);
        ctx.lineTo(screenPos.x, height);
        ctx.stroke();

        // Circle label at top
        const labelY = 40;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(screenPos.x, labelY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.name, screenPos.x, labelY);
      }

      // Horizontal grid lines (levels)
      for (const line of structuralGrid.horizontalLines) {
        const screenPos = worldToScreen(0, line.position);
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, screenPos.y);
        ctx.lineTo(width, screenPos.y);
        ctx.stroke();

        // Label at left
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.name, 8, screenPos.y - 8);
      }

      ctx.setLineDash([]);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    const nodeIdToIndex = result ? getNodeIdToIndex() : null;
    const dofsPerNode = analysisType === 'frame' ? 3 : 2;

    // Draw triangle elements (for plane stress/strain)
    for (const element of mesh.elements.values()) {
      const nodes = mesh.getElementNodes(element);
      if (nodes.length !== 3) continue;

      let drawNodes = nodes;

      if (viewMode === 'results' && showDeformed && result && nodeIdToIndex) {
        drawNodes = nodes.map(n => {
          const idx = nodeIdToIndex.get(n.id);
          if (idx === undefined) return n;
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
          switch (stressType) {
            case 'sigmaX': value = stress.sigmaX; break;
            case 'sigmaY': value = stress.sigmaY; break;
            case 'tauXY': value = stress.tauXY; break;
            default: value = stress.vonMises;
          }
          ctx.fillStyle = getStressColor(value, result.minVonMises, result.maxVonMises);
        }
      } else {
        const material = mesh.getMaterial(element.materialId);
        ctx.fillStyle = material ? material.color + '40' : '#3b82f640';
      }
      ctx.fill();

      // Stroke
      const isSelected = selection.elementIds.has(element.id);
      ctx.strokeStyle = isSelected ? '#e94560' : '#3b82f6';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    }

    // Draw beam elements
    for (const beam of mesh.beamElements.values()) {
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;

      let drawN1 = n1;
      let drawN2 = n2;

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
        }
      }

      const p1 = worldToScreen(drawN1.x, drawN1.y);
      const p2 = worldToScreen(drawN2.x, drawN2.y);

      // Draw beam as thick line
      const isSelected = selection.elementIds.has(beam.id);
      const isHovered = hoveredBeamId === beam.id;

      if (showMembers) {
        ctx.strokeStyle = isSelected ? '#e94560' : isHovered ? '#fbbf24' : '#60a5fa';
        ctx.lineWidth = isSelected ? 6 : isHovered ? 5 : 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
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
    }

    // Draw dimensions when enabled
    if (showDimensions) {
      drawDimensions(ctx);
    }

    // Draw force diagrams (only in results view)
    if (viewMode === 'results' && result) {
      if (showNormal) drawForceDiagram(ctx, 'normal');
      if (showShear) drawForceDiagram(ctx, 'shear');
      if (showMoment) drawForceDiagram(ctx, 'moment');
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
        }

        ctx.stroke();
      }

      ctx.setLineDash([]);
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
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);

        if (isPending) {
          ctx.fillStyle = '#fbbf24';
        } else if (isSelected) {
          ctx.fillStyle = '#e94560';
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
        const arrowLen = 35;
        let labelY = screen.y + 45;

        // Draw Rx arrow (horizontal)
        if (Math.abs(Rx) > 0.01) {
          const dir = Rx > 0 ? 1 : -1;
          ctx.strokeStyle = reactionColor;
          ctx.fillStyle = reactionColor;
          ctx.lineWidth = 2;
          const tipX = screen.x + dir * arrowLen;
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y);
          ctx.lineTo(tipX, screen.y);
          ctx.stroke();
          // Arrow head
          ctx.beginPath();
          ctx.moveTo(tipX, screen.y);
          ctx.lineTo(tipX - dir * 8, screen.y - 4);
          ctx.lineTo(tipX - dir * 8, screen.y + 4);
          ctx.closePath();
          ctx.fill();
          // Label
          ctx.fillStyle = reactionColor;
          ctx.fillText(`Rx: ${fmtForce(Rx)}`, screen.x - 25, labelY);
          labelY += 12;
        }

        // Draw Ry arrow (vertical, pointing up for positive reaction)
        if (Math.abs(Ry) > 0.01) {
          const dir = Ry > 0 ? -1 : 1; // screen Y is inverted
          ctx.strokeStyle = reactionColor;
          ctx.fillStyle = reactionColor;
          ctx.lineWidth = 2;
          const tipY = screen.y + dir * arrowLen;
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y);
          ctx.lineTo(screen.x, tipY);
          ctx.stroke();
          // Arrow head
          ctx.beginPath();
          ctx.moveTo(screen.x, tipY);
          ctx.lineTo(screen.x - 4, tipY - dir * 8);
          ctx.lineTo(screen.x + 4, tipY - dir * 8);
          ctx.closePath();
          ctx.fill();
          // Label
          ctx.fillStyle = reactionColor;
          ctx.fillText(`Rz: ${fmtForce(Ry)}`, screen.x - 25, labelY);
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
    isConstraintTool, cursorPos, snapNodeId, hoveredBeamId, hoveredNodeId, moveMode, selectionBox, draggedBeamId,
    structuralGrid,
    screenToWorld, worldToScreen, getNodeIdToIndex, drawSupportSymbol, drawLoadArrow,
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

      // Handle Escape - cancel current tool / move mode
      if (e.key === 'Escape') {
        setPendingCommand(null);
        setMoveMode(false);
        // Return to select tool from any placement tool
        if (selectedTool !== 'select') {
          dispatch({ type: 'SET_TOOL', payload: 'select' });
        }
      }

      // Handle Delete key
      if (e.key === 'Delete') {
        if (selection.nodeIds.size > 0 || selection.elementIds.size > 0) {
          pushUndo();
          // Delete selected nodes (cascades to connected beams)
          for (const nodeId of selection.nodeIds) {
            mesh.removeNode(nodeId);
          }
          // Delete selected elements
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
  }, [selection, pendingCommand, mesh, dispatch, selectedTool, pushUndo]);

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

    if (selectedTool === 'select') {
      // Check load resize handle interaction (for selected beams/loads with distributed loads)
      if (viewMode !== 'geometry' && (selection.elementIds.size > 0 || selection.distLoadBeamIds.size > 0)) {
        const handle = findLoadHandleAtScreen(x, y);
        if (handle) {
          const beam = mesh.getBeamElement(handle.beamId);
          if (beam?.distributedLoad) {
            pushUndo();
            setResizingLoadBeamId(handle.beamId);
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
          setDraggedNode(node.id);
          setDragNodeOrigin({ x: node.x, y: node.y });
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
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
        if (e.shiftKey) {
          if (selection.elementIds.has(elementId)) {
            dispatch({ type: 'DESELECT_ELEMENT', payload: elementId });
          } else {
            dispatch({ type: 'SELECT_ELEMENT', payload: elementId });
          }
        } else {
          dispatch({ type: 'SET_SELECTION', payload: { nodeIds: new Set(), elementIds: new Set([elementId]), pointLoadNodeIds: new Set(), distLoadBeamIds: new Set() } });
        }
        return;
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
        let snapped = snapToGridFn(world.x, world.y);
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
        // Store node IDs and show section dialog instead of creating beam immediately
        setPendingBeamNodeIds(nodeIds);
        setShowSectionDialog(true);
        dispatch({ type: 'CLEAR_PENDING_NODES' });
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
          setEditingLoadNodeId(newNode.id);
        }
      }
    }

    if (selectedTool === 'addLineLoad') {
      const beam = findBeamAtScreen(x, y);
      if (beam) {
        setLineLoadBeamId(beam.id);
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
        setCursorPos({ x: mx, y: my });
        setSnapNodeId(null);
      }
      setHoveredBeamId(nearBeam?.id ?? null);
    } else if (selectedTool === 'addLoad' || selectedTool === 'addLineLoad') {
      setCursorPos({ x: mx, y: my });
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
      if (beam) {
        const nodes = mesh.getBeamElementNodes(beam);
        if (nodes) {
          const [n1, n2] = nodes;
          const angle = calculateBeamAngle(n1, n2);
          const perpAngle = angle + Math.PI / 2;

          // Compute perpendicular displacement in screen pixels
          // The perpendicular direction in screen space uses perpAngle
          const perpDist = dx * Math.cos(perpAngle) + dy * Math.sin(perpAngle);

          // Convert screen pixel displacement to a load change (N/m)
          // Sensitivity: 10 pixels = 1000 N/m
          const sign = resizeStartQy >= 0 ? 1 : -1;
          const newQy = resizeStartQy + sign * perpDist * 100;

          // Update the load on the beam directly for live preview
          beam.distributedLoad = { qx: beam.distributedLoad?.qx ?? 0, qy: newQy };
          dispatch({ type: 'REFRESH_MESH' });
        }
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
            qy: finalQy
          }
        });
      }
      setResizingLoadBeamId(null);
      setResizeStartQy(0);
    }
    setIsDragging(false);
    setDraggedNode(null);
    setDragNodeOrigin(null);
    setDraggedBeamId(null);
    setBeamDragOrigins(null);
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

    // Double-click on a bar -> open bar properties dialog
    const beam = findBeamAtScreen(x, y);
    if (beam) {
      setEditingBarId(beam.id);
      return;
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
            : (selectedTool === 'addLoad' || selectedTool === 'addLineLoad') ? 'crosshair'
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
        return (
          <LineLoadDialog
            initialQx={existingDl?.qx ?? 0}
            initialQy={existingDl?.qy ?? 0}
            initialStartT={beam.distributedLoad?.startT}
            initialEndT={beam.distributedLoad?.endT}
            initialCoordSystem={beam.distributedLoad?.coordSystem}
            loadCases={state.loadCases}
            activeLoadCase={state.activeLoadCase}
            onApply={(qx, qy, lcId, startT, endT, coordSystem) => {
              pushUndo();
              dispatch({
                type: 'ADD_DISTRIBUTED_LOAD',
                payload: { lcId, beamId: lineLoadBeamId, qx, qy }
              });
              // Also apply to mesh for rendering (with partial load and coord system)
              mesh.updateBeamElement(lineLoadBeamId, {
                distributedLoad: { qx, qy, startT, endT, coordSystem }
              });
              dispatch({ type: 'REFRESH_MESH' });
              dispatch({ type: 'SET_RESULT', payload: null });
              setLineLoadBeamId(null);
            }}
            onCancel={() => setLineLoadBeamId(null)}
          />
        );
      })()}
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
