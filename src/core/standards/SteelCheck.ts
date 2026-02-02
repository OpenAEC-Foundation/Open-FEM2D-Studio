/**
 * Steel Section Check — EN 1993-1-1
 * Cross-section resistance checks for beams under N, V, M.
 */

import { ISteelGrade } from './EurocodeNL';
import { IBeamForces } from '../fem/types';

export interface ISectionProperties {
  A: number;        // Cross-section area (m²)
  I: number;        // Second moment of area (m⁴)
  h: number;        // Section height (m)
  Wel?: number;     // Elastic section modulus (m³)
  b?: number;       // Flange width (mm)
  tf?: number;      // Flange thickness (mm)
  tw?: number;      // Web thickness (mm)
  profileName?: string;
}

export interface ISteelCheckResult {
  elementId: number;
  profileName: string;
  steelGrade: string;
  // Design resistances
  NcRd: number;     // Axial compression resistance (N)
  NtRd: number;     // Axial tension resistance (N)
  VcRd: number;     // Shear resistance (N)
  McRd: number;     // Bending moment resistance (Nm)
  // Design internal forces (max values)
  NEd: number;      // Design axial force (N)
  VEd: number;      // Design shear force (N)
  MEd: number;      // Design bending moment (Nm)
  // Unity checks (UC = Ed / Rd, must be <= 1.0)
  UC_N: number;     // Axial unity check
  UC_V: number;     // Shear unity check
  UC_M: number;     // Bending unity check
  UC_MN: number;    // Combined M+N unity check
  UC_MV: number;    // Combined M+V unity check (reduced moment)
  UC_max: number;   // Governing unity check
  // Status
  status: 'OK' | 'FAIL';
  governingCheck: string;
}

/**
 * Calculate elastic section modulus from I and h if not provided
 */
function getWel(section: ISectionProperties): number {
  if (section.Wel && section.Wel > 0) return section.Wel;
  // Wel = I / (h/2)
  return section.I / (section.h / 2);
}

/**
 * Calculate shear area Av for I-section (EN 1993-1-1, 6.2.6)
 * Av = A - 2*b*tf + (tw + 2*r)*tf  ≈  hw * tw  for hot-rolled I-sections
 */
function getShearArea(section: ISectionProperties): number {
  if (section.tw && section.h) {
    const twM = (section.tw ?? 0) / 1000; // mm → m
    const tfM = (section.tf ?? 0) / 1000;
    const hw = section.h - 2 * tfM;
    // Simplified: Av = hw * tw (conservative)
    return Math.max(hw * twM, section.A * 0.5);
  }
  // Fallback: assume Av ≈ A * h_web/h ≈ 0.6*A for typical I-sections
  return section.A * 0.6;
}

/**
 * Perform EN 1993-1-1 cross-section resistance checks
 */
export function checkSteelSection(
  section: ISectionProperties,
  beamForces: IBeamForces,
  grade: ISteelGrade
): ISteelCheckResult {
  const fy = grade.fy * 1e6; // MPa → Pa
  const gammaM0 = grade.gammaM0;

  // Section properties
  const A = section.A;
  const Wel = getWel(section);
  const Av = getShearArea(section);

  // Design resistances (EN 1993-1-1)
  // 6.2.3 — Tension resistance
  const NtRd = (A * fy) / gammaM0;

  // 6.2.4 — Compression resistance (cross-section, no buckling)
  const NcRd = (A * fy) / gammaM0;

  // 6.2.5 — Bending resistance (elastic)
  const McRd = (Wel * fy) / gammaM0;

  // 6.2.6 — Shear resistance
  const VcRd = (Av * (fy / Math.sqrt(3))) / gammaM0;

  // Maximum design forces from beam analysis
  const NEd = Math.max(Math.abs(beamForces.maxN), Math.abs(beamForces.N1), Math.abs(beamForces.N2));
  const VEd = Math.max(Math.abs(beamForces.maxV), Math.abs(beamForces.V1), Math.abs(beamForces.V2));
  const MEd = Math.max(Math.abs(beamForces.maxM), Math.abs(beamForces.M1), Math.abs(beamForces.M2));

  // Unity checks
  const UC_N = NcRd > 0 ? NEd / NcRd : 0;
  const UC_V = VcRd > 0 ? VEd / VcRd : 0;
  const UC_M = McRd > 0 ? MEd / McRd : 0;

  // 6.2.8 — Combined bending and axial force
  // Simplified linear interaction: N/NRd + M/MRd <= 1.0
  const UC_MN = UC_N + UC_M;

  // 6.2.10 — Reduced bending resistance due to shear
  // If VEd > 0.5 * VcRd, reduce moment capacity
  let UC_MV = UC_M;
  if (VEd > 0.5 * VcRd) {
    const rho = Math.pow((2 * VEd / VcRd - 1), 2);
    const MvRd = McRd * (1 - rho);
    UC_MV = MvRd > 0 ? MEd / MvRd : 999;
  }

  // Governing check
  const checks: [number, string][] = [
    [UC_N, 'Axial (6.2.4)'],
    [UC_V, 'Shear (6.2.6)'],
    [UC_M, 'Bending (6.2.5)'],
    [UC_MN, 'M+N (6.2.8)'],
    [UC_MV, 'M+V (6.2.10)'],
  ];

  let UC_max = 0;
  let governingCheck = '';
  for (const [uc, name] of checks) {
    if (uc > UC_max) {
      UC_max = uc;
      governingCheck = name;
    }
  }

  return {
    elementId: beamForces.elementId,
    profileName: section.profileName || 'Unknown',
    steelGrade: grade.name,
    NcRd,
    NtRd,
    VcRd,
    McRd,
    NEd,
    VEd,
    MEd,
    UC_N,
    UC_V,
    UC_M,
    UC_MN,
    UC_MV,
    UC_max,
    status: UC_max <= 1.0 ? 'OK' : 'FAIL',
    governingCheck,
  };
}

/**
 * Run steel checks on all beam elements
 */
export function checkAllBeams(
  beamForces: Map<number, IBeamForces>,
  sectionMap: Map<number, ISectionProperties>,
  grade: ISteelGrade
): ISteelCheckResult[] {
  const results: ISteelCheckResult[] = [];
  for (const [beamId, forces] of beamForces) {
    const section = sectionMap.get(beamId);
    if (!section) continue;
    results.push(checkSteelSection(section, forces, grade));
  }
  return results;
}
