/**
 * Plate Region: mesh generation, edge load conversion, and deletion
 * A PlateRegion is a rectangular area auto-meshed with quad elements.
 */

import { Mesh } from './Mesh';
import { INode, IPlateRegion, IEdgeLoad } from './types';

export interface PlateRegionConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  divisionsX: number;
  divisionsY: number;
  materialId: number;
  thickness: number;
  elementType?: 'triangle' | 'quad';
}

/**
 * Generate a plate region mesh: creates grid nodes and quad elements.
 * Reuses existing nodes at matching positions (within tolerance).
 */
export function generatePlateRegionMesh(mesh: Mesh, config: PlateRegionConfig): IPlateRegion {
  const { x, y, width, height, divisionsX, divisionsY, materialId, thickness } = config;
  const elementType = config.elementType ?? 'quad';
  const nx = divisionsX;
  const ny = divisionsY;

  // Create (nx+1)*(ny+1) grid nodes
  const nodeGrid: number[][] = []; // nodeGrid[j][i] = nodeId
  const allNodeIds: number[] = [];

  for (let j = 0; j <= ny; j++) {
    nodeGrid[j] = [];
    for (let i = 0; i <= nx; i++) {
      const nodeX = x + (i / nx) * width;
      const nodeY = y + (j / ny) * height;

      // Try to reuse existing node at this position
      const existing = mesh.findNodeAt(nodeX, nodeY, 0.001);
      if (existing) {
        nodeGrid[j][i] = existing.id;
      } else {
        // Use plate node IDs (starting from 1000) for plate mesh nodes
        const newNode = mesh.addPlateNode(nodeX, nodeY);
        nodeGrid[j][i] = newNode.id;
      }
      if (!allNodeIds.includes(nodeGrid[j][i])) {
        allNodeIds.push(nodeGrid[j][i]);
      }
    }
  }

  const allElementIds: number[] = [];

  if (elementType === 'quad') {
    // Create nx*ny quad elements (1 per grid cell)
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const n0 = nodeGrid[j][i];         // BL
        const n1 = nodeGrid[j][i + 1];     // BR
        const n2 = nodeGrid[j + 1][i + 1]; // TR
        const n3 = nodeGrid[j + 1][i];     // TL

        const q = mesh.addQuadElement([n0, n1, n2, n3], materialId, thickness);
        if (q) allElementIds.push(q.id);
      }
    }
  } else {
    // Create 2*nx*ny triangles (2 per grid cell)
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const n0 = nodeGrid[j][i];       // BL
        const n1 = nodeGrid[j][i + 1];   // BR
        const n2 = nodeGrid[j + 1][i + 1]; // TR
        const n3 = nodeGrid[j + 1][i];   // TL

        // Triangle 1: (BL, BR, TR)
        const t1 = mesh.addTriangleElement([n0, n1, n2], materialId, thickness);
        if (t1) allElementIds.push(t1.id);

        // Triangle 2: (BL, TR, TL)
        const t2 = mesh.addTriangleElement([n0, n2, n3], materialId, thickness);
        if (t2) allElementIds.push(t2.id);
      }
    }
  }

  // Record edge nodeIds (ordered)
  const bottomEdge: number[] = [];
  for (let i = 0; i <= nx; i++) bottomEdge.push(nodeGrid[0][i]);

  const topEdge: number[] = [];
  for (let i = 0; i <= nx; i++) topEdge.push(nodeGrid[ny][i]);

  const leftEdge: number[] = [];
  for (let j = 0; j <= ny; j++) leftEdge.push(nodeGrid[j][0]);

  const rightEdge: number[] = [];
  for (let j = 0; j <= ny; j++) rightEdge.push(nodeGrid[j][nx]);

  const cornerNodeIds: [number, number, number, number] = [
    nodeGrid[0][0],     // BL
    nodeGrid[0][nx],    // BR
    nodeGrid[ny][nx],   // TR
    nodeGrid[ny][0]     // TL
  ];

  return {
    id: 0, // Will be assigned by Mesh.addPlateRegion
    x,
    y,
    width,
    height,
    divisionsX,
    divisionsY,
    materialId,
    thickness,
    elementType,
    nodeIds: allNodeIds,
    cornerNodeIds,
    elementIds: allElementIds,
    edges: {
      bottom: { nodeIds: bottomEdge },
      top: { nodeIds: topEdge },
      left: { nodeIds: leftEdge },
      right: { nodeIds: rightEdge }
    }
  };
}

/**
 * Convert an edge load on a plate to equivalent nodal forces using tributary lengths.
 * Returns an array of { nodeId, fx, fy } for each node along the edge.
 * Supports both named edges (top/bottom/left/right) and polygon edge indices (number).
 */
export function convertEdgeLoadToNodalForces(
  mesh: Mesh,
  plate: IPlateRegion,
  edgeLoad: IEdgeLoad
): { nodeId: number; fx: number; fy: number }[] {
  // If edge is a number (polygon edge index), find nodes along that polygon edge
  if (typeof edgeLoad.edge === 'number') {
    return convertPolygonEdgeLoadToNodalForces(mesh, plate, edgeLoad.edge, edgeLoad.px, edgeLoad.py);
  }

  const edgeNodeIds = plate.edges[edgeLoad.edge].nodeIds;
  if (edgeNodeIds.length < 2) return [];

  // Get positions of edge nodes
  const positions: { nodeId: number; pos: number }[] = [];
  for (const nodeId of edgeNodeIds) {
    const node = mesh.getNode(nodeId);
    if (!node) continue;

    // Compute position along edge (parametric)
    let pos: number;
    if (edgeLoad.edge === 'bottom' || edgeLoad.edge === 'top') {
      pos = node.x;
    } else {
      pos = node.y;
    }
    positions.push({ nodeId, pos });
  }

  // Sort by position
  positions.sort((a, b) => a.pos - b.pos);

  const forces: { nodeId: number; fx: number; fy: number }[] = [];

  for (let i = 0; i < positions.length; i++) {
    // Tributary length: half the distance to neighbors on each side
    let tributaryLength = 0;

    if (i > 0) {
      tributaryLength += (positions[i].pos - positions[i - 1].pos) / 2;
    }
    if (i < positions.length - 1) {
      tributaryLength += (positions[i + 1].pos - positions[i].pos) / 2;
    }

    forces.push({
      nodeId: positions[i].nodeId,
      fx: edgeLoad.px * tributaryLength,
      fy: edgeLoad.py * tributaryLength
    });
  }

  return forces;
}

/**
 * Convert a polygon edge load to nodal forces.
 * Finds all mesh nodes that lie on the polygon edge between vertex[edgeIndex]
 * and vertex[(edgeIndex+1) % n], then distributes the load using tributary lengths.
 */
function convertPolygonEdgeLoadToNodalForces(
  mesh: Mesh,
  plate: IPlateRegion,
  edgeIndex: number,
  px: number,
  py: number
): { nodeId: number; fx: number; fy: number }[] {
  if (!plate.polygon || plate.polygon.length < 3) return [];

  const n = plate.polygon.length;
  const v1 = plate.polygon[edgeIndex % n];
  const v2 = plate.polygon[(edgeIndex + 1) % n];

  const edgeDx = v2.x - v1.x;
  const edgeDy = v2.y - v1.y;
  const edgeLenSq = edgeDx * edgeDx + edgeDy * edgeDy;
  if (edgeLenSq < 1e-12) return [];

  const edgeLen = Math.sqrt(edgeLenSq);
  const tolerance = edgeLen * 0.01 + 0.001;

  // Find all nodes on this edge using the boundary nodes or all plate nodes
  const candidateNodeIds = plate.boundaryNodeIds && plate.boundaryNodeIds.length > 0
    ? plate.boundaryNodeIds
    : plate.nodeIds;

  const positions: { nodeId: number; t: number }[] = [];
  for (const nodeId of candidateNodeIds) {
    const node = mesh.getNode(nodeId);
    if (!node) continue;

    // Check if the node lies on the segment v1->v2
    const dist = pointToSegmentDistanceFn(node.x, node.y, v1.x, v1.y, v2.x, v2.y);
    if (dist < tolerance) {
      // Compute parametric position along the edge
      const t = ((node.x - v1.x) * edgeDx + (node.y - v1.y) * edgeDy) / edgeLenSq;
      positions.push({ nodeId, t });
    }
  }

  if (positions.length < 2) return [];

  // Sort by parametric position
  positions.sort((a, b) => a.t - b.t);

  const forces: { nodeId: number; fx: number; fy: number }[] = [];
  for (let i = 0; i < positions.length; i++) {
    // Tributary length along the edge
    let tributaryLength = 0;
    if (i > 0) {
      tributaryLength += (positions[i].t - positions[i - 1].t) * edgeLen / 2;
    }
    if (i < positions.length - 1) {
      tributaryLength += (positions[i + 1].t - positions[i].t) * edgeLen / 2;
    }

    forces.push({
      nodeId: positions[i].nodeId,
      fx: px * tributaryLength,
      fy: py * tributaryLength
    });
  }

  return forces;
}

/** Point-to-segment distance (used by polygon edge load conversion) */
function pointToSegmentDistanceFn(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

export interface PolygonPlateConfig {
  outline: { x: number; y: number }[];
  voids?: { x: number; y: number }[][];
  meshSize: number;   // element edge length in meters
  materialId: number;
  thickness: number;
}

/**
 * Generate a polygon plate mesh using a voxelized quad grid approach.
 * Creates a regular grid of quad elements within the polygon bounding box,
 * keeping only quads whose centroid lies inside the polygon (and outside voids).
 */
export function generatePolygonPlateMesh(mesh: Mesh, config: PolygonPlateConfig): IPlateRegion {
  const { outline, voids, meshSize, materialId, thickness } = config;

  // Compute bounding box
  const xs = outline.map(p => p.x);
  const ys = outline.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bboxX = minX;
  const bboxY = minY;
  const bboxW = maxX - minX;
  const bboxH = maxY - minY;

  // Compute grid divisions based on mesh size
  const nx = Math.max(1, Math.round(bboxW / meshSize));
  const ny = Math.max(1, Math.round(bboxH / meshSize));
  const dx = bboxW / nx;
  const dy = bboxH / ny;

  // Create grid nodes: (nx+1) x (ny+1)
  // nodeGrid[j][i] = nodeId at grid position (i, j)
  // We only create nodes that are needed (adjacent to kept quads)
  // First pass: determine which quads to keep
  const keepQuad: boolean[][] = [];
  for (let j = 0; j < ny; j++) {
    keepQuad[j] = [];
    for (let i = 0; i < nx; i++) {
      // Compute centroid of this quad cell
      const cx = bboxX + (i + 0.5) * dx;
      const cy = bboxY + (j + 0.5) * dy;

      // Check if centroid is inside the polygon
      let inside = pointInPolygon(cx, cy, outline);

      // Check if centroid is inside any void
      if (inside && voids) {
        for (const voidPoly of voids) {
          if (pointInPolygon(cx, cy, voidPoly)) {
            inside = false;
            break;
          }
        }
      }

      keepQuad[j][i] = inside;
    }
  }

  // Second pass: create nodes and quad elements for kept cells
  // Track which grid positions need nodes
  const nodeNeeded: boolean[][] = [];
  for (let j = 0; j <= ny; j++) {
    nodeNeeded[j] = new Array(nx + 1).fill(false);
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (keepQuad[j][i]) {
        nodeNeeded[j][i] = true;
        nodeNeeded[j][i + 1] = true;
        nodeNeeded[j + 1][i] = true;
        nodeNeeded[j + 1][i + 1] = true;
      }
    }
  }

  // Create nodes
  const nodeGrid: (number | null)[][] = [];
  const allNodeIds: number[] = [];
  for (let j = 0; j <= ny; j++) {
    nodeGrid[j] = [];
    for (let i = 0; i <= nx; i++) {
      if (nodeNeeded[j][i]) {
        const nodeX = bboxX + i * dx;
        const nodeY = bboxY + j * dy;
        const existing = mesh.findNodeAt(nodeX, nodeY, 0.001);
        if (existing) {
          nodeGrid[j][i] = existing.id;
          if (!allNodeIds.includes(existing.id)) {
            allNodeIds.push(existing.id);
          }
        } else {
          const newNode = mesh.addPlateNode(nodeX, nodeY);
          nodeGrid[j][i] = newNode.id;
          allNodeIds.push(newNode.id);
        }
      } else {
        nodeGrid[j][i] = null;
      }
    }
  }

  // Create quad elements for kept cells
  const allElementIds: number[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (!keepQuad[j][i]) continue;
      const n0 = nodeGrid[j][i]!;       // BL
      const n1 = nodeGrid[j][i + 1]!;   // BR
      const n2 = nodeGrid[j + 1][i + 1]!; // TR
      const n3 = nodeGrid[j + 1][i]!;   // TL

      const q = mesh.addQuadElement([n0, n1, n2, n3], materialId, thickness);
      if (q) allElementIds.push(q.id);
    }
  }

  // Identify boundary nodes: nodes on the edge of the kept region
  // A node is on the boundary if it is on the edge of a kept quad that borders
  // a non-kept quad or the grid boundary
  const boundaryNodeIds: number[] = [];
  const boundarySet = new Set<number>();
  const tolerance = 0.001;
  for (const nodeId of allNodeIds) {
    const node = mesh.getNode(nodeId);
    if (!node) continue;
    if (isPointOnPolygonBoundary(node.x, node.y, outline, Math.max(dx, dy) * 0.6)) {
      boundarySet.add(nodeId);
      boundaryNodeIds.push(nodeId);
    }
  }

  // Also add nodes at the grid edges that border empty cells
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (!keepQuad[j][i]) continue;
      const corners = [
        { nid: nodeGrid[j][i]!, side: 'bottom-left' },
        { nid: nodeGrid[j][i + 1]!, side: 'bottom-right' },
        { nid: nodeGrid[j + 1][i + 1]!, side: 'top-right' },
        { nid: nodeGrid[j + 1][i]!, side: 'top-left' },
      ];
      // Check if this quad borders empty space
      const isEdgeLeft = i === 0 || !keepQuad[j][i - 1];
      const isEdgeRight = i === nx - 1 || !keepQuad[j][i + 1];
      const isEdgeBottom = j === 0 || !keepQuad[j - 1][i];
      const isEdgeTop = j === ny - 1 || !keepQuad[j + 1][i];

      if (isEdgeBottom) { boundarySet.add(corners[0].nid); boundarySet.add(corners[1].nid); }
      if (isEdgeRight) { boundarySet.add(corners[1].nid); boundarySet.add(corners[2].nid); }
      if (isEdgeTop) { boundarySet.add(corners[2].nid); boundarySet.add(corners[3].nid); }
      if (isEdgeLeft) { boundarySet.add(corners[3].nid); boundarySet.add(corners[0].nid); }
    }
  }
  // Rebuild boundary list without duplicates
  const finalBoundaryNodeIds = Array.from(boundarySet);

  // Classify boundary nodes into edges based on bbox proximity
  const edgeTol = Math.max(dx, dy) * 0.6 + tolerance;
  const bottomEdge: number[] = [];
  const topEdge: number[] = [];
  const leftEdge: number[] = [];
  const rightEdge: number[] = [];

  for (const nodeId of finalBoundaryNodeIds) {
    const node = mesh.getNode(nodeId)!;
    if (Math.abs(node.y - bboxY) < edgeTol) bottomEdge.push(nodeId);
    if (Math.abs(node.y - (bboxY + bboxH)) < edgeTol) topEdge.push(nodeId);
    if (Math.abs(node.x - bboxX) < edgeTol) leftEdge.push(nodeId);
    if (Math.abs(node.x - (bboxX + bboxW)) < edgeTol) rightEdge.push(nodeId);
  }

  // Sort edges
  const sortByX = (a: number, b: number) => (mesh.getNode(a)!.x - mesh.getNode(b)!.x);
  const sortByY = (a: number, b: number) => (mesh.getNode(a)!.y - mesh.getNode(b)!.y);
  bottomEdge.sort(sortByX);
  topEdge.sort(sortByX);
  leftEdge.sort(sortByY);
  rightEdge.sort(sortByY);

  // Corner nodes: find boundary nodes closest to bbox corners
  const findClosest = (tx: number, ty: number): number => {
    let bestId = allNodeIds[0];
    let bestDist = Infinity;
    const candidates = finalBoundaryNodeIds.length > 0 ? finalBoundaryNodeIds : allNodeIds;
    for (const nodeId of candidates) {
      const node = mesh.getNode(nodeId)!;
      const d = (node.x - tx) ** 2 + (node.y - ty) ** 2;
      if (d < bestDist) { bestDist = d; bestId = nodeId; }
    }
    return bestId;
  };

  const cornerNodeIds: [number, number, number, number] = [
    findClosest(bboxX, bboxY),             // BL
    findClosest(bboxX + bboxW, bboxY),     // BR
    findClosest(bboxX + bboxW, bboxY + bboxH), // TR
    findClosest(bboxX, bboxY + bboxH),     // TL
  ];

  return {
    id: 0, // Will be assigned by Mesh.addPlateRegion
    x: bboxX,
    y: bboxY,
    width: bboxW,
    height: bboxH,
    divisionsX: nx,
    divisionsY: ny,
    materialId,
    thickness,
    elementType: 'quad',
    nodeIds: allNodeIds,
    cornerNodeIds,
    elementIds: allElementIds,
    edges: {
      bottom: { nodeIds: bottomEdge },
      top: { nodeIds: topEdge },
      left: { nodeIds: leftEdge },
      right: { nodeIds: rightEdge },
    },
    isPolygon: true,
    polygon: [...outline],
    voids: voids ? voids.map(v => [...v]) : undefined,
    meshSize,
    boundaryNodeIds: finalBoundaryNodeIds,
  };
}

/**
 * Check if a point lies on any segment of a polygon outline.
 */
function isPointOnPolygonBoundary(px: number, py: number, polygon: { x: number; y: number }[], tolerance: number): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dist = pointToSegmentDistance(px, py, a.x, a.y, b.x, b.y);
    if (dist < tolerance) return true;
  }
  return false;
}

function pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

/**
 * Point-in-polygon test using ray casting algorithm.
 * Works for both convex and concave polygons.
 */
export function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Compute the centroid of a polygon.
 */
export function polygonCentroid(polygon: { x: number; y: number }[]): { x: number; y: number } {
  let cx = 0, cy = 0, area = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const cross = polygon[j].x * polygon[i].y - polygon[i].x * polygon[j].y;
    area += cross;
    cx += (polygon[j].x + polygon[i].x) * cross;
    cy += (polygon[j].y + polygon[i].y) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-12) {
    // Degenerate: fallback to simple average
    const sx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
    const sy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
    return { x: sx, y: sy };
  }
  cx /= (6 * area);
  cy /= (6 * area);
  return { x: cx, y: cy };
}

/**
 * Compute the signed area of a polygon.
 */
export function polygonArea(polygon: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    area += polygon[j].x * polygon[i].y - polygon[i].x * polygon[j].y;
  }
  return Math.abs(area * 0.5);
}

/**
 * Re-mesh a rectangular plate region after a corner node has been dragged.
 * Reads current corner node positions, removes old interior nodes/elements,
 * and regenerates the mesh grid to fit the new quadrilateral shape.
 *
 * For a general quadrilateral (non-axis-aligned after drag), the mesh is
 * generated using bilinear interpolation between the four corner positions.
 */
export function remeshPlateRegion(mesh: Mesh, plateId: number): void {
  const plate = mesh.getPlateRegion(plateId);
  if (!plate || plate.isPolygon) return;

  const [blId, brId, trId, tlId] = plate.cornerNodeIds;
  const bl = mesh.getNode(blId);
  const br = mesh.getNode(brId);
  const tr = mesh.getNode(trId);
  const tl = mesh.getNode(tlId);
  if (!bl || !br || !tr || !tl) return;

  // Save corner node constraints and loads so they are preserved
  const cornerData = new Map<number, { constraints: INode['constraints']; loads: INode['loads'] }>();
  for (const cId of plate.cornerNodeIds) {
    const n = mesh.getNode(cId);
    if (n) {
      cornerData.set(cId, {
        constraints: { ...n.constraints },
        loads: { ...n.loads },
      });
    }
  }

  const cornerSet = new Set(plate.cornerNodeIds);

  // --- Remove old elements ---
  for (const elemId of plate.elementIds) {
    mesh.elements.delete(elemId);
  }

  // --- Remove old interior nodes (not corner, not shared) ---
  const otherPlateNodeIds = new Set<number>();
  for (const [id, otherPlate] of mesh.plateRegions) {
    if (id === plateId) continue;
    for (const nodeId of otherPlate.nodeIds) {
      otherPlateNodeIds.add(nodeId);
    }
  }
  const beamNodeIds = new Set<number>();
  for (const beam of mesh.beamElements.values()) {
    beamNodeIds.add(beam.nodeIds[0]);
    beamNodeIds.add(beam.nodeIds[1]);
  }
  const remainingTriNodeIds = new Set<number>();
  for (const elem of mesh.elements.values()) {
    for (const nodeId of elem.nodeIds) {
      remainingTriNodeIds.add(nodeId);
    }
  }

  for (const nodeId of plate.nodeIds) {
    if (cornerSet.has(nodeId)) continue; // keep corners
    if (otherPlateNodeIds.has(nodeId)) continue;
    if (beamNodeIds.has(nodeId)) continue;
    if (remainingTriNodeIds.has(nodeId)) continue;
    mesh.nodes.delete(nodeId);
  }

  // --- Regenerate mesh using bilinear interpolation ---
  const nx = plate.divisionsX;
  const ny = plate.divisionsY;
  const { materialId, thickness, elementType } = plate;
  const elemTypeActual = elementType ?? 'quad';

  const nodeGrid: number[][] = [];
  const allNodeIds: number[] = [];

  for (let j = 0; j <= ny; j++) {
    nodeGrid[j] = [];
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const v = j / ny;

      // Bilinear interpolation of the four corners
      const nodeX = (1 - u) * (1 - v) * bl.x + u * (1 - v) * br.x + u * v * tr.x + (1 - u) * v * tl.x;
      const nodeY = (1 - u) * (1 - v) * bl.y + u * (1 - v) * br.y + u * v * tr.y + (1 - u) * v * tl.y;

      // Map corners to existing corner nodes
      if (i === 0 && j === 0) {
        nodeGrid[j][i] = blId;
      } else if (i === nx && j === 0) {
        nodeGrid[j][i] = brId;
      } else if (i === nx && j === ny) {
        nodeGrid[j][i] = trId;
      } else if (i === 0 && j === ny) {
        nodeGrid[j][i] = tlId;
      } else {
        const newNode = mesh.addPlateNode(nodeX, nodeY);
        nodeGrid[j][i] = newNode.id;
      }

      if (!allNodeIds.includes(nodeGrid[j][i])) {
        allNodeIds.push(nodeGrid[j][i]);
      }
    }
  }

  // Create elements
  const allElementIds: number[] = [];

  if (elemTypeActual === 'quad') {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const n0 = nodeGrid[j][i];
        const n1 = nodeGrid[j][i + 1];
        const n2 = nodeGrid[j + 1][i + 1];
        const n3 = nodeGrid[j + 1][i];
        const q = mesh.addQuadElement([n0, n1, n2, n3], materialId, thickness);
        if (q) allElementIds.push(q.id);
      }
    }
  } else {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const n0 = nodeGrid[j][i];
        const n1 = nodeGrid[j][i + 1];
        const n2 = nodeGrid[j + 1][i + 1];
        const n3 = nodeGrid[j + 1][i];
        const t1 = mesh.addTriangleElement([n0, n1, n2], materialId, thickness);
        if (t1) allElementIds.push(t1.id);
        const t2 = mesh.addTriangleElement([n0, n2, n3], materialId, thickness);
        if (t2) allElementIds.push(t2.id);
      }
    }
  }

  // Build edges
  const bottomEdge: number[] = [];
  for (let i = 0; i <= nx; i++) bottomEdge.push(nodeGrid[0][i]);
  const topEdge: number[] = [];
  for (let i = 0; i <= nx; i++) topEdge.push(nodeGrid[ny][i]);
  const leftEdge: number[] = [];
  for (let j = 0; j <= ny; j++) leftEdge.push(nodeGrid[j][0]);
  const rightEdge: number[] = [];
  for (let j = 0; j <= ny; j++) rightEdge.push(nodeGrid[j][nx]);

  // Update the plate region bounding box based on current corner positions
  const allXs = [bl.x, br.x, tr.x, tl.x];
  const allYs = [bl.y, br.y, tr.y, tl.y];

  // Update plate region in-place
  plate.x = Math.min(...allXs);
  plate.y = Math.min(...allYs);
  plate.width = Math.max(...allXs) - plate.x;
  plate.height = Math.max(...allYs) - plate.y;
  plate.nodeIds = allNodeIds;
  plate.elementIds = allElementIds;
  plate.edges = {
    bottom: { nodeIds: bottomEdge },
    top: { nodeIds: topEdge },
    left: { nodeIds: leftEdge },
    right: { nodeIds: rightEdge },
  };

  // Restore corner node constraints and loads
  for (const [cId, data] of cornerData) {
    mesh.updateNode(cId, { constraints: data.constraints, loads: data.loads });
  }
}

/**
 * Re-mesh a polygon plate region after a vertex node has been dragged.
 * Finds which polygon vertex the dragged node corresponds to, updates the polygon
 * outline, removes old interior nodes/elements, and regenerates via voxelized quad grid.
 *
 * @param draggedNodeId The node that was dragged (must be a polygon vertex node)
 */
export function remeshPolygonPlateRegion(mesh: Mesh, plateId: number, draggedNodeId: number): void {
  const plate = mesh.getPlateRegion(plateId);
  if (!plate || !plate.isPolygon || !plate.polygon) return;

  const polygon = plate.polygon;
  const boundaryNodeIds = plate.boundaryNodeIds ?? plate.nodeIds;

  // Find which polygon vertex corresponds to the dragged node.
  // The dragged node has already been moved, so we find the vertex whose
  // closest boundary node (before movement) was the dragged node.
  // Since the node has already moved away from its original vertex position,
  // we check which polygon vertex this node was closest to before the drag.
  // We do this by finding the polygon vertex that is NOT close to any OTHER
  // boundary node -- effectively the vertex that "lost" its node.
  let draggedVertexIndex = -1;

  // Strategy: for each polygon vertex, find the boundary node closest to it.
  // The vertex whose closest node is the dragged node (even though it moved)
  // is the one we need to update.
  for (let vi = 0; vi < polygon.length; vi++) {
    const vx = polygon[vi].x;
    const vy = polygon[vi].y;
    let bestDist = Infinity;
    let bestNodeId = -1;
    for (const nodeId of boundaryNodeIds) {
      const node = mesh.getNode(nodeId);
      if (!node) continue;
      const d = (node.x - vx) ** 2 + (node.y - vy) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestNodeId = nodeId;
      }
    }
    if (bestNodeId === draggedNodeId) {
      draggedVertexIndex = vi;
      break;
    }
  }

  // If we couldn't find a match, the dragged node might not be a polygon vertex
  if (draggedVertexIndex === -1) return;

  // Update the polygon vertex to the dragged node's new position
  const draggedNode = mesh.getNode(draggedNodeId);
  if (!draggedNode) return;
  polygon[draggedVertexIndex] = { x: draggedNode.x, y: draggedNode.y };

  // Save constraints/loads on all boundary vertex nodes for preservation
  const vertexNodeData = new Map<number, { constraints: INode['constraints']; loads: INode['loads'] }>();
  const vertexNodeIds: number[] = [];
  for (let vi = 0; vi < polygon.length; vi++) {
    const vx = polygon[vi].x;
    const vy = polygon[vi].y;
    let bestDist = Infinity;
    let bestNodeId = -1;
    for (const nodeId of boundaryNodeIds) {
      const node = mesh.getNode(nodeId);
      if (!node) continue;
      const d = (node.x - vx) ** 2 + (node.y - vy) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestNodeId = nodeId;
      }
    }
    vertexNodeIds.push(bestNodeId);
    if (bestNodeId >= 0) {
      const n = mesh.getNode(bestNodeId);
      if (n) {
        vertexNodeData.set(bestNodeId, {
          constraints: { ...n.constraints },
          loads: { ...n.loads },
        });
      }
    }
  }

  const vertexNodeSet = new Set(vertexNodeIds.filter(id => id >= 0));

  // --- Remove old elements ---
  for (const elemId of plate.elementIds) {
    mesh.elements.delete(elemId);
  }

  // --- Remove old interior nodes (not vertex, not shared) ---
  const otherPlateNodeIds = new Set<number>();
  for (const [id, otherPlate] of mesh.plateRegions) {
    if (id === plateId) continue;
    for (const nodeId of otherPlate.nodeIds) {
      otherPlateNodeIds.add(nodeId);
    }
  }
  const beamNodeIdsSet = new Set<number>();
  for (const beam of mesh.beamElements.values()) {
    beamNodeIdsSet.add(beam.nodeIds[0]);
    beamNodeIdsSet.add(beam.nodeIds[1]);
  }
  const remainingElemNodeIds = new Set<number>();
  for (const elem of mesh.elements.values()) {
    for (const nodeId of elem.nodeIds) {
      remainingElemNodeIds.add(nodeId);
    }
  }

  for (const nodeId of plate.nodeIds) {
    if (vertexNodeSet.has(nodeId)) continue; // keep vertex nodes
    if (otherPlateNodeIds.has(nodeId)) continue;
    if (beamNodeIdsSet.has(nodeId)) continue;
    if (remainingElemNodeIds.has(nodeId)) continue;
    mesh.nodes.delete(nodeId);
  }

  // --- Regenerate using the same voxelized quad grid approach ---
  const meshSizeVal = plate.meshSize ?? 0.5;

  // Recompute bounding box from updated polygon
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bboxX = minX;
  const bboxY = minY;
  const bboxW = maxX - minX;
  const bboxH = maxY - minY;

  const nxDiv = Math.max(1, Math.round(bboxW / meshSizeVal));
  const nyDiv = Math.max(1, Math.round(bboxH / meshSizeVal));
  const cellDx = bboxW / nxDiv;
  const cellDy = bboxH / nyDiv;

  // First pass: determine which quads to keep
  const keepQuad: boolean[][] = [];
  for (let j = 0; j < nyDiv; j++) {
    keepQuad[j] = [];
    for (let i = 0; i < nxDiv; i++) {
      const cx = bboxX + (i + 0.5) * cellDx;
      const cy = bboxY + (j + 0.5) * cellDy;
      let inside = pointInPolygon(cx, cy, polygon);
      if (inside && plate.voids) {
        for (const voidPoly of plate.voids) {
          if (pointInPolygon(cx, cy, voidPoly)) {
            inside = false;
            break;
          }
        }
      }
      keepQuad[j][i] = inside;
    }
  }

  // Track which grid positions need nodes
  const nodeNeeded: boolean[][] = [];
  for (let j = 0; j <= nyDiv; j++) {
    nodeNeeded[j] = new Array(nxDiv + 1).fill(false);
  }
  for (let j = 0; j < nyDiv; j++) {
    for (let i = 0; i < nxDiv; i++) {
      if (keepQuad[j][i]) {
        nodeNeeded[j][i] = true;
        nodeNeeded[j][i + 1] = true;
        nodeNeeded[j + 1][i] = true;
        nodeNeeded[j + 1][i + 1] = true;
      }
    }
  }

  // Create nodes
  const nodeGrid: (number | null)[][] = [];
  const allNodeIds: number[] = [];
  for (let j = 0; j <= nyDiv; j++) {
    nodeGrid[j] = [];
    for (let i = 0; i <= nxDiv; i++) {
      if (nodeNeeded[j][i]) {
        const nodeX = bboxX + i * cellDx;
        const nodeY = bboxY + j * cellDy;
        const existing = mesh.findNodeAt(nodeX, nodeY, 0.001);
        if (existing) {
          nodeGrid[j][i] = existing.id;
          if (!allNodeIds.includes(existing.id)) {
            allNodeIds.push(existing.id);
          }
        } else {
          const newNode = mesh.addPlateNode(nodeX, nodeY);
          nodeGrid[j][i] = newNode.id;
          allNodeIds.push(newNode.id);
        }
      } else {
        nodeGrid[j][i] = null;
      }
    }
  }

  // Create quad elements
  const allElementIds: number[] = [];
  for (let j = 0; j < nyDiv; j++) {
    for (let i = 0; i < nxDiv; i++) {
      if (!keepQuad[j][i]) continue;
      const n0 = nodeGrid[j][i]!;
      const n1 = nodeGrid[j][i + 1]!;
      const n2 = nodeGrid[j + 1][i + 1]!;
      const n3 = nodeGrid[j + 1][i]!;
      const q = mesh.addQuadElement([n0, n1, n2, n3], plate.materialId, plate.thickness);
      if (q) allElementIds.push(q.id);
    }
  }

  // Identify boundary nodes
  const newBoundarySet = new Set<number>();
  const tolerance = 0.001;
  for (const nodeId of allNodeIds) {
    const node = mesh.getNode(nodeId);
    if (!node) continue;
    if (isPointOnPolygonBoundary(node.x, node.y, polygon, Math.max(cellDx, cellDy) * 0.6)) {
      newBoundarySet.add(nodeId);
    }
  }
  // Also add nodes at grid edges bordering empty cells
  for (let j = 0; j < nyDiv; j++) {
    for (let i = 0; i < nxDiv; i++) {
      if (!keepQuad[j][i]) continue;
      const corners = [nodeGrid[j][i]!, nodeGrid[j][i + 1]!, nodeGrid[j + 1][i + 1]!, nodeGrid[j + 1][i]!];
      const isEdgeLeft = i === 0 || !keepQuad[j][i - 1];
      const isEdgeRight = i === nxDiv - 1 || !keepQuad[j][i + 1];
      const isEdgeBottom = j === 0 || !keepQuad[j - 1][i];
      const isEdgeTop = j === nyDiv - 1 || !keepQuad[j + 1][i];
      if (isEdgeBottom) { newBoundarySet.add(corners[0]); newBoundarySet.add(corners[1]); }
      if (isEdgeRight) { newBoundarySet.add(corners[1]); newBoundarySet.add(corners[2]); }
      if (isEdgeTop) { newBoundarySet.add(corners[2]); newBoundarySet.add(corners[3]); }
      if (isEdgeLeft) { newBoundarySet.add(corners[3]); newBoundarySet.add(corners[0]); }
    }
  }
  const newBoundaryNodeIds = Array.from(newBoundarySet);

  // Edge classification
  const edgeTol = Math.max(cellDx, cellDy) * 0.6 + tolerance;
  const bottomEdge: number[] = [];
  const topEdge: number[] = [];
  const leftEdge: number[] = [];
  const rightEdge: number[] = [];
  for (const nodeId of newBoundaryNodeIds) {
    const node = mesh.getNode(nodeId)!;
    if (Math.abs(node.y - bboxY) < edgeTol) bottomEdge.push(nodeId);
    if (Math.abs(node.y - (bboxY + bboxH)) < edgeTol) topEdge.push(nodeId);
    if (Math.abs(node.x - bboxX) < edgeTol) leftEdge.push(nodeId);
    if (Math.abs(node.x - (bboxX + bboxW)) < edgeTol) rightEdge.push(nodeId);
  }
  const sortByX = (a: number, b: number) => (mesh.getNode(a)!.x - mesh.getNode(b)!.x);
  const sortByY = (a: number, b: number) => (mesh.getNode(a)!.y - mesh.getNode(b)!.y);
  bottomEdge.sort(sortByX);
  topEdge.sort(sortByX);
  leftEdge.sort(sortByY);
  rightEdge.sort(sortByY);

  // Corner nodes
  const findClosest = (tx: number, ty: number): number => {
    let bestId = allNodeIds[0];
    let bestDist = Infinity;
    const candidates = newBoundaryNodeIds.length > 0 ? newBoundaryNodeIds : allNodeIds;
    for (const nodeId of candidates) {
      const node = mesh.getNode(nodeId)!;
      const d = (node.x - tx) ** 2 + (node.y - ty) ** 2;
      if (d < bestDist) { bestDist = d; bestId = nodeId; }
    }
    return bestId;
  };

  const newCornerNodeIds: [number, number, number, number] = [
    findClosest(bboxX, bboxY),
    findClosest(bboxX + bboxW, bboxY),
    findClosest(bboxX + bboxW, bboxY + bboxH),
    findClosest(bboxX, bboxY + bboxH),
  ];

  // Update plate region in-place
  plate.x = bboxX;
  plate.y = bboxY;
  plate.width = bboxW;
  plate.height = bboxH;
  plate.divisionsX = nxDiv;
  plate.divisionsY = nyDiv;
  plate.nodeIds = allNodeIds;
  plate.cornerNodeIds = newCornerNodeIds;
  plate.elementIds = allElementIds;
  plate.edges = {
    bottom: { nodeIds: bottomEdge },
    top: { nodeIds: topEdge },
    left: { nodeIds: leftEdge },
    right: { nodeIds: rightEdge },
  };
  plate.polygon = polygon.map(p => ({ ...p }));
  plate.boundaryNodeIds = newBoundaryNodeIds;

  // Restore vertex node constraints and loads
  for (const [nId, data] of vertexNodeData) {
    if (mesh.getNode(nId)) {
      mesh.updateNode(nId, { constraints: data.constraints, loads: data.loads });
    }
  }
}

/**
 * Find the plate region that has the given node as a corner node (rectangular)
 * or as a polygon vertex node (polygon). Returns the plate ID and whether it's
 * a polygon vertex, or null if the node is not a plate corner/vertex.
 */
export function findPlateCornerForNode(
  mesh: Mesh,
  nodeId: number
): { plateId: number; isPolygonVertex: boolean } | null {
  for (const [plateId, plate] of mesh.plateRegions) {
    // Check rectangular plate corners
    if (!plate.isPolygon && plate.cornerNodeIds.includes(nodeId)) {
      return { plateId, isPolygonVertex: false };
    }

    // Check polygon plate vertex nodes
    if (plate.isPolygon && plate.polygon) {
      const boundaryNodeIds = plate.boundaryNodeIds ?? plate.nodeIds;
      // Check if this node is a polygon vertex node
      for (let vi = 0; vi < plate.polygon.length; vi++) {
        const vx = plate.polygon[vi].x;
        const vy = plate.polygon[vi].y;
        let bestDist = Infinity;
        let bestNodeId = -1;
        for (const bid of boundaryNodeIds) {
          const bn = mesh.getNode(bid);
          if (!bn) continue;
          const d = (bn.x - vx) ** 2 + (bn.y - vy) ** 2;
          if (d < bestDist) {
            bestDist = d;
            bestNodeId = bid;
          }
        }
        if (bestNodeId === nodeId) {
          return { plateId, isPolygonVertex: true };
        }
      }
    }
  }
  return null;
}

/**
 * Remove a plate region and all its elements.
 * Interior-only nodes (not shared with beams or other plates) are also removed.
 */
export function removePlateRegion(mesh: Mesh, plateId: number): void {
  const plate = mesh.getPlateRegion(plateId);
  if (!plate) return;

  // Remove all triangle elements belonging to this plate
  for (const elemId of plate.elementIds) {
    mesh.elements.delete(elemId);
  }

  // Determine which nodes are "interior-only" (not used by beams or other plates)
  const otherPlateNodeIds = new Set<number>();
  for (const [id, otherPlate] of mesh.plateRegions) {
    if (id === plateId) continue;
    for (const nodeId of otherPlate.nodeIds) {
      otherPlateNodeIds.add(nodeId);
    }
  }

  const beamNodeIds = new Set<number>();
  for (const beam of mesh.beamElements.values()) {
    beamNodeIds.add(beam.nodeIds[0]);
    beamNodeIds.add(beam.nodeIds[1]);
  }

  // Also check remaining triangle elements (not part of this plate)
  const remainingTriNodeIds = new Set<number>();
  for (const elem of mesh.elements.values()) {
    for (const nodeId of elem.nodeIds) {
      remainingTriNodeIds.add(nodeId);
    }
  }

  for (const nodeId of plate.nodeIds) {
    if (otherPlateNodeIds.has(nodeId)) continue;
    if (beamNodeIds.has(nodeId)) continue;
    if (remainingTriNodeIds.has(nodeId)) continue;
    mesh.nodes.delete(nodeId);
  }

  // Remove the plate region itself
  mesh.plateRegions.delete(plateId);
}
