declare module 'triangle-wasm' {
  interface TriangulateIO {
    pointlist: Float64Array | null;
    pointmarkerlist: Int32Array | null;
    trianglelist: Int32Array | null;
    segmentlist: Int32Array | null;
    segmentmarkerlist: Int32Array | null;
    holelist: Float64Array | null;
    regionlist: Float64Array | null;
    edgelist: Int32Array | null;
    edgemarkerlist: Int32Array | null;
    numberofpoints: number;
    numberoftriangles: number;
    numberofcorners: number;
    numberofsegments: number;
    numberofholes: number;
    numberofedges: number;
    ptr: number;
    destroy(all?: boolean): void;
  }

  interface TriangulateIOData {
    pointlist?: Float64Array;
    segmentlist?: Int32Array;
    holelist?: Float64Array;
    regionlist?: Float64Array;
    trianglelist?: Int32Array;
    pointmarkerlist?: Int32Array;
    segmentmarkerlist?: Int32Array;
  }

  interface SwitchesObj {
    pslg?: boolean;
    quiet?: boolean;
    quality?: number | boolean;
    area?: number | boolean;
    refine?: boolean;
    regionAttr?: boolean;
    convexHull?: boolean;
    ccdt?: boolean;
    jettison?: boolean;
    edges?: boolean;
    neighbors?: boolean;
    quadratic?: boolean;
    bndMarkers?: boolean;
    holes?: boolean;
    steiner?: number;
  }

  function init(path?: string): Promise<void>;
  function triangulate(switches: SwitchesObj | string, input: TriangulateIO, output: TriangulateIO, vorout?: TriangulateIO | null): void;
  function makeIO(data?: TriangulateIOData): TriangulateIO;
  function freeIO(io: TriangulateIO, all?: boolean): void;
  function getSwitchesStr(obj: SwitchesObj | string, input: TriangulateIO, vorout?: TriangulateIO | null): string;

  export { init, triangulate, makeIO, freeIO, getSwitchesStr, TriangulateIO, TriangulateIOData, SwitchesObj };
}
