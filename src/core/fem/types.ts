export interface INode {
  id: number;
  x: number;
  y: number;
  constraints: {
    x: boolean;
    y: boolean;
    rotation: boolean;  // For frame analysis
  };
  loads: {
    fx: number;
    fy: number;
    moment: number;     // Applied moment (Nm)
  };
}

export interface IMaterial {
  id: number;
  name: string;
  E: number;      // Young's modulus (Pa)
  nu: number;     // Poisson's ratio
  rho: number;    // Density (kg/m³)
  color: string;  // Display color
}

export interface IElement {
  id: number;
  nodeIds: number[];
  materialId: number;
  thickness: number;
}

export interface ITriangleElement extends IElement {
  nodeIds: [number, number, number];
}

export interface IBeamSection {
  A: number;          // Cross-sectional area (m²)
  I: number;          // Second moment of area (m⁴)
  h: number;          // Height of section (m) - for stress calculation
}

// Point load on beam (at a specific position along the beam)
export interface IBeamPointLoad {
  id: number;
  beamId: number;       // Which beam this load is on
  position: number;     // Position along beam (0 to 1, where 0 = start node, 1 = end node)
  fx: number;           // Force in local x direction (N)
  fy: number;           // Force in local y direction (N)
  moment: number;       // Moment (Nm)
}

export interface IBeamElement extends IElement {
  nodeIds: [number, number];
  section: IBeamSection;
  profileName?: string;   // Display name of the profile (e.g. "IPE 200")
  // Distributed loads (local coordinates)
  distributedLoad?: {
    qx: number;       // Axial load (N/m)
    qy: number;       // Transverse load (N/m)
    startT?: number;  // Partial load start position (0-1), default 0
    endT?: number;    // Partial load end position (0-1), default 1
    coordSystem?: 'local' | 'global'; // Load direction, default 'local'
  };
  // Point loads on the beam (will cause automatic beam splitting)
  pointLoads?: IBeamPointLoad[];
  // Beam end releases (hinges)
  endReleases?: {
    startMoment: boolean;  // Release rotation at start node
    endMoment: boolean;    // Release rotation at end node
  };
}

export type ElementType = 'triangle' | 'beam';

export interface IMesh {
  nodes: Map<number, INode>;
  elements: Map<number, IElement>;
  materials: Map<number, IMaterial>;
}

export interface ISolverResult {
  displacements: number[];          // [u1, v1, u2, v2, ...] or [u1, v1, θ1, u2, v2, θ2, ...] for frames
  reactions: number[];              // Reaction forces at constrained DOFs
  elementStresses: Map<number, IElementStress>;
  beamForces: Map<number, IBeamForces>;  // Internal forces for beam elements
  maxVonMises: number;
  minVonMises: number;
}

export interface IBeamForces {
  elementId: number;
  // Forces at start node (local coordinates)
  N1: number;         // Axial force (positive = tension)
  V1: number;         // Shear force
  M1: number;         // Bending moment
  // Forces at end node (local coordinates)
  N2: number;
  V2: number;
  M2: number;
  // For diagram plotting - values along beam length
  stations: number[];           // Positions along beam (0 to L)
  normalForce: number[];        // N(x)
  shearForce: number[];         // V(x)
  bendingMoment: number[];      // M(x)
  // Maximum values for scaling
  maxN: number;
  maxV: number;
  maxM: number;
}

export interface IElementStress {
  elementId: number;
  sigmaX: number;   // Normal stress in x
  sigmaY: number;   // Normal stress in y
  tauXY: number;    // Shear stress
  vonMises: number; // Von Mises equivalent stress
  principalStresses: {
    sigma1: number;
    sigma2: number;
    angle: number;
  };
}

export type AnalysisType = 'plane_stress' | 'plane_strain' | 'frame';

export interface IAnalysisSettings {
  type: AnalysisType;
  scaleFactor: number;  // Deformation scale for visualization
}

export type Tool = 'select' | 'addNode' | 'addElement' | 'addBeam' | 'delete' | 'pan' | 'addLoad' | 'addConstraint'
  | 'addPinned' | 'addXRoller' | 'addZRoller' | 'addZSpring' | 'addRotSpring' | 'addXSpring' | 'addFixed'
  | 'addLineLoad';

export interface IViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface ISelection {
  nodeIds: Set<number>;
  elementIds: Set<number>;
  pointLoadNodeIds: Set<number>;    // nodes with selected point load
  distLoadBeamIds: Set<number>;     // beams with selected distributed load
}
