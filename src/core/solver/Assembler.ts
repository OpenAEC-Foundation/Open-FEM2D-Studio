import { Matrix } from '../math/Matrix';
import { Mesh } from '../fem/Mesh';
import { AnalysisType } from '../fem/types';
import { calculateElementStiffness } from '../fem/Triangle';
import { calculateBeamGlobalStiffness, calculateDistributedLoadVector, calculatePartialDistributedLoadVector, transformLocalToGlobal, calculateBeamLength, calculateBeamAngle } from '../fem/Beam';

export function assembleGlobalStiffnessMatrix(
  mesh: Mesh,
  analysisType: AnalysisType
): Matrix {
  // For frame analysis, use 3 DOFs per node (u, v, θ)
  // For plane stress/strain, use 2 DOFs per node (u, v)
  const numNodes = mesh.getNodeCount();
  const dofsPerNode = analysisType === 'frame' ? 3 : 2;
  const numDofs = numNodes * dofsPerNode;

  const K = new Matrix(numDofs, numDofs);

  // Create node ID to index mapping
  const nodeIdToIndex = new Map<number, number>();
  let index = 0;
  for (const node of mesh.nodes.values()) {
    nodeIdToIndex.set(node.id, index);
    index++;
  }

  if (analysisType === 'frame') {
    // Assemble beam elements for frame analysis
    for (const beam of mesh.beamElements.values()) {
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;

      const material = mesh.getMaterial(beam.materialId);
      if (!material) continue;

      const [n1, n2] = nodes;

      try {
        const Ke = calculateBeamGlobalStiffness(n1, n2, material, beam.section);

        // Apply static condensation for end releases (hinges)
        if (beam.endReleases) {
          const releasedLocalDofs: number[] = [];
          if (beam.endReleases.startMoment) releasedLocalDofs.push(2); // θ1
          if (beam.endReleases.endMoment) releasedLocalDofs.push(5); // θ2

          if (releasedLocalDofs.length > 0) {
            // Apply static condensation: zero out rows and cols for released DOFs
            // and modify remaining stiffness
            applyEndReleases(Ke, releasedLocalDofs);
          }
        }

        // Get global DOF indices for this beam element
        const idx1 = nodeIdToIndex.get(n1.id)!;
        const idx2 = nodeIdToIndex.get(n2.id)!;
        const dofIndices = [
          idx1 * 3,     // u1
          idx1 * 3 + 1, // v1
          idx1 * 3 + 2, // θ1
          idx2 * 3,     // u2
          idx2 * 3 + 1, // v2
          idx2 * 3 + 2  // θ2
        ];

        // Assemble into global matrix
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) {
            K.addAt(dofIndices[i], dofIndices[j], Ke.get(i, j));
          }
        }
      } catch (e) {
        console.warn(`Skipping beam element ${beam.id}: ${e}`);
      }
    }
  } else {
    // Assemble triangle elements for plane stress/strain
    for (const element of mesh.elements.values()) {
      const nodes = mesh.getElementNodes(element);
      if (nodes.length !== 3) continue;

      const material = mesh.getMaterial(element.materialId);
      if (!material) continue;

      const [n1, n2, n3] = nodes;

      try {
        const Ke = calculateElementStiffness(
          n1, n2, n3,
          material,
          element.thickness,
          analysisType
        );

        // Get global DOF indices for this element
        const dofIndices: number[] = [];
        for (const node of nodes) {
          const nodeIndex = nodeIdToIndex.get(node.id)!;
          dofIndices.push(nodeIndex * 2);     // u
          dofIndices.push(nodeIndex * 2 + 1); // v
        }

        // Assemble into global matrix
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) {
            K.addAt(dofIndices[i], dofIndices[j], Ke.get(i, j));
          }
        }
      } catch (e) {
        console.warn(`Skipping element ${element.id}: ${e}`);
      }
    }
  }

  return K;
}

export function assembleForceVector(mesh: Mesh, analysisType: AnalysisType = 'plane_stress'): number[] {
  const numNodes = mesh.getNodeCount();
  const dofsPerNode = analysisType === 'frame' ? 3 : 2;
  const numDofs = numNodes * dofsPerNode;
  const F: number[] = new Array(numDofs).fill(0);

  // Create node ID to index mapping
  const nodeIdToIndex = new Map<number, number>();
  let index = 0;
  for (const node of mesh.nodes.values()) {
    nodeIdToIndex.set(node.id, index);
    index++;
  }

  // Add nodal forces
  for (const node of mesh.nodes.values()) {
    const nodeIndex = nodeIdToIndex.get(node.id)!;
    if (dofsPerNode === 3) {
      F[nodeIndex * 3] = node.loads.fx;
      F[nodeIndex * 3 + 1] = node.loads.fy;
      F[nodeIndex * 3 + 2] = node.loads.moment ?? 0;
    } else {
      F[nodeIndex * 2] = node.loads.fx;
      F[nodeIndex * 2 + 1] = node.loads.fy;
    }
  }

  // Add equivalent nodal forces from distributed loads on beams
  if (analysisType === 'frame') {
    for (const beam of mesh.beamElements.values()) {
      if (!beam.distributedLoad) continue;

      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;

      const [n1, n2] = nodes;
      const L = calculateBeamLength(n1, n2);
      const angle = calculateBeamAngle(n1, n2);

      let qx = beam.distributedLoad.qx;
      let qy = beam.distributedLoad.qy;
      const coordSystem = beam.distributedLoad.coordSystem ?? 'local';
      const startT = beam.distributedLoad.startT ?? 0;
      const endT = beam.distributedLoad.endT ?? 1;

      // If global coordinate system, project to local axes
      if (coordSystem === 'global') {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        // Transform global (qx_global, qy_global) to local (qx_local, qy_local)
        const qxLocal = qx * cos + qy * sin;
        const qyLocal = -qx * sin + qy * cos;
        qx = qxLocal;
        qy = qyLocal;
      }

      // Get equivalent nodal forces in local coordinates
      let localForces: number[];
      if (startT > 0 || endT < 1) {
        localForces = calculatePartialDistributedLoadVector(L, qx, qy, startT, endT);
      } else {
        localForces = calculateDistributedLoadVector(L, qx, qy);
      }

      // Transform to global coordinates
      const globalForces = transformLocalToGlobal(localForces, angle);

      // Add to force vector
      const idx1 = nodeIdToIndex.get(n1.id)!;
      const idx2 = nodeIdToIndex.get(n2.id)!;

      F[idx1 * 3] += globalForces[0];
      F[idx1 * 3 + 1] += globalForces[1];
      F[idx1 * 3 + 2] += globalForces[2];
      F[idx2 * 3] += globalForces[3];
      F[idx2 * 3 + 1] += globalForces[4];
      F[idx2 * 3 + 2] += globalForces[5];
    }
  }

  return F;
}

export function getConstrainedDofs(
  mesh: Mesh,
  analysisType: AnalysisType = 'plane_stress'
): { dofs: number[]; nodeIdToIndex: Map<number, number> } {
  const nodeIdToIndex = new Map<number, number>();
  let index = 0;
  for (const node of mesh.nodes.values()) {
    nodeIdToIndex.set(node.id, index);
    index++;
  }

  const dofsPerNode = analysisType === 'frame' ? 3 : 2;
  const dofs: number[] = [];

  for (const node of mesh.nodes.values()) {
    const nodeIndex = nodeIdToIndex.get(node.id)!;
    if (dofsPerNode === 3) {
      if (node.constraints.x) dofs.push(nodeIndex * 3);
      if (node.constraints.y) dofs.push(nodeIndex * 3 + 1);
      if (node.constraints.rotation) dofs.push(nodeIndex * 3 + 2);
    } else {
      if (node.constraints.x) dofs.push(nodeIndex * 2);
      if (node.constraints.y) dofs.push(nodeIndex * 2 + 1);
    }
  }

  return { dofs, nodeIdToIndex };
}

/**
 * Apply static condensation for beam end releases (hinges).
 * Modifies the stiffness matrix in place.
 * releasedDofs: indices of released DOFs in the 6x6 element matrix
 */
function applyEndReleases(Ke: Matrix, releasedDofs: number[]): void {
  const n = 6;
  const retained: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!releasedDofs.includes(i)) retained.push(i);
  }

  // Static condensation: K_rr - K_rc * K_cc^-1 * K_cr
  // For single DOF releases, this simplifies significantly
  for (const c of releasedDofs) {
    const kcc = Ke.get(c, c);
    if (Math.abs(kcc) < 1e-20) continue;

    // Modify retained entries: K_ij -= K_ic * K_cj / K_cc
    for (const i of retained) {
      for (const j of retained) {
        const kic = Ke.get(i, c);
        const kcj = Ke.get(c, j);
        Ke.addAt(i, j, -kic * kcj / kcc);
      }
    }

    // Zero out the released DOF row and column
    for (let i = 0; i < n; i++) {
      Ke.set(i, c, 0);
      Ke.set(c, i, 0);
    }
  }
}
