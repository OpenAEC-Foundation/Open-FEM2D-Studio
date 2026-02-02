/**
 * Thermal load computation for CST (Constant Strain Triangle) elements.
 *
 * Equivalent nodal forces for a uniform temperature change ΔT:
 *   ε_thermal = [α·ΔT, α·ΔT, 0]^T
 *   F_thermal = t · A · B^T · D · ε_thermal
 */

import { INode, IMaterial, AnalysisType } from './types';
import { calculateTriangleArea, getStrainDisplacementMatrix, getConstitutiveMatrix } from './Triangle';

/**
 * Calculate equivalent nodal forces due to thermal loading on a CST element.
 * Returns array of 6 values: [fx1, fy1, fx2, fy2, fx3, fy3]
 */
export function calculateThermalNodalForces(
  n1: INode,
  n2: INode,
  n3: INode,
  material: IMaterial,
  thickness: number,
  deltaT: number,
  analysisType: AnalysisType
): number[] {
  const alpha = material.alpha ?? 12e-6; // default to steel
  const area = calculateTriangleArea(n1, n2, n3);
  const B = getStrainDisplacementMatrix(n1, n2, n3);
  const D = getConstitutiveMatrix(material, analysisType === 'plate_bending' ? 'plane_stress' : analysisType);

  // Thermal strain vector: [α·ΔT, α·ΔT, 0]
  const epsThermal = [alpha * deltaT, alpha * deltaT, 0];

  // D · ε_thermal → thermal stress (3×1)
  const sigma = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      sigma[i] += D.get(i, j) * epsThermal[j];
    }
  }

  // B^T · sigma → nodal forces (6×1)
  const Bt = B.transpose(); // 6×3
  const F = new Array(6).fill(0);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      F[i] += Bt.get(i, j) * sigma[j];
    }
  }

  // Scale by thickness × area
  const scale = thickness * area;
  for (let i = 0; i < 6; i++) {
    F[i] *= scale;
  }

  return F;
}
