import { INode, IBeamElement, IBeamForces, IMaterial } from './types';
import {
  calculateBeamLength,
  calculateBeamAngle,
  calculateBeamLocalStiffness,
  transformGlobalToLocal
} from './Beam';

const NUM_STATIONS = 21; // Number of points along beam for diagrams

/**
 * Calculate internal forces (N, V, M) for a beam element
 *
 * Sign conventions:
 * - N positive: tension
 * - V positive: causes clockwise rotation of element
 * - M positive: causes tension in bottom fiber (sagging)
 */
export function calculateBeamInternalForces(
  element: IBeamElement,
  n1: INode,
  n2: INode,
  material: IMaterial,
  globalDisplacements: number[]
): IBeamForces {
  const L = calculateBeamLength(n1, n2);
  const angle = calculateBeamAngle(n1, n2);

  // Transform global displacements to local coordinates
  const localDisp = transformGlobalToLocal(globalDisplacements, angle);

  // Get distributed loads (in local coordinates)
  const qx = element.distributedLoad?.qx ?? 0;
  const qy = element.distributedLoad?.qy ?? 0;

  // Calculate local stiffness matrix
  const Kl = calculateBeamLocalStiffness(L, material.E, element.section.A, element.section.I);

  // Calculate local element forces from displacements: f_local = K_local * d_local
  const localForces = new Array(6).fill(0);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      localForces[i] += Kl.get(i, j) * localDisp[j];
    }
  }

  // Subtract equivalent nodal forces to get actual internal forces
  // K*d already includes the effect of distributed loads through the solver
  // (equivalent nodal forces were added to F before solving)
  // To get actual internal forces: f_internal = K*d - F_equiv
  const equivalentNodalForces = [
    qx * L / 2,           // Axial at node 1
    qy * L / 2,           // Shear at node 1
    qy * L * L / 12,      // Moment at node 1
    qx * L / 2,           // Axial at node 2
    qy * L / 2,           // Shear at node 2
    -qy * L * L / 12      // Moment at node 2
  ];

  // Internal forces = stiffness forces - equivalent nodal forces
  for (let i = 0; i < 6; i++) {
    localForces[i] -= equivalentNodalForces[i];
  }

  // End forces in element local coordinates
  // After subtracting equivalent nodal forces, localForces = K*d - F_equiv
  // Sign conventions for internal forces:
  // - V positive: causes clockwise rotation of element
  // - M positive: causes tension in bottom fiber (sagging)
  const N1 = localForces[0];   // Axial at node 1
  const V1 = localForces[1];   // Shear at node 1
  const M1 = -localForces[2];  // Moment at node 1 (sign flip for internal moment convention)
  const N2 = -localForces[3];  // Axial at node 2
  const V2 = -localForces[4];  // Shear at node 2
  const M2 = localForces[5];   // Moment at node 2

  // Generate stations along beam for diagram plotting
  const stations: number[] = [];
  const normalForce: number[] = [];
  const shearForce: number[] = [];
  const bendingMoment: number[] = [];

  for (let i = 0; i < NUM_STATIONS; i++) {
    const x = (i / (NUM_STATIONS - 1)) * L;
    stations.push(x);

    // N(x) - axial force (constant for no distributed axial load)
    // With distributed axial load: N(x) = N1 + qx * x
    const N_x = N1 + qx * x;
    normalForce.push(N_x);

    // V(x) - shear force
    // With distributed transverse load: V(x) = V1 + qy * x
    const V_x = V1 + qy * x;
    shearForce.push(V_x);

    // M(x) - bending moment
    // With distributed load: M(x) = M1 + V1*x + qy*x²/2
    const M_x = M1 + V1 * x + qy * x * x / 2;
    bendingMoment.push(M_x);
  }

  // Find maximum absolute values for scaling
  const maxN = Math.max(...normalForce.map(Math.abs), 1e-10);
  const maxV = Math.max(...shearForce.map(Math.abs), 1e-10);
  const maxM = Math.max(...bendingMoment.map(Math.abs), 1e-10);

  return {
    elementId: element.id,
    N1,
    V1,
    M1,
    N2,
    V2,
    M2,
    stations,
    normalForce,
    shearForce,
    bendingMoment,
    maxN,
    maxV,
    maxM
  };
}

/**
 * Calculate stress at a point in the beam cross-section
 *
 * @param N Normal force
 * @param M Bending moment
 * @param A Cross-sectional area
 * @param I Second moment of area
 * @param y Distance from neutral axis (positive = tension side for positive M)
 */
export function calculateBeamStress(
  N: number,
  M: number,
  A: number,
  I: number,
  y: number
): number {
  const sigma_axial = N / A;
  const sigma_bending = -M * y / I; // Negative because positive M causes compression at top (y > 0)
  return sigma_axial + sigma_bending;
}

/**
 * Calculate maximum stress in beam element (at extreme fibers)
 */
export function calculateMaxBeamStress(
  forces: IBeamForces,
  section: { A: number; I: number; h: number }
): { maxTension: number; maxCompression: number; location: { x: number; fiber: 'top' | 'bottom' } } {
  const y_top = section.h / 2;
  const y_bottom = -section.h / 2;

  let maxTension = -Infinity;
  let maxCompression = Infinity;
  let location = { x: 0, fiber: 'top' as 'top' | 'bottom' };

  for (let i = 0; i < forces.stations.length; i++) {
    const N = forces.normalForce[i];
    const M = forces.bendingMoment[i];

    const sigma_top = calculateBeamStress(N, M, section.A, section.I, y_top);
    const sigma_bottom = calculateBeamStress(N, M, section.A, section.I, y_bottom);

    if (sigma_top > maxTension) {
      maxTension = sigma_top;
      location = { x: forces.stations[i], fiber: 'top' };
    }
    if (sigma_bottom > maxTension) {
      maxTension = sigma_bottom;
      location = { x: forces.stations[i], fiber: 'bottom' };
    }
    if (sigma_top < maxCompression) {
      maxCompression = sigma_top;
    }
    if (sigma_bottom < maxCompression) {
      maxCompression = sigma_bottom;
    }
  }

  return { maxTension, maxCompression, location };
}

/**
 * Format force value for display
 */
export function formatForce(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(2)} MN`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(2)} kN`;
  } else {
    return `${value.toFixed(2)} N`;
  }
}

/**
 * Format moment value for display
 */
export function formatMoment(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(2)} MNm`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(2)} kNm`;
  } else {
    return `${value.toFixed(2)} Nm`;
  }
}

/**
 * Calculate reaction forces at supports for the entire frame
 */
export function calculateReactionForces(
  reactions: number[],
  nodeIdToIndex: Map<number, number>,
  nodes: Map<number, INode>,
  dofsPerNode: number
): Map<number, { Rx: number; Ry: number; Rm: number }> {
  const reactionMap = new Map<number, { Rx: number; Ry: number; Rm: number }>();

  for (const node of nodes.values()) {
    if (node.constraints.x || node.constraints.y || node.constraints.rotation) {
      const nodeIndex = nodeIdToIndex.get(node.id);
      if (nodeIndex === undefined) continue;

      const baseDof = nodeIndex * dofsPerNode;
      const Rx = node.constraints.x ? reactions[baseDof] : 0;
      const Ry = node.constraints.y ? reactions[baseDof + 1] : 0;
      const Rm = dofsPerNode === 3 && node.constraints.rotation ? reactions[baseDof + 2] : 0;

      reactionMap.set(node.id, { Rx, Ry, Rm });
    }
  }

  return reactionMap;
}
