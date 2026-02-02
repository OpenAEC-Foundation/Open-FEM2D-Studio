// API route definitions for the FEM solver

export interface ApiSolveRequest {
  nodes: { id: number; x: number; y: number; constraints: any; loads: any }[];
  beamElements: { id: number; nodeIds: number[]; materialId: number; section: any }[];
  analysisType: string;
}

export interface ApiSolveResponse {
  success: boolean;
  displacements?: number[];
  reactions?: number[];
  beamForces?: any;
  error?: string;
}

export interface ApiModelResponse {
  success: boolean;
  model?: {
    nodes: number;
    beamElements: number;
    plateElements: number;
    materials: number;
    analysisType: string;
  };
  error?: string;
}

export interface ApiHealthResponse {
  status: string;
  version: string;
}

export interface ApiInfoResponse {
  name: string;
  version: string;
  endpoints: string[];
}
