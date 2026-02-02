/**
 * DKT (Discrete Kirchhoff Triangle) plate bending element.
 *
 * Based on: Batoz, Bathe & Ho (1980) — "A study of three-node triangular
 * plate bending elements", Int. J. Num. Methods Eng.
 *
 * DOFs per node: w (deflection), θx (= ∂w/∂y), θy (= −∂w/∂x)
 * Element size: 9×9 stiffness matrix
 */

import { Matrix } from '../math/Matrix';
import { INode, IMaterial } from './types';
import { calculateTriangleArea } from './Triangle';

// ── Bending constitutive matrix ───────────────────────────────────────────

/**
 * Plate bending constitutive (flexural rigidity) matrix Db (3×3).
 * Db = E·t³ / (12·(1−ν²)) × [[1,ν,0],[ν,1,0],[0,0,(1−ν)/2]]
 */
export function getBendingConstitutiveMatrix(material: IMaterial, thickness: number): Matrix {
  const E = material.E;
  const nu = material.nu;
  const t = thickness;
  const factor = E * t * t * t / (12 * (1 - nu * nu));

  const Db = new Matrix(3, 3);
  Db.set(0, 0, factor);
  Db.set(0, 1, factor * nu);
  Db.set(1, 0, factor * nu);
  Db.set(1, 1, factor);
  Db.set(2, 2, factor * (1 - nu) / 2);
  return Db;
}

// ── Side parameters ───────────────────────────────────────────────────────

interface SideParams {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

/**
 * Compute side parameters for DKT element.
 * Side k goes from node i to node j.
 */
function computeSideParams(xi: number, yi: number, xj: number, yj: number): SideParams {
  const xij = xi - xj;
  const yij = yi - yj;
  const lk2 = xij * xij + yij * yij;

  return {
    a: -xij / lk2,
    b: 0.75 * xij * yij / lk2,
    c: (0.25 * xij * xij - 0.5 * yij * yij) / lk2,
    d: -yij / lk2,
    e: (0.25 * yij * yij - 0.5 * xij * xij) / lk2,
  };
}

// ── DKT B-matrix ──────────────────────────────────────────────────────────

/**
 * Compute the DKT B-matrix (3×9) at given area coordinates (L1, L2, L3).
 *
 * Rows: κ_x, κ_y, κ_xy
 * Columns: w1, θx1, θy1, w2, θx2, θy2, w3, θx3, θy3
 */
export function computeDKTBMatrix(
  n1: INode,
  n2: INode,
  n3: INode,
  L1: number,
  L2: number,
  L3: number
): Matrix {
  const x1 = n1.x, y1 = n1.y;
  const x2 = n2.x, y2 = n2.y;
  const x3 = n3.x, y3 = n3.y;

  // Side 4: 1→2,  Side 5: 2→3,  Side 6: 3→1
  const s4 = computeSideParams(x1, y1, x2, y2);
  const s5 = computeSideParams(x2, y2, x3, y3);
  const s6 = computeSideParams(x3, y3, x1, y1);

  // Derivatives of area coordinate products (bubble functions on sides) w.r.t. L1, L2, L3
  // dP4/dL1 = 4*L2, dP4/dL2 = 4*L1, dP4/dL3 = 0
  // dP5/dL1 = 0,    dP5/dL2 = 4*L3, dP5/dL3 = 4*L2
  // dP6/dL1 = 4*L3, dP6/dL2 = 0,    dP6/dL3 = 4*L1

  const dP4_dL1 = 4 * L2;
  const dP4_dL2 = 4 * L1;
  const dP4_dL3 = 0;
  const dP5_dL1 = 0;
  const dP5_dL2 = 4 * L3;
  const dP5_dL3 = 4 * L2;
  const dP6_dL1 = 4 * L3;
  const dP6_dL2 = 0;
  const dP6_dL3 = 4 * L1;

  // Derivatives of Hx w.r.t. L1, L2, L3
  const dHx_dL1 = [
    1.5 * (s6.a * dP6_dL1 - s4.a * dP4_dL1),
    s6.b * dP6_dL1 + s4.b * dP4_dL1,
    1 - s6.c * dP6_dL1 - s4.c * dP4_dL1,
    1.5 * (s4.a * dP4_dL1 - s5.a * dP5_dL1),
    s4.b * dP4_dL1 + s5.b * dP5_dL1,
    -s4.c * dP4_dL1 - s5.c * dP5_dL1,
    1.5 * (s5.a * dP5_dL1 - s6.a * dP6_dL1),
    s5.b * dP5_dL1 + s6.b * dP6_dL1,
    -s5.c * dP5_dL1 - s6.c * dP6_dL1,
  ];
  const dHx_dL2 = [
    1.5 * (s6.a * dP6_dL2 - s4.a * dP4_dL2),
    s6.b * dP6_dL2 + s4.b * dP4_dL2,
    -s6.c * dP6_dL2 - s4.c * dP4_dL2,
    1.5 * (s4.a * dP4_dL2 - s5.a * dP5_dL2),
    s4.b * dP4_dL2 + s5.b * dP5_dL2,
    1 - s4.c * dP4_dL2 - s5.c * dP5_dL2,
    1.5 * (s5.a * dP5_dL2 - s6.a * dP6_dL2),
    s5.b * dP5_dL2 + s6.b * dP6_dL2,
    -s5.c * dP5_dL2 - s6.c * dP6_dL2,
  ];
  const dHx_dL3 = [
    1.5 * (s6.a * dP6_dL3 - s4.a * dP4_dL3),
    s6.b * dP6_dL3 + s4.b * dP4_dL3,
    -s6.c * dP6_dL3 - s4.c * dP4_dL3,
    1.5 * (s4.a * dP4_dL3 - s5.a * dP5_dL3),
    s4.b * dP4_dL3 + s5.b * dP5_dL3,
    -s4.c * dP4_dL3 - s5.c * dP5_dL3,
    1.5 * (s5.a * dP5_dL3 - s6.a * dP6_dL3),
    s5.b * dP5_dL3 + s6.b * dP6_dL3,
    1 - s5.c * dP5_dL3 - s6.c * dP6_dL3,
  ];

  // Derivatives of Hy w.r.t. L1, L2, L3
  const dHy_dL1 = [
    1.5 * (s6.d * dP6_dL1 - s4.d * dP4_dL1),
    -1 + s6.e * dP6_dL1 + s4.e * dP4_dL1,
    -s6.b * dP6_dL1 - s4.b * dP4_dL1,
    1.5 * (s4.d * dP4_dL1 - s5.d * dP5_dL1),
    s4.e * dP4_dL1 + s5.e * dP5_dL1,
    -s4.b * dP4_dL1 - s5.b * dP5_dL1,
    1.5 * (s5.d * dP5_dL1 - s6.d * dP6_dL1),
    s5.e * dP5_dL1 + s6.e * dP6_dL1,
    -s5.b * dP5_dL1 - s6.b * dP6_dL1,
  ];
  const dHy_dL2 = [
    1.5 * (s6.d * dP6_dL2 - s4.d * dP4_dL2),
    s6.e * dP6_dL2 + s4.e * dP4_dL2,
    -s6.b * dP6_dL2 - s4.b * dP4_dL2,
    1.5 * (s4.d * dP4_dL2 - s5.d * dP5_dL2),
    -1 + s4.e * dP4_dL2 + s5.e * dP5_dL2,
    -s4.b * dP4_dL2 - s5.b * dP5_dL2,
    1.5 * (s5.d * dP5_dL2 - s6.d * dP6_dL2),
    s5.e * dP5_dL2 + s6.e * dP6_dL2,
    -s5.b * dP5_dL2 - s6.b * dP6_dL2,
  ];
  const dHy_dL3 = [
    1.5 * (s6.d * dP6_dL3 - s4.d * dP4_dL3),
    s6.e * dP6_dL3 + s4.e * dP4_dL3,
    -s6.b * dP6_dL3 - s4.b * dP4_dL3,
    1.5 * (s4.d * dP4_dL3 - s5.d * dP5_dL3),
    s4.e * dP4_dL3 + s5.e * dP5_dL3,
    -s4.b * dP4_dL3 - s5.b * dP5_dL3,
    1.5 * (s5.d * dP5_dL3 - s6.d * dP6_dL3),
    -1 + s5.e * dP5_dL3 + s6.e * dP6_dL3,
    -s5.b * dP5_dL3 - s6.b * dP6_dL3,
  ];

  // Chain rule: transform from area coordinates to x,y
  // Using Jacobian inverse coefficients:
  const area2 = 2 * calculateTriangleArea(n1, n2, n3);
  const y23 = y2 - y3;
  const y31 = y3 - y1;
  const y12 = y1 - y2;
  const x32 = x3 - x2;
  const x13 = x1 - x3;
  const x21 = x2 - x1;

  const invArea2 = 1 / area2;

  // B-matrix (3×9): [dHx/dx; dHy/dy; dHx/dy + dHy/dx]
  const Bb = new Matrix(3, 9);

  for (let j = 0; j < 9; j++) {
    // dHx/dx = (1/2A) * (y23 * dHx/dL1 + y31 * dHx/dL2 + y12 * dHx/dL3)
    const dHx_dx = invArea2 * (y23 * dHx_dL1[j] + y31 * dHx_dL2[j] + y12 * dHx_dL3[j]);
    // dHx/dy = (1/2A) * (x32 * dHx/dL1 + x13 * dHx/dL2 + x21 * dHx/dL3)
    const dHx_dy = invArea2 * (x32 * dHx_dL1[j] + x13 * dHx_dL2[j] + x21 * dHx_dL3[j]);
    // dHy/dx = (1/2A) * (y23 * dHy/dL1 + y31 * dHy/dL2 + y12 * dHy/dL3)
    const dHy_dx = invArea2 * (y23 * dHy_dL1[j] + y31 * dHy_dL2[j] + y12 * dHy_dL3[j]);
    // dHy/dy = (1/2A) * (x32 * dHy/dL1 + x13 * dHy/dL2 + x21 * dHy/dL3)
    const dHy_dy = invArea2 * (x32 * dHy_dL1[j] + x13 * dHy_dL2[j] + x21 * dHy_dL3[j]);

    // κ_x  = dHx/dx    (curvature in x)
    Bb.set(0, j, dHx_dx);
    // κ_y  = dHy/dy    (curvature in y)
    Bb.set(1, j, dHy_dy);
    // κ_xy = dHx/dy + dHy/dx  (twist)
    Bb.set(2, j, dHx_dy + dHy_dx);
  }

  return Bb;
}

// ── Gauss integration points on triangle ──────────────────────────────────

const GAUSS_POINTS = [
  { L1: 2 / 3, L2: 1 / 6, L3: 1 / 6, w: 1 / 3 },
  { L1: 1 / 6, L2: 2 / 3, L3: 1 / 6, w: 1 / 3 },
  { L1: 1 / 6, L2: 1 / 6, L3: 2 / 3, w: 1 / 3 },
];

// ── Element stiffness matrix ──────────────────────────────────────────────

/**
 * Calculate the 9×9 DKT element stiffness matrix.
 * Ke = A · Σ(w_gp · Bb^T · Db · Bb)
 */
export function calculateDKTStiffness(
  n1: INode,
  n2: INode,
  n3: INode,
  material: IMaterial,
  thickness: number
): Matrix {
  const A = calculateTriangleArea(n1, n2, n3);
  if (A < 1e-12) {
    throw new Error('DKT triangle has zero or negative area');
  }

  const Db = getBendingConstitutiveMatrix(material, thickness);
  const Ke = new Matrix(9, 9);

  for (const gp of GAUSS_POINTS) {
    const Bb = computeDKTBMatrix(n1, n2, n3, gp.L1, gp.L2, gp.L3);
    const BbT = Bb.transpose(); // 9×3
    const BbTDb = BbT.multiply(Db); // 9×3
    const BbTDbBb = BbTDb.multiply(Bb); // 9×9

    const scale = A * gp.w;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        Ke.addAt(i, j, scale * BbTDbBb.get(i, j));
      }
    }
  }

  return Ke;
}

// ── Element moments ───────────────────────────────────────────────────────

/**
 * Calculate bending moments at the centroid of the element.
 * m = Db · κ,  κ = Bb · u_elem
 *
 * Returns {mx, my, mxy} in N·m/m (moment per unit length).
 */
export function calculateElementMoments(
  n1: INode,
  n2: INode,
  n3: INode,
  material: IMaterial,
  thickness: number,
  elemDisp: number[]  // 9 DOFs: [w1, θx1, θy1, w2, θx2, θy2, w3, θx3, θy3]
): { mx: number; my: number; mxy: number } {
  // Evaluate at centroid: L1 = L2 = L3 = 1/3
  const Bb = computeDKTBMatrix(n1, n2, n3, 1 / 3, 1 / 3, 1 / 3);
  const Db = getBendingConstitutiveMatrix(material, thickness);

  // κ = Bb · u (3×1)
  const kappa = Bb.multiplyVector(elemDisp);

  // m = Db · κ (3×1)
  const m = Db.multiplyVector(kappa);

  return { mx: m[0], my: m[1], mxy: m[2] };
}
