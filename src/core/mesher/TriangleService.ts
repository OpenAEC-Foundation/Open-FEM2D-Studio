/**
 * TriangleService — singleton wrapper around triangle-wasm (Shewchuk's Triangle)
 * Provides polygon triangulation for plate meshing.
 */

// triangle-wasm is a CJS module, imported dynamically
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let triangleLib: any = null;

let initPromise: Promise<void> | null = null;

/**
 * Lazy-load and initialize the WASM module (once).
 */
async function ensureInit(): Promise<void> {
  if (triangleLib) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const lib = await import('triangle-wasm');
    const mod = lib.default ?? lib;
    // The WASM file is served from public/
    const wasmPath = new URL('/triangle.out.wasm', window.location.origin).href;
    await mod.init(wasmPath);
    triangleLib = mod;
  })();

  return initPromise;
}

export interface TriangulateInput {
  outline: { x: number; y: number }[];
  voids?: { x: number; y: number }[][];
  maxArea?: number;
  minAngle?: number;
}

export interface TriangulateResult {
  points: { x: number; y: number }[];
  triangles: [number, number, number][];
  segments: [number, number][];
}

/**
 * Build a PSLG (Planar Straight Line Graph) from polygon outline + voids.
 * Returns flat arrays suitable for triangle-wasm IO.
 */
function buildPSLG(input: TriangulateInput): {
  pointlist: number[];
  segmentlist: number[];
  holelist: number[];
} {
  const pointlist: number[] = [];
  const segmentlist: number[] = [];
  const holelist: number[] = [];

  let ptOffset = 0;

  // Outline points and segments
  const outline = input.outline;
  for (const p of outline) {
    pointlist.push(p.x, p.y);
  }
  for (let i = 0; i < outline.length; i++) {
    const next = (i + 1) % outline.length;
    segmentlist.push(ptOffset + i, ptOffset + next);
  }
  ptOffset += outline.length;

  // Void polygons
  if (input.voids) {
    for (const voidPoly of input.voids) {
      for (const p of voidPoly) {
        pointlist.push(p.x, p.y);
      }
      for (let i = 0; i < voidPoly.length; i++) {
        const next = (i + 1) % voidPoly.length;
        segmentlist.push(ptOffset + i, ptOffset + next);
      }

      // Compute a point inside the void (centroid) to mark as hole
      const cx = voidPoly.reduce((s, p) => s + p.x, 0) / voidPoly.length;
      const cy = voidPoly.reduce((s, p) => s + p.y, 0) / voidPoly.length;
      holelist.push(cx, cy);

      ptOffset += voidPoly.length;
    }
  }

  return { pointlist, segmentlist, holelist };
}

/**
 * Triangulate a polygon with optional voids using Shewchuk's Triangle.
 */
export async function triangulatePolygon(input: TriangulateInput): Promise<TriangulateResult> {
  await ensureInit();

  const { pointlist, segmentlist, holelist } = buildPSLG(input);

  // Build input IO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputIO = triangleLib.makeIO({
    pointlist: new Float64Array(pointlist),
    segmentlist: new Int32Array(segmentlist),
    ...(holelist.length > 0 ? { holelist: new Float64Array(holelist) } : {}),
  });

  const outputIO = triangleLib.makeIO({});

  // Build switches string
  // p = PSLG, z = zero-indexed, Q = quiet, q = quality (min angle), a = area constraint
  const switches: {
    pslg: boolean;
    quiet: boolean;
    quality?: number;
    area?: number;
  } = {
    pslg: true,
    quiet: true,
  };

  if (input.minAngle !== undefined && input.minAngle > 0) {
    switches.quality = input.minAngle;
  } else {
    switches.quality = 20; // default min angle
  }

  if (input.maxArea !== undefined && input.maxArea > 0) {
    switches.area = input.maxArea;
  }

  try {
    triangleLib.triangulate(switches, inputIO, outputIO);

    // Read results
    const outPoints = outputIO.pointlist;
    const outTriangles = outputIO.trianglelist;
    const outSegments = outputIO.segmentlist;

    const points: { x: number; y: number }[] = [];
    if (outPoints) {
      for (let i = 0; i < outPoints.length; i += 2) {
        points.push({ x: outPoints[i], y: outPoints[i + 1] });
      }
    }

    const triangles: [number, number, number][] = [];
    if (outTriangles) {
      for (let i = 0; i < outTriangles.length; i += 3) {
        triangles.push([outTriangles[i], outTriangles[i + 1], outTriangles[i + 2]]);
      }
    }

    const segments: [number, number][] = [];
    if (outSegments) {
      for (let i = 0; i < outSegments.length; i += 2) {
        segments.push([outSegments[i], outSegments[i + 1]]);
      }
    }

    return { points, triangles, segments };
  } finally {
    // Free memory
    triangleLib.freeIO(inputIO, true);
    triangleLib.freeIO(outputIO);
  }
}
