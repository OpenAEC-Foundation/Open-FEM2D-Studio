/**
 * Geometric Nonlinear Frame Solver
 *
 * Implements P-Delta analysis for second-order effects
 * Uses Newton-Raphson iteration for geometric nonlinearity
 */

import { Matrix } from '../math/Matrix';
import { Mesh } from '../fem/Mesh';
import { ISolverResult, IBeamForces, AnalysisType } from '../fem/types';
import {
  calculateBeamLength,
  calculateBeamAngle,
  calculateBeamLocalStiffness,
  createTransformationMatrix
} from '../fem/Beam';
import { calculateBeamInternalForces } from '../fem/BeamForces';
import { solveLinearSystem } from '../math/GaussElimination';

export interface NonlinearSolverOptions {
  analysisType: AnalysisType;
  geometricNonlinear: boolean;
  maxIterations: number;
  tolerance: number;
  loadSteps: number;
}

const DEFAULT_OPTIONS: NonlinearSolverOptions = {
  analysisType: 'frame',
  geometricNonlinear: false,
  maxIterations: 20,
  tolerance: 1e-6,
  loadSteps: 1
};

/**
 * Calculate geometric stiffness matrix for a beam element
 * This accounts for the P-Delta effect (second-order effects)
 */
function calculateGeometricStiffness(
  L: number,
  N: number  // Axial force (positive = tension)
): Matrix {
  const Kg = new Matrix(6, 6);

  const factor = N / L;

  // Geometric stiffness for transverse DOFs
  // Based on consistent geometric stiffness matrix
  const a = 6 / 5;
  const b = L / 10;
  const c = 2 * L * L / 15;
  const d = -L / 10;
  const e = -L * L / 30;

  // v1, v1
  Kg.set(1, 1, a * factor);
  // v1, θ1
  Kg.set(1, 2, b * factor);
  Kg.set(2, 1, b * factor);
  // v1, v2
  Kg.set(1, 4, -a * factor);
  Kg.set(4, 1, -a * factor);
  // v1, θ2
  Kg.set(1, 5, b * factor);
  Kg.set(5, 1, b * factor);

  // θ1, θ1
  Kg.set(2, 2, c * factor);
  // θ1, v2
  Kg.set(2, 4, d * factor);
  Kg.set(4, 2, d * factor);
  // θ1, θ2
  Kg.set(2, 5, e * factor);
  Kg.set(5, 2, e * factor);

  // v2, v2
  Kg.set(4, 4, a * factor);
  // v2, θ2
  Kg.set(4, 5, d * factor);
  Kg.set(5, 4, d * factor);

  // θ2, θ2
  Kg.set(5, 5, c * factor);

  return Kg;
}

/**
 * Assemble global stiffness matrix including geometric stiffness
 */
function assembleGlobalStiffnessWithGeometric(
  mesh: Mesh,
  axialForces: Map<number, number>,  // elementId -> N
  includeGeometric: boolean
): Matrix {
  const numNodes = mesh.getNodeCount();
  const numDofs = numNodes * 3;
  const K = new Matrix(numDofs, numDofs);

  // Create node ID to index mapping
  const nodeIdToIndex = new Map<number, number>();
  let index = 0;
  for (const node of mesh.nodes.values()) {
    nodeIdToIndex.set(node.id, index);
    index++;
  }

  for (const beam of mesh.beamElements.values()) {
    const nodes = mesh.getBeamElementNodes(beam);
    if (!nodes) continue;

    const material = mesh.getMaterial(beam.materialId);
    if (!material) continue;

    const [n1, n2] = nodes;
    const L = calculateBeamLength(n1, n2);
    const angle = calculateBeamAngle(n1, n2);

    if (L < 1e-10) continue;

    // Linear elastic stiffness
    const Kl = calculateBeamLocalStiffness(L, material.E, beam.section.A, beam.section.I);

    // Add geometric stiffness if requested
    if (includeGeometric) {
      const N = axialForces.get(beam.id) || 0;
      const Kg = calculateGeometricStiffness(L, N);

      // Add geometric stiffness to local stiffness
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          Kl.addAt(i, j, Kg.get(i, j));
        }
      }
    }

    // Transform to global
    const T = createTransformationMatrix(angle);
    const TT = T.transpose();
    const temp = Kl.multiply(T);
    const Ke = TT.multiply(temp);

    // Get DOF indices
    const idx1 = nodeIdToIndex.get(n1.id)!;
    const idx2 = nodeIdToIndex.get(n2.id)!;
    const dofIndices = [
      idx1 * 3, idx1 * 3 + 1, idx1 * 3 + 2,
      idx2 * 3, idx2 * 3 + 1, idx2 * 3 + 2
    ];

    // Assemble
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K.addAt(dofIndices[i], dofIndices[j], Ke.get(i, j));
      }
    }
  }

  return K;
}

/**
 * Assemble force vector from nodal loads and distributed loads
 */
function assembleForceVector(mesh: Mesh): number[] {
  const numNodes = mesh.getNodeCount();
  const F: number[] = new Array(numNodes * 3).fill(0);

  const nodeIdToIndex = new Map<number, number>();
  let index = 0;
  for (const node of mesh.nodes.values()) {
    nodeIdToIndex.set(node.id, index);
    index++;
  }

  // Nodal loads
  for (const node of mesh.nodes.values()) {
    const idx = nodeIdToIndex.get(node.id)!;
    F[idx * 3] = node.loads.fx;
    F[idx * 3 + 1] = node.loads.fy;
    F[idx * 3 + 2] = node.loads.moment || 0;
  }

  // Equivalent nodal forces from distributed loads
  for (const beam of mesh.beamElements.values()) {
    if (!beam.distributedLoad) continue;

    const nodes = mesh.getBeamElementNodes(beam);
    if (!nodes) continue;

    const [n1, n2] = nodes;
    const L = calculateBeamLength(n1, n2);
    const angle = calculateBeamAngle(n1, n2);

    const qx = beam.distributedLoad.qx;
    const qy = beam.distributedLoad.qy;

    // Equivalent nodal forces in local coordinates
    const fLocal = [
      qx * L / 2,
      qy * L / 2,
      qy * L * L / 12,
      qx * L / 2,
      qy * L / 2,
      -qy * L * L / 12
    ];

    // Transform to global
    const T = createTransformationMatrix(angle);
    const TT = T.transpose();
    const fGlobal = new Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        fGlobal[i] += TT.get(i, j) * fLocal[j];
      }
    }

    // Add to global force vector
    const idx1 = nodeIdToIndex.get(n1.id)!;
    const idx2 = nodeIdToIndex.get(n2.id)!;

    F[idx1 * 3] += fGlobal[0];
    F[idx1 * 3 + 1] += fGlobal[1];
    F[idx1 * 3 + 2] += fGlobal[2];
    F[idx2 * 3] += fGlobal[3];
    F[idx2 * 3 + 1] += fGlobal[4];
    F[idx2 * 3 + 2] += fGlobal[5];
  }

  return F;
}

/**
 * Apply boundary conditions using penalty method
 */
function applyBoundaryConditions(
  K: Matrix,
  F: number[],
  mesh: Mesh
): { K: Matrix; F: number[]; fixedDofs: number[] } {
  const Kmod = K.clone();
  const Fmod = [...F];
  const fixedDofs: number[] = [];

  const nodeIdToIndex = new Map<number, number>();
  let index = 0;
  for (const node of mesh.nodes.values()) {
    nodeIdToIndex.set(node.id, index);
    index++;
  }

  const penalty = 1e20;

  for (const node of mesh.nodes.values()) {
    const idx = nodeIdToIndex.get(node.id)!;

    if (node.constraints.x) {
      const dof = idx * 3;
      Kmod.set(dof, dof, Kmod.get(dof, dof) + penalty);
      Fmod[dof] = 0;
      fixedDofs.push(dof);
    }
    if (node.constraints.y) {
      const dof = idx * 3 + 1;
      Kmod.set(dof, dof, Kmod.get(dof, dof) + penalty);
      Fmod[dof] = 0;
      fixedDofs.push(dof);
    }
    if (node.constraints.rotation) {
      const dof = idx * 3 + 2;
      Kmod.set(dof, dof, Kmod.get(dof, dof) + penalty);
      Fmod[dof] = 0;
      fixedDofs.push(dof);
    }
  }

  return { K: Kmod, F: Fmod, fixedDofs };
}

/**
 * Calculate internal forces for all beam elements
 */
function calculateAllInternalForces(
  mesh: Mesh,
  displacements: number[]
): { beamForces: Map<number, IBeamForces>; axialForces: Map<number, number> } {
  const beamForces = new Map<number, IBeamForces>();
  const axialForces = new Map<number, number>();

  const nodeIdToIndex = new Map<number, number>();
  let index = 0;
  for (const node of mesh.nodes.values()) {
    nodeIdToIndex.set(node.id, index);
    index++;
  }

  for (const beam of mesh.beamElements.values()) {
    const nodes = mesh.getBeamElementNodes(beam);
    if (!nodes) continue;

    const material = mesh.getMaterial(beam.materialId);
    if (!material) continue;

    const [n1, n2] = nodes;
    const idx1 = nodeIdToIndex.get(n1.id)!;
    const idx2 = nodeIdToIndex.get(n2.id)!;

    const globalDisp = [
      displacements[idx1 * 3],
      displacements[idx1 * 3 + 1],
      displacements[idx1 * 3 + 2],
      displacements[idx2 * 3],
      displacements[idx2 * 3 + 1],
      displacements[idx2 * 3 + 2]
    ];

    const forces = calculateBeamInternalForces(beam, n1, n2, material, globalDisp);
    beamForces.set(beam.id, forces);

    // Average axial force for geometric stiffness
    axialForces.set(beam.id, (forces.N1 + forces.N2) / 2);
  }

  return { beamForces, axialForces };
}

/**
 * Main nonlinear solver using Newton-Raphson iteration
 */
export function solveNonlinear(
  mesh: Mesh,
  options: Partial<NonlinearSolverOptions> = {}
): ISolverResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate
  if (mesh.getNodeCount() < 2) {
    throw new Error('Model must have at least 2 nodes');
  }
  if (mesh.getBeamCount() < 1) {
    throw new Error('Model must have at least 1 beam element');
  }

  // Check for constraints
  let hasConstraints = false;
  for (const node of mesh.nodes.values()) {
    if (node.constraints.x || node.constraints.y || node.constraints.rotation) {
      hasConstraints = true;
      break;
    }
  }
  if (!hasConstraints) {
    throw new Error('Model has no constraints - add boundary conditions');
  }

  // Check for loads
  const F = assembleForceVector(mesh);
  const hasLoads = F.some(f => f !== 0);
  if (!hasLoads) {
    throw new Error('No loads applied - add forces to nodes');
  }

  const numDofs = mesh.getNodeCount() * 3;
  let displacements = new Array(numDofs).fill(0);
  let axialForces = new Map<number, number>();

  // For linear analysis, just solve once
  if (!opts.geometricNonlinear) {
    const K = assembleGlobalStiffnessWithGeometric(mesh, axialForces, false);
    const { K: Kbc, F: Fbc } = applyBoundaryConditions(K, F, mesh);
    displacements = solveLinearSystem(Kbc, Fbc);

    const { beamForces, axialForces: newAxial } = calculateAllInternalForces(mesh, displacements);
    axialForces = newAxial;

    // Calculate reactions
    const reactions = K.multiplyVector(displacements);
    for (let i = 0; i < reactions.length; i++) {
      reactions[i] = reactions[i] - F[i];
    }

    // Find max values for scaling
    let maxVonMises = 0;
    for (const forces of beamForces.values()) {
      maxVonMises = Math.max(maxVonMises, Math.abs(forces.maxM));
    }

    return {
      displacements,
      reactions,
      elementStresses: new Map(),
      beamForces,
      maxVonMises,
      minVonMises: 0
    };
  }

  // Nonlinear iteration (P-Delta analysis)
  for (let step = 1; step <= opts.loadSteps; step++) {
    const loadFactor = step / opts.loadSteps;
    const scaledF = F.map(f => f * loadFactor);

    for (let iter = 0; iter < opts.maxIterations; iter++) {
      // Assemble stiffness with current geometric stiffness
      const K = assembleGlobalStiffnessWithGeometric(mesh, axialForces, true);
      const { K: Kbc, F: Fbc } = applyBoundaryConditions(K, scaledF, mesh);

      // Calculate residual
      const internalForces = K.multiplyVector(displacements);
      const residual = Fbc.map((f, i) => f - internalForces[i]);

      // Check convergence
      const residualNorm = Math.sqrt(residual.reduce((sum, r) => sum + r * r, 0));
      const forceNorm = Math.sqrt(scaledF.reduce((sum, f) => sum + f * f, 0));

      if (residualNorm / (forceNorm + 1e-10) < opts.tolerance) {
        break;
      }

      // Solve for displacement increment
      const deltaU = solveLinearSystem(Kbc, residual);

      // Update displacements
      for (let i = 0; i < numDofs; i++) {
        displacements[i] += deltaU[i];
      }

      // Update axial forces
      const { axialForces: newAxial } = calculateAllInternalForces(mesh, displacements);
      axialForces = newAxial;
    }
  }

  // Final internal forces calculation
  const { beamForces } = calculateAllInternalForces(mesh, displacements);

  // Calculate reactions
  const K = assembleGlobalStiffnessWithGeometric(mesh, axialForces, opts.geometricNonlinear);
  const reactions = K.multiplyVector(displacements);
  for (let i = 0; i < reactions.length; i++) {
    reactions[i] = reactions[i] - F[i];
  }

  // Find max values
  let maxVonMises = 0;
  for (const forces of beamForces.values()) {
    maxVonMises = Math.max(maxVonMises, Math.abs(forces.maxM));
  }

  return {
    displacements,
    reactions,
    elementStresses: new Map(),
    beamForces,
    maxVonMises,
    minVonMises: 0
  };
}
