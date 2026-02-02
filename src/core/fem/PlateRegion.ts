/**
 * Plate Region: mesh generation, edge load conversion, and deletion
 * A PlateRegion is a rectangular area auto-meshed with CST triangles.
 */

import { Mesh } from './Mesh';
import { IPlateRegion, IEdgeLoad } from './types';

export interface PlateRegionConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  divisionsX: number;
  divisionsY: number;
  materialId: number;
  thickness: number;
}

/**
 * Generate a plate region mesh: creates grid nodes and CST triangles.
 * Reuses existing nodes at matching positions (within tolerance).
 */
export function generatePlateRegionMesh(mesh: Mesh, config: PlateRegionConfig): IPlateRegion {
  const { x, y, width, height, divisionsX, divisionsY, materialId, thickness } = config;
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
        const newNode = mesh.addNode(nodeX, nodeY);
        nodeGrid[j][i] = newNode.id;
      }
      if (!allNodeIds.includes(nodeGrid[j][i])) {
        allNodeIds.push(nodeGrid[j][i]);
      }
    }
  }

  // Create 2*nx*ny triangles (2 per grid cell)
  const allElementIds: number[] = [];

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
 */
export function convertEdgeLoadToNodalForces(
  mesh: Mesh,
  plate: IPlateRegion,
  edgeLoad: IEdgeLoad
): { nodeId: number; fx: number; fy: number }[] {
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
