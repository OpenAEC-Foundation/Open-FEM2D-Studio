import { Matrix } from '../math/Matrix';
import { INode, IMaterial, IBeamSection } from './types';

/**
 * 2D Frame/Beam Element
 *
 * Each node has 3 DOFs: u (axial), v (transverse), θ (rotation)
 * Element stiffness matrix is 6x6 in local coordinates
 *
 * Local coordinate system:
 * - x-axis: along beam from node 1 to node 2
 * - y-axis: perpendicular, positive upward (90° counter-clockwise from x)
 *
 * Sign conventions:
 * - Positive N: tension
 * - Positive V: causes clockwise rotation
 * - Positive M: causes tension in bottom fiber (sagging)
 */

export function calculateBeamLength(n1: INode, n2: INode): number {
  const dx = n2.x - n1.x;
  const dy = n2.y - n1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateBeamAngle(n1: INode, n2: INode): number {
  const dx = n2.x - n1.x;
  const dy = n2.y - n1.y;
  return Math.atan2(dy, dx);
}

/**
 * Calculate the local stiffness matrix for a 2D beam element
 * Using Euler-Bernoulli beam theory
 *
 * DOF order: [u1, v1, θ1, u2, v2, θ2]
 */
export function calculateBeamLocalStiffness(
  L: number,
  E: number,
  A: number,
  I: number
): Matrix {
  const Ke = new Matrix(6, 6);

  const EA_L = E * A / L;
  const EI_L3 = E * I / (L * L * L);
  const EI_L2 = E * I / (L * L);
  const EI_L = E * I / L;

  // Axial stiffness terms
  Ke.set(0, 0, EA_L);
  Ke.set(0, 3, -EA_L);
  Ke.set(3, 0, -EA_L);
  Ke.set(3, 3, EA_L);

  // Bending stiffness terms
  // v1, v1
  Ke.set(1, 1, 12 * EI_L3);
  // v1, θ1
  Ke.set(1, 2, 6 * EI_L2);
  Ke.set(2, 1, 6 * EI_L2);
  // v1, v2
  Ke.set(1, 4, -12 * EI_L3);
  Ke.set(4, 1, -12 * EI_L3);
  // v1, θ2
  Ke.set(1, 5, 6 * EI_L2);
  Ke.set(5, 1, 6 * EI_L2);

  // θ1, θ1
  Ke.set(2, 2, 4 * EI_L);
  // θ1, v2
  Ke.set(2, 4, -6 * EI_L2);
  Ke.set(4, 2, -6 * EI_L2);
  // θ1, θ2
  Ke.set(2, 5, 2 * EI_L);
  Ke.set(5, 2, 2 * EI_L);

  // v2, v2
  Ke.set(4, 4, 12 * EI_L3);
  // v2, θ2
  Ke.set(4, 5, -6 * EI_L2);
  Ke.set(5, 4, -6 * EI_L2);

  // θ2, θ2
  Ke.set(5, 5, 4 * EI_L);

  return Ke;
}

/**
 * Create transformation matrix from local to global coordinates
 *
 * T transforms from local to global: {global} = [T] * {local}
 * T^T transforms from global to local: {local} = [T]^T * {global}
 */
export function createTransformationMatrix(angle: number): Matrix {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  const T = new Matrix(6, 6);

  // Node 1 transformation
  T.set(0, 0, c);
  T.set(0, 1, s);
  T.set(1, 0, -s);
  T.set(1, 1, c);
  T.set(2, 2, 1);

  // Node 2 transformation
  T.set(3, 3, c);
  T.set(3, 4, s);
  T.set(4, 3, -s);
  T.set(4, 4, c);
  T.set(5, 5, 1);

  return T;
}

/**
 * Calculate global stiffness matrix for a beam element
 * Kg = T^T * Kl * T
 */
export function calculateBeamGlobalStiffness(
  n1: INode,
  n2: INode,
  material: IMaterial,
  section: IBeamSection
): Matrix {
  const L = calculateBeamLength(n1, n2);
  const angle = calculateBeamAngle(n1, n2);

  if (L < 1e-10) {
    throw new Error('Beam element has zero length');
  }

  const Kl = calculateBeamLocalStiffness(L, material.E, section.A, section.I);
  const T = createTransformationMatrix(angle);

  // Kg = T^T * Kl * T
  const TT = T.transpose();
  const temp = Kl.multiply(T);
  const Kg = TT.multiply(temp);

  return Kg;
}

/**
 * Calculate equivalent nodal forces for uniformly distributed load
 * in local coordinates
 *
 * qx: distributed axial load (N/m)
 * qy: distributed transverse load (N/m), positive upward in local y
 */
export function calculateDistributedLoadVector(
  L: number,
  qx: number,
  qy: number
): number[] {
  // Local force vector: [Fx1, Fy1, M1, Fx2, Fy2, M2]
  return [
    qx * L / 2,           // Fx1
    qy * L / 2,           // Fy1
    qy * L * L / 12,      // M1
    qx * L / 2,           // Fx2
    qy * L / 2,           // Fy2
    -qy * L * L / 12      // M2
  ];
}

/**
 * Calculate equivalent nodal forces for a partial distributed load.
 * startT and endT are normalized positions (0 to 1) along the beam.
 */
export function calculatePartialDistributedLoadVector(
  L: number,
  qx: number,
  qy: number,
  startT: number,
  endT: number
): number[] {
  // Partial load from a*L to b*L
  const a = startT;
  const b = endT;
  const span = (b - a) * L;

  // For a uniform partial load from position a*L to b*L:
  // Using integration of load * shape functions
  const La = a * L;
  const Lb = b * L;

  // Equivalent nodal forces using Hermite shape function integration
  // N1(x) = 1 - 3(x/L)^2 + 2(x/L)^3
  // N2(x) = x(1 - x/L)^2
  // N3(x) = 3(x/L)^2 - 2(x/L)^3
  // N4(x) = x^2/L * (x/L - 1)

  // Integrate qy * Ni(x) from La to Lb for transverse direction
  const intN1 = integrate_N1(La, Lb, L);
  const intN2 = integrate_N2(La, Lb, L);
  const intN3 = integrate_N3(La, Lb, L);
  const intN4 = integrate_N4(La, Lb, L);

  // For axial: linear shape functions
  const intL1 = span * (1 - (a + b) / 2); // integral of (1 - x/L) from La to Lb
  const intL2 = span * (a + b) / 2;       // integral of (x/L) from La to Lb

  return [
    qx * intL1,          // Fx1
    qy * intN1,          // Fy1
    qy * intN2,          // M1
    qx * intL2,          // Fx2
    qy * intN3,          // Fy2
    qy * intN4           // M2
  ];
}

// Hermite shape function integrals
function integrate_N1(a: number, b: number, L: number): number {
  // N1(x) = 1 - 3(x/L)^2 + 2(x/L)^3
  // Integral = x - (x/L)^3 * L + (x/L)^4 * L/2
  const eval_at = (x: number) => x - x*x*x/(L*L) + x*x*x*x/(2*L*L*L);
  return eval_at(b) - eval_at(a);
}

function integrate_N2(a: number, b: number, L: number): number {
  // N2(x) = x - 2x^2/L + x^3/L^2
  const eval_at = (x: number) => x*x/2 - 2*x*x*x/(3*L) + x*x*x*x/(4*L*L);
  return eval_at(b) - eval_at(a);
}

function integrate_N3(a: number, b: number, L: number): number {
  // N3(x) = 3(x/L)^2 - 2(x/L)^3
  const eval_at = (x: number) => x*x*x/(L*L) - x*x*x*x/(2*L*L*L);
  return eval_at(b) - eval_at(a);
}

function integrate_N4(a: number, b: number, L: number): number {
  // N4(x) = -x^2/L + x^3/L^2
  const eval_at = (x: number) => -x*x*x/(3*L) + x*x*x*x/(4*L*L);
  return eval_at(b) - eval_at(a);
}

/**
 * Transform local forces to global coordinates
 */
export function transformLocalToGlobal(localForces: number[], angle: number): number[] {
  const T = createTransformationMatrix(angle);
  const TT = T.transpose();

  // Global = T^T * Local
  const result = new Array(6).fill(0);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      result[i] += TT.get(i, j) * localForces[j];
    }
  }
  return result;
}

/**
 * Transform global displacements to local coordinates
 */
export function transformGlobalToLocal(globalDisp: number[], angle: number): number[] {
  const T = createTransformationMatrix(angle);

  // Local = T * Global
  const result = new Array(6).fill(0);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      result[i] += T.get(i, j) * globalDisp[j];
    }
  }
  return result;
}

/**
 * Common beam sections
 */
export const DEFAULT_SECTIONS: { name: string; section: IBeamSection }[] = [
  {
    name: 'IPE 100',
    section: { A: 10.3e-4, I: 171e-8, h: 0.100 }
  },
  {
    name: 'IPE 200',
    section: { A: 28.5e-4, I: 1940e-8, h: 0.200 }
  },
  {
    name: 'IPE 300',
    section: { A: 53.8e-4, I: 8360e-8, h: 0.300 }
  },
  {
    name: 'HEA 100',
    section: { A: 21.2e-4, I: 349e-8, h: 0.096 }
  },
  {
    name: 'HEA 200',
    section: { A: 53.8e-4, I: 3690e-8, h: 0.190 }
  },
  {
    name: 'Rechthoek 100x200',
    section: { A: 0.02, I: 6.667e-5, h: 0.200 }  // b=100mm, h=200mm
  },
  {
    name: 'Rechthoek 200x400',
    section: { A: 0.08, I: 1.067e-3, h: 0.400 }  // b=200mm, h=400mm
  },
  {
    name: 'Buis 100x5',
    section: { A: 14.92e-4, I: 168e-8, h: 0.100 }  // D=100mm, t=5mm
  }
];

/**
 * Calculate section properties for rectangular section
 */
export function rectangularSection(b: number, h: number): IBeamSection {
  return {
    A: b * h,
    I: b * h * h * h / 12,
    h: h
  };
}

/**
 * Calculate section properties for circular tube
 */
export function tubularSection(D: number, t: number): IBeamSection {
  const r_outer = D / 2;
  const r_inner = r_outer - t;
  return {
    A: Math.PI * (r_outer * r_outer - r_inner * r_inner),
    I: Math.PI / 4 * (Math.pow(r_outer, 4) - Math.pow(r_inner, 4)),
    h: D
  };
}

/**
 * Calculate section properties for I-profile (simplified)
 */
export function iProfileSection(h: number, b: number, tw: number, tf: number): IBeamSection {
  // Web contribution
  const Aw = (h - 2 * tf) * tw;
  const Iw = tw * Math.pow(h - 2 * tf, 3) / 12;

  // Flange contributions (2 flanges)
  const Af = 2 * b * tf;
  const d = (h - tf) / 2; // distance from centroid to flange centroid
  const If = 2 * (b * Math.pow(tf, 3) / 12 + b * tf * d * d);

  return {
    A: Aw + Af,
    I: Iw + If,
    h: h
  };
}
