/**
 * Steel Section Check — EN 1993-1-1
 * Cross-section resistance checks for beams under N, V, M.
 * Member buckling checks (6.3.1) and lateral torsional buckling (6.3.2).
 * Deflection check (SLS).
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
  Iz?: number;      // Second moment of area, weak axis (m⁴)
  It?: number;      // Torsion constant (m⁴)
  Iw?: number;      // Warping constant (m⁶)
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
  // Member stability checks (EN 1993-1-1 §6.3)
  UC_buckling: number;   // Member buckling check (6.3.1) — NEd / Nb,Rd
  NbRd: number;          // Buckling resistance (N)
  UC_LTB: number;        // Lateral torsional buckling check (6.3.2) — MEd / Mb,Rd
  MbRd: number;          // LTB resistance (Nm)
  // Deflection check (SLS)
  UC_deflection: number;      // Deflection unity check — delta / delta_limit
  deflectionActual: number;   // Actual max deflection (m)
  deflectionLimit: number;    // Allowable deflection (m)
  // Governing
  UC_max: number;   // Governing unity check
  // Status
  status: 'OK' | 'FAIL';
  governingCheck: string;
}

/** Imperfection factors alpha for buckling curves (EN 1993-1-1, Table 6.1) */
const BUCKLING_ALPHA: Record<string, number> = {
  a0: 0.13,
  a: 0.21,
  b: 0.34,
  c: 0.49,
  d: 0.76,
};

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
 * Av = A - 2*b*tf + (tw + 2*r)*tf  ~=  hw * tw  for hot-rolled I-sections
 */
function getShearArea(section: ISectionProperties): number {
  if (section.tw && section.h) {
    const twM = (section.tw ?? 0) / 1000; // mm -> m
    const tfM = (section.tf ?? 0) / 1000;
    const hw = section.h - 2 * tfM;
    // Simplified: Av = hw * tw (conservative)
    return Math.max(hw * twM, section.A * 0.5);
  }
  // Fallback: assume Av ~ A * h_web/h ~ 0.6*A for typical I-sections
  return section.A * 0.6;
}

/**
 * Get or approximate Iz (weak axis second moment of area)
 */
function getIz(section: ISectionProperties): number | null {
  if (section.Iz && section.Iz > 0) return section.Iz;
  // Approximate for I-sections if b and tf are known
  if (section.b && section.tf) {
    const bM = section.b / 1000; // mm -> m
    const tfM = section.tf / 1000;
    const twM = (section.tw ?? 0) / 1000;
    const hw = section.h - 2 * tfM;
    // Iz = 2*(tf*b^3/12) + hw*tw^3/12
    return 2 * (tfM * Math.pow(bM, 3) / 12) + hw * Math.pow(twM, 3) / 12;
  }
  return null;
}

/**
 * Get or approximate It (torsion constant)
 * For open thin-walled sections: It ~ sum(b*t^3/3)
 */
function getIt(section: ISectionProperties): number | null {
  if (section.It && section.It > 0) return section.It;
  if (section.b && section.tf && section.tw) {
    const bM = section.b / 1000;
    const tfM = section.tf / 1000;
    const twM = section.tw / 1000;
    const hw = section.h - 2 * tfM;
    // It = 2 * (b * tf^3 / 3) + hw * tw^3 / 3
    return 2 * (bM * Math.pow(tfM, 3) / 3) + hw * Math.pow(twM, 3) / 3;
  }
  return null;
}

/**
 * Get or approximate Iw (warping constant)
 * For doubly-symmetric I-sections: Iw = Iz * (h - tf)^2 / 4
 */
function getIw(section: ISectionProperties, Iz: number): number | null {
  if (section.Iw && section.Iw > 0) return section.Iw;
  if (section.tf) {
    const tfM = section.tf / 1000;
    return Iz * Math.pow(section.h - tfM, 2) / 4;
  }
  return null;
}

/**
 * Determine buckling curve for LTB based on h/b ratio (EN 1993-1-1, Table 6.4)
 * For rolled I-sections:
 * - h/b > 2: curve a (alpha_LT = 0.21)
 * - h/b <= 2: curve b (alpha_LT = 0.34)
 */
function getLTBucklingCurve(section: ISectionProperties): string {
  if (section.b && section.b > 0) {
    const hMm = section.h * 1000;
    const ratio = hMm / section.b;
    return ratio > 2 ? 'a' : 'b';
  }
  return 'b'; // conservative default
}

/**
 * Determine buckling curve for flexural buckling (EN 1993-1-1, Table 6.2)
 * Simplified: for rolled I-sections about strong axis
 * - h/b > 1.2, tf <= 40mm: curve a
 * - h/b > 1.2, tf > 40mm: curve b
 * - h/b <= 1.2, tf <= 100mm: curve b
 * - h/b <= 1.2, tf > 100mm: curve d
 */
function getFlexuralBucklingCurve(section: ISectionProperties): string {
  if (section.b && section.b > 0 && section.tf) {
    const hMm = section.h * 1000;
    const ratio = hMm / section.b;
    if (ratio > 1.2) {
      return section.tf <= 40 ? 'a' : 'b';
    } else {
      return section.tf <= 100 ? 'b' : 'd';
    }
  }
  return 'b'; // conservative default
}

/**
 * Calculate chi reduction factor for buckling (EN 1993-1-1, §6.3.1.2)
 * Phi = 0.5 * [1 + alpha*(lambda - 0.2) + lambda^2]
 * chi = 1 / (Phi + sqrt(Phi^2 - lambda^2))
 * chi <= 1.0
 */
function calculateChi(lambda: number, alpha: number): number {
  if (lambda <= 0.2) return 1.0;
  const phi = 0.5 * (1 + alpha * (lambda - 0.2) + lambda * lambda);
  const chi = 1 / (phi + Math.sqrt(phi * phi - lambda * lambda));
  return Math.min(chi, 1.0);
}

/**
 * Calculate member buckling resistance (EN 1993-1-1, §6.3.1)
 * Returns { NbRd, UC_buckling } or null if check is not applicable
 */
function checkMemberBuckling(
  section: ISectionProperties,
  NEd: number,
  beamLength: number,
  grade: ISteelGrade
): { NbRd: number; UC_buckling: number } {
  if (NEd <= 0 || beamLength <= 0) {
    return { NbRd: 0, UC_buckling: 0 };
  }

  const fy = grade.fy * 1e6; // MPa -> Pa
  const gammaM1 = grade.gammaM1;
  const E = 210e9; // Pa (steel)

  // Euler critical force about strong axis
  const Ncr = Math.PI * Math.PI * E * section.I / (beamLength * beamLength);

  if (Ncr <= 0) return { NbRd: 0, UC_buckling: 0 };

  // Non-dimensional slenderness
  const lambda = Math.sqrt(section.A * fy / Ncr);

  // Get buckling curve and imperfection factor
  const curve = getFlexuralBucklingCurve(section);
  const alpha = BUCKLING_ALPHA[curve] ?? 0.34;

  // Reduction factor
  const chi = calculateChi(lambda, alpha);

  // Buckling resistance
  const NbRd = chi * section.A * fy / gammaM1;

  const UC_buckling = NbRd > 0 ? NEd / NbRd : 0;

  return { NbRd, UC_buckling };
}

/**
 * Calculate lateral torsional buckling resistance (EN 1993-1-1, §6.3.2)
 * Returns { MbRd, UC_LTB } or { MbRd: 0, UC_LTB: 0 } if check is not applicable
 */
function checkLTB(
  section: ISectionProperties,
  MEd: number,
  beamLength: number,
  grade: ISteelGrade
): { MbRd: number; UC_LTB: number } {
  if (MEd <= 0 || beamLength <= 0) {
    return { MbRd: 0, UC_LTB: 0 };
  }

  const fy = grade.fy * 1e6; // MPa -> Pa
  const gammaM1 = grade.gammaM1;
  const E = 210e9; // Pa
  const G = 81e9;  // Pa (shear modulus for steel)

  // Get section properties for LTB
  const Iz = getIz(section);
  if (Iz === null || Iz <= 0) {
    return { MbRd: 0, UC_LTB: 0 }; // Insufficient data, skip LTB check
  }

  const It = getIt(section);
  if (It === null || It <= 0) {
    return { MbRd: 0, UC_LTB: 0 };
  }

  const Iw = getIw(section, Iz);
  if (Iw === null || Iw <= 0) {
    return { MbRd: 0, UC_LTB: 0 };
  }

  const Wy = getWel(section);

  // C1 = 1.0 for uniform moment distribution (conservative)
  // k = 1.0 for fork supports at both ends
  const C1 = 1.0;
  const k = 1.0;
  const kL = k * beamLength;

  // Elastic critical moment for LTB (simplified formula)
  // Mcr = C1 * (pi^2 * E * Iz) / (kL)^2 * sqrt(Iw/Iz + (kL)^2 * G * It / (pi^2 * E * Iz))
  const pi2EIz = Math.PI * Math.PI * E * Iz;
  const kL2 = kL * kL;
  const term1 = pi2EIz / kL2;
  const term2 = Math.sqrt(Iw / Iz + kL2 * G * It / pi2EIz);
  const Mcr = C1 * term1 * term2;

  if (Mcr <= 0) return { MbRd: 0, UC_LTB: 0 };

  // Non-dimensional slenderness for LTB
  const lambdaLT = Math.sqrt(Wy * fy / Mcr);

  // LTB buckling curve
  const curve = getLTBucklingCurve(section);
  const alphaLT = BUCKLING_ALPHA[curve] ?? 0.34;

  // LTB reduction factor
  // Phi_LT = 0.5 * [1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT^2]
  // chi_LT = 1 / (Phi_LT + sqrt(Phi_LT^2 - lambda_LT^2))
  const chiLT = calculateChi(lambdaLT, alphaLT);

  // LTB resistance
  const MbRd = chiLT * Wy * fy / gammaM1;

  const UC_LTB = MbRd > 0 ? MEd / MbRd : 0;

  return { MbRd, UC_LTB };
}

/**
 * Calculate deflection unity check (SLS)
 *
 * @param beamLength - Beam span length (m)
 * @param maxDeflection - Maximum vertical deflection (m), absolute value
 * @param limitDivisor - L/limitDivisor is the allowable deflection (default: 250 for permanent, 300 for variable)
 * @returns { UC_deflection, deflectionActual, deflectionLimit }
 */
export function checkDeflection(
  beamLength: number,
  maxDeflection: number,
  limitDivisor: number = 250
): { UC_deflection: number; deflectionActual: number; deflectionLimit: number } {
  if (beamLength <= 0 || limitDivisor <= 0) {
    return { UC_deflection: 0, deflectionActual: 0, deflectionLimit: 0 };
  }

  const deflectionLimit = beamLength / limitDivisor;
  const deflectionActual = Math.abs(maxDeflection);
  const UC_deflection = deflectionLimit > 0 ? deflectionActual / deflectionLimit : 0;

  return { UC_deflection, deflectionActual, deflectionLimit };
}

/**
 * Perform EN 1993-1-1 cross-section resistance checks
 * plus member stability checks (buckling, LTB) and deflection check
 */
export function checkSteelSection(
  section: ISectionProperties,
  beamForces: IBeamForces,
  grade: ISteelGrade,
  beamLength: number = 0,
  maxDeflection: number = 0,
  deflectionLimitDivisor: number = 250
): ISteelCheckResult {
  const fy = grade.fy * 1e6; // MPa -> Pa
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

  // Member buckling check (6.3.1) — only if compression and beam length known
  const { NbRd, UC_buckling } = (beamLength > 0 && NEd > 0)
    ? checkMemberBuckling(section, NEd, beamLength, grade)
    : { NbRd: 0, UC_buckling: 0 };

  // Lateral torsional buckling check (6.3.2) — only if moment and beam length known
  const { MbRd, UC_LTB } = (beamLength > 0 && MEd > 0)
    ? checkLTB(section, MEd, beamLength, grade)
    : { MbRd: 0, UC_LTB: 0 };

  // Deflection check (SLS)
  const { UC_deflection, deflectionActual, deflectionLimit } =
    checkDeflection(beamLength, maxDeflection, deflectionLimitDivisor);

  // Governing check
  const checks: [number, string][] = [
    [UC_N, 'Axial (6.2.4)'],
    [UC_V, 'Shear (6.2.6)'],
    [UC_M, 'Bending (6.2.5)'],
    [UC_MN, 'M+N (6.2.8)'],
    [UC_MV, 'M+V (6.2.10)'],
  ];

  // Add buckling check only if it was performed (NbRd > 0)
  if (UC_buckling > 0) {
    checks.push([UC_buckling, 'Buckling (6.3.1)']);
  }

  // Add LTB check only if it was performed (MbRd > 0)
  if (UC_LTB > 0) {
    checks.push([UC_LTB, 'LTB (6.3.2)']);
  }

  // Add deflection check only if it was performed
  if (UC_deflection > 0) {
    checks.push([UC_deflection, 'Deflection (SLS)']);
  }

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
    UC_buckling,
    NbRd,
    UC_LTB,
    MbRd,
    UC_deflection,
    deflectionActual,
    deflectionLimit,
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
  grade: ISteelGrade,
  beamLengths?: Map<number, number>,
  beamDeflections?: Map<number, number>,
  deflectionLimitDivisor?: number
): ISteelCheckResult[] {
  const results: ISteelCheckResult[] = [];
  for (const [beamId, forces] of beamForces) {
    const section = sectionMap.get(beamId);
    if (!section) continue;
    const length = beamLengths?.get(beamId) ?? 0;
    const deflection = beamDeflections?.get(beamId) ?? 0;
    results.push(checkSteelSection(section, forces, grade, length, deflection, deflectionLimitDivisor ?? 250));
  }
  return results;
}
