/**
 * Concrete Section Check — EN 1992-1-1 (Simplified)
 * Bending reinforcement design for rectangular cross-sections.
 */

import { IBeamForces } from '../fem/types';

export interface IConcreteGrade {
  name: string;
  fck: number;      // Characteristic cylinder strength (MPa)
  fcd: number;      // Design compressive strength (MPa) = αcc * fck / γc
  fctm: number;     // Mean tensile strength (MPa)
  Ecm: number;      // Secant modulus (GPa)
}

export interface IReinforcementGrade {
  name: string;
  fyk: number;      // Characteristic yield strength (MPa)
  fyd: number;      // Design yield strength (MPa) = fyk / γs
  Es: number;       // Modulus (GPa)
}

export const CONCRETE_GRADES: IConcreteGrade[] = [
  { name: 'C20/25', fck: 20, fcd: 13.33, fctm: 2.2, Ecm: 30 },
  { name: 'C25/30', fck: 25, fcd: 16.67, fctm: 2.6, Ecm: 31 },
  { name: 'C30/37', fck: 30, fcd: 20.00, fctm: 2.9, Ecm: 33 },
  { name: 'C35/45', fck: 35, fcd: 23.33, fctm: 3.2, Ecm: 34 },
  { name: 'C40/50', fck: 40, fcd: 26.67, fctm: 3.5, Ecm: 35 },
  { name: 'C45/55', fck: 45, fcd: 30.00, fctm: 3.8, Ecm: 36 },
  { name: 'C50/60', fck: 50, fcd: 33.33, fctm: 4.1, Ecm: 37 },
];

export const REINFORCEMENT_GRADES: IReinforcementGrade[] = [
  { name: 'B500B', fyk: 500, fyd: 434.8, Es: 200 },
  { name: 'B500C', fyk: 500, fyd: 434.8, Es: 200 },
];

export interface IConcreteSection {
  b: number;        // Width (m)
  h: number;        // Height (m)
  d: number;        // Effective depth (m) = h - cover - φ/2
  cover: number;    // Concrete cover (mm)
}

export interface IConcreteCheckResult {
  elementId: number;
  // Design moment
  MEd: number;       // Design bending moment (Nm)
  VEd: number;       // Design shear force (N)
  // Bending reinforcement
  mu: number;        // μ = MEd / (b·d²·fcd) — dimensionless bending parameter
  omega: number;     // ω mechanical reinforcement ratio
  AsReq: number;     // Required reinforcement area (mm²)
  AsMin: number;     // Minimum reinforcement (mm²)
  AsProvided: string; // Suggested bar arrangement
  // Shear check
  VRdc: number;      // Concrete shear resistance (N) without reinforcement
  shearOk: boolean;  // VEd <= VRdc
  // Status
  UC_M: number;      // μ / 0.295 (ductility limit for NL)
  status: 'OK' | 'WARN' | 'FAIL';
  notes: string;
}

/**
 * Calculate required bending reinforcement (EN 1992-1-1, simplified rectangular)
 */
export function checkConcreteSection(
  section: IConcreteSection,
  beamForces: IBeamForces,
  concrete: IConcreteGrade,
  rebar: IReinforcementGrade
): IConcreteCheckResult {
  const { b, d } = section;
  const fcd = concrete.fcd * 1e6; // MPa → Pa
  const fyd = rebar.fyd * 1e6;

  const MEd = Math.max(Math.abs(beamForces.maxM), Math.abs(beamForces.M1), Math.abs(beamForces.M2));
  const VEd = Math.max(Math.abs(beamForces.maxV), Math.abs(beamForces.V1), Math.abs(beamForces.V2));

  // Dimensionless bending coefficient
  // μ = MEd / (b · d² · fcd)
  const mu = MEd / (b * d * d * fcd);

  // Mechanical reinforcement ratio (simplified for rectangular stress block)
  // ω = 1 - √(1 - 2μ)   (valid for μ ≤ 0.295 for ductile failure)
  let omega = 0;
  let notes = '';
  let status: 'OK' | 'WARN' | 'FAIL' = 'OK';

  if (mu > 0.295) {
    // Exceeds ductility limit — compression reinforcement needed
    omega = 0.295; // Cap at ductility limit
    status = 'FAIL';
    notes = 'μ > 0.295: Compression reinforcement required or increase section';
  } else if (mu > 0) {
    omega = 1 - Math.sqrt(1 - 2 * mu);
  }

  // Required reinforcement area
  // As = ω · b · d · fcd / fyd
  const AsReq = omega * b * d * fcd / fyd * 1e6; // → mm²

  // Minimum reinforcement (EN 1992-1-1, 9.2.1.1)
  // As,min = max(0.26 · fctm/fyk · b · d,  0.0013 · b · d)
  const fctm = concrete.fctm * 1e6;
  const fyk = rebar.fyk * 1e6;
  const AsMin = Math.max(0.26 * fctm / fyk * b * d, 0.0013 * b * d) * 1e6; // → mm²

  const AsDesign = Math.max(AsReq, AsMin);

  // Suggest bar arrangement
  const AsProvided = suggestBars(AsDesign);

  // Shear check without reinforcement (EN 1992-1-1, 6.2.2)
  // VRd,c = [CRd,c · k · (100 · ρl · fck)^(1/3)] · b · d
  const k = Math.min(1 + Math.sqrt(0.2 / d), 2.0); // Size effect factor
  const rhoL = Math.min(AsDesign * 1e-6 / (b * d), 0.02);
  const CRdc = 0.18 / 1.5; // γc = 1.5
  const vMin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(concrete.fck) * 1e6; // Pa
  const VRdc1 = CRdc * k * Math.pow(100 * rhoL * concrete.fck, 1 / 3) * 1e6 * b * d; // N
  const VRdc = Math.max(VRdc1, vMin * b * d);

  const shearOk = VEd <= VRdc;
  if (!shearOk && status === 'OK') {
    status = 'WARN';
    notes = notes || 'Shear reinforcement required (VEd > VRd,c)';
  }

  const UC_M = mu / 0.295;

  if (status === 'OK' && UC_M > 0.85) {
    status = 'WARN';
    notes = notes || 'High utilization — consider larger section';
  }

  return {
    elementId: beamForces.elementId,
    MEd,
    VEd,
    mu,
    omega,
    AsReq: Math.max(AsReq, 0),
    AsMin,
    AsProvided,
    VRdc,
    shearOk,
    UC_M,
    status,
    notes,
  };
}

/**
 * Suggest a bar arrangement for a given required area
 */
function suggestBars(asMm2: number): string {
  // Common bar areas: φ8=50, φ10=79, φ12=113, φ16=201, φ20=314, φ25=491, φ32=804
  const bars = [
    { dia: 8, area: 50.3 },
    { dia: 10, area: 78.5 },
    { dia: 12, area: 113.1 },
    { dia: 16, area: 201.1 },
    { dia: 20, area: 314.2 },
    { dia: 25, area: 490.9 },
    { dia: 32, area: 804.2 },
  ];

  // Find the smallest bar configuration
  for (const bar of bars) {
    const n = Math.ceil(asMm2 / bar.area);
    if (n <= 8) {
      return `${n}φ${bar.dia} (${(n * bar.area).toFixed(0)} mm²)`;
    }
  }
  return `As = ${asMm2.toFixed(0)} mm²`;
}
