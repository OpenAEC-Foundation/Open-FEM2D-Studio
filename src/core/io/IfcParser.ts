/**
 * Lightweight IFC STEP file parser.
 *
 * Extracts structural members (IfcBeam, IfcColumn, IfcSlab) with their
 * geometry from IFC2x3/IFC4 files.  This is NOT a full IFC parser -- it
 * handles the most common geometric representations used by structural
 * modelling tools (extruded area solids with I-shape or rectangular profiles).
 */

export interface IfcEntity {
  id: number;
  type: string;
  attributes: any[];
}

export interface IfcStructuralMember {
  type: 'beam' | 'column' | 'slab';
  name: string;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  profile?: {
    type: string;
    h?: number;
    b?: number;
    tw?: number;
    tf?: number;
    name?: string;
  };
}

// ── Tokenizer helpers ─────────────────────────────────────────────────

function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Parse the raw attribute string for an entity, handling nested parens
 * and quoted strings. Returns an array of tokens (strings or nested arrays).
 */
function parseAttributes(raw: string): any[] {
  const result: any[] = [];
  let depth = 0;
  let current = '';
  let inString = false;
  const stack: any[][] = [result];

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      current += ch;
      if (ch === "'") {
        // Check for escaped single-quote ''
        if (i + 1 < raw.length && raw[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }

    if (ch === '(') {
      if (depth > 0) {
        // Nested list – push a sub-array
        const sub: any[] = [];
        stack[stack.length - 1].push(sub);
        stack.push(sub);
      }
      depth++;
      continue;
    }

    if (ch === ')') {
      depth--;
      if (depth > 0) {
        if (current.trim()) {
          stack[stack.length - 1].push(parseToken(current.trim()));
          current = '';
        }
        stack.pop();
      }
      continue;
    }

    if (ch === ',' && depth === 1) {
      stack[stack.length - 1].push(parseToken(current.trim()));
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    stack[stack.length - 1].push(parseToken(current.trim()));
  }

  return result;
}

function parseToken(token: string): any {
  if (token === '$' || token === '*') return null;
  if (token === '.T.') return true;
  if (token === '.F.') return false;
  if (token.startsWith("'") && token.endsWith("'")) {
    return token.slice(1, -1);
  }
  if (token.startsWith('#')) {
    return { ref: parseInt(token.slice(1), 10) };
  }
  if (token.startsWith('.') && token.endsWith('.')) {
    return token.slice(1, -1); // enum
  }
  const num = Number(token);
  if (!isNaN(num) && token !== '') return num;
  return token;
}

// ── Entity map builder ────────────────────────────────────────────────

function buildEntityMap(content: string): Map<number, IfcEntity> {
  const map = new Map<number, IfcEntity>();
  const cleaned = stripComments(content);

  // Find the DATA section
  const dataStart = cleaned.indexOf('DATA;');
  const dataEnd = cleaned.indexOf('ENDSEC;', dataStart);
  if (dataStart === -1 || dataEnd === -1) return map;

  const dataSection = cleaned.substring(dataStart + 5, dataEnd);

  // Match entity lines: #123=IFCTYPE(...);
  const lineRe = /#(\d+)\s*=\s*([A-Z0-9_]+)\s*(\([\s\S]*?\))\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(dataSection)) !== null) {
    const id = parseInt(m[1], 10);
    const type = m[2].toUpperCase();
    const attrs = parseAttributes(m[3]);
    map.set(id, { id, type, attributes: attrs });
  }

  return map;
}

// ── Resolve helpers ───────────────────────────────────────────────────

function resolve(entities: Map<number, IfcEntity>, val: any): IfcEntity | null {
  if (val && typeof val === 'object' && 'ref' in val) {
    return entities.get(val.ref) || null;
  }
  return null;
}

function resolvePoint(entities: Map<number, IfcEntity>, ref: any): [number, number, number] {
  const pt = resolve(entities, ref);
  if (!pt) return [0, 0, 0];
  const coords = pt.attributes[0]; // IFCCARTESIANPOINT has Coordinates as first attr
  if (Array.isArray(coords)) {
    return [
      typeof coords[0] === 'number' ? coords[0] : 0,
      typeof coords[1] === 'number' ? coords[1] : 0,
      typeof coords[2] === 'number' ? coords[2] : 0,
    ];
  }
  // Flat list of coords in attributes
  return [
    typeof pt.attributes[0] === 'number' ? pt.attributes[0] : 0,
    typeof pt.attributes[1] === 'number' ? pt.attributes[1] : 0,
    typeof pt.attributes[2] === 'number' ? pt.attributes[2] : 0,
  ];
}

function resolveDirection(entities: Map<number, IfcEntity>, ref: any): [number, number, number] {
  const dir = resolve(entities, ref);
  if (!dir) return [0, 0, 1];
  const ratios = dir.attributes[0];
  if (Array.isArray(ratios)) {
    return [
      typeof ratios[0] === 'number' ? ratios[0] : 0,
      typeof ratios[1] === 'number' ? ratios[1] : 0,
      typeof ratios[2] === 'number' ? ratios[2] : 0,
    ];
  }
  return [
    typeof dir.attributes[0] === 'number' ? dir.attributes[0] : 0,
    typeof dir.attributes[1] === 'number' ? dir.attributes[1] : 0,
    typeof dir.attributes[2] === 'number' ? dir.attributes[2] : 0,
  ];
}

function resolveAxis2Placement3D(
  entities: Map<number, IfcEntity>,
  ref: any
): { origin: [number, number, number]; axis: [number, number, number]; refDir: [number, number, number] } {
  const placement = resolve(entities, ref);
  if (!placement) return { origin: [0, 0, 0], axis: [0, 0, 1], refDir: [1, 0, 0] };

  const origin = resolvePoint(entities, placement.attributes[0]);
  const axis = placement.attributes[1] ? resolveDirection(entities, placement.attributes[1]) : [0, 0, 1] as [number, number, number];
  const refDir = placement.attributes[2] ? resolveDirection(entities, placement.attributes[2]) : [1, 0, 0] as [number, number, number];

  return { origin, axis, refDir };
}

/** Resolve the local placement chain to a world-space origin. */
function resolveLocalPlacement(
  entities: Map<number, IfcEntity>,
  ref: any
): { origin: [number, number, number]; axis: [number, number, number]; refDir: [number, number, number] } {
  const lp = resolve(entities, ref);
  if (!lp || lp.type !== 'IFCLOCALPLACEMENT') return { origin: [0, 0, 0], axis: [0, 0, 1], refDir: [1, 0, 0] };

  // RelativePlacement (IfcAxis2Placement3D)
  const rel = resolveAxis2Placement3D(entities, lp.attributes[1]);

  // PlacementRelTo (parent placement, if any)
  if (lp.attributes[0]) {
    const parent = resolveLocalPlacement(entities, lp.attributes[0]);
    // Simple additive placement (ignoring rotation for now)
    rel.origin = [
      rel.origin[0] + parent.origin[0],
      rel.origin[1] + parent.origin[1],
      rel.origin[2] + parent.origin[2],
    ];
  }

  return rel;
}

// ── Geometry extraction ───────────────────────────────────────────────

function extractProfile(
  entities: Map<number, IfcEntity>,
  ref: any
): IfcStructuralMember['profile'] | undefined {
  const profile = resolve(entities, ref);
  if (!profile) return undefined;

  const type = profile.type;

  if (type === 'IFCISHAPEPROFILEDEF') {
    // Attrs: ProfileType, ProfileName, Position, OverallWidth, OverallDepth, WebThickness, FlangeThickness, FilletRadius
    return {
      type: 'I-shape',
      name: typeof profile.attributes[1] === 'string' ? profile.attributes[1] : undefined,
      b: typeof profile.attributes[3] === 'number' ? profile.attributes[3] * 1000 : undefined,
      h: typeof profile.attributes[4] === 'number' ? profile.attributes[4] * 1000 : undefined,
      tw: typeof profile.attributes[5] === 'number' ? profile.attributes[5] * 1000 : undefined,
      tf: typeof profile.attributes[6] === 'number' ? profile.attributes[6] * 1000 : undefined,
    };
  }

  if (type === 'IFCRECTANGLEPROFILEDEF') {
    // Attrs: ProfileType, ProfileName, Position, XDim, YDim
    return {
      type: 'rectangle',
      name: typeof profile.attributes[1] === 'string' ? profile.attributes[1] : undefined,
      b: typeof profile.attributes[3] === 'number' ? profile.attributes[3] * 1000 : undefined,
      h: typeof profile.attributes[4] === 'number' ? profile.attributes[4] * 1000 : undefined,
    };
  }

  if (type === 'IFCCIRCLEHOLLOWPROFILEDEF' || type === 'IFCCIRCLEPROFILEDEF') {
    const radius = typeof profile.attributes[3] === 'number' ? profile.attributes[3] * 1000 : 0;
    return {
      type: 'circle',
      name: typeof profile.attributes[1] === 'string' ? profile.attributes[1] : undefined,
      h: radius * 2,
      b: radius * 2,
    };
  }

  // Generic fallback
  return {
    type: type.replace('IFC', '').replace('PROFILEDEF', ''),
    name: typeof profile.attributes[1] === 'string' ? profile.attributes[1] : undefined,
  };
}

function extractExtrudedGeometry(
  entities: Map<number, IfcEntity>,
  repRef: any
): { depth: number; direction: [number, number, number]; profile?: IfcStructuralMember['profile'] } | null {
  const rep = resolve(entities, repRef);
  if (!rep) return null;

  // IfcProductDefinitionShape -> Representations list
  let items: any[] = [];
  if (rep.type === 'IFCPRODUCTDEFINITIONSHAPE') {
    const reps = rep.attributes[2]; // list of IfcRepresentation
    if (Array.isArray(reps)) {
      for (const rRef of reps) {
        const r = resolve(entities, rRef);
        if (r && r.type === 'IFCSHAPEREPRESENTATION') {
          const repItems = r.attributes[3];
          if (Array.isArray(repItems)) items.push(...repItems);
        }
      }
    }
  } else if (rep.type === 'IFCSHAPEREPRESENTATION') {
    const repItems = rep.attributes[3];
    if (Array.isArray(repItems)) items = repItems;
  }

  // Find IfcExtrudedAreaSolid in items
  for (const itemRef of items) {
    const item = resolve(entities, itemRef);
    if (!item) continue;

    if (item.type === 'IFCEXTRUDEDAREASOLID') {
      // Attrs: SweptArea, Position, ExtrudedDirection, Depth
      const profile = extractProfile(entities, item.attributes[0]);
      const direction = item.attributes[2] ? resolveDirection(entities, item.attributes[2]) : [0, 0, 1] as [number, number, number];
      const depth = typeof item.attributes[3] === 'number' ? item.attributes[3] : 1.0;
      return { depth, direction, profile };
    }

    // IfcMappedItem might wrap the geometry
    if (item.type === 'IFCMAPPEDITEM') {
      const source = resolve(entities, item.attributes[0]);
      if (source && source.type === 'IFCREPRESENTATIONMAP') {
        const mappedRep = resolve(entities, source.attributes[1]);
        if (mappedRep) {
          const nested = extractExtrudedGeometry(entities, { ref: mappedRep.id });
          if (nested) return nested;
        }
      }
    }
  }

  return null;
}

// ── Main parse function ───────────────────────────────────────────────

export function parseIfcFile(content: string): IfcStructuralMember[] {
  const entities = buildEntityMap(content);
  const members: IfcStructuralMember[] = [];

  const structuralTypes: Record<string, 'beam' | 'column' | 'slab'> = {
    'IFCBEAM': 'beam',
    'IFCCOLUMN': 'column',
    'IFCSLAB': 'slab',
    'IFCBEAMSTANDARDCASE': 'beam',
    'IFCCOLUMNSTANDARDCASE': 'column',
    'IFCSLABSTANDARDCASE': 'slab',
    'IFCMEMBER': 'beam',
    'IFCMEMBERSTANDARDCASE': 'beam',
  };

  for (const entity of entities.values()) {
    const memberType = structuralTypes[entity.type];
    if (!memberType) continue;

    // IfcBuildingElement attributes: GlobalId, OwnerHistory, Name, Description, ObjectType, ObjectPlacement, Representation, Tag
    const name = typeof entity.attributes[2] === 'string' ? entity.attributes[2] : `${memberType}_${entity.id}`;
    const placementRef = entity.attributes[5];
    const representationRef = entity.attributes[6];

    // Resolve placement to get start point
    const placement = resolveLocalPlacement(entities, placementRef);
    const startPoint = placement.origin;

    // Try to extract extrusion geometry
    const geo = extractExtrudedGeometry(entities, representationRef);

    let endPoint: [number, number, number];
    let profile = geo?.profile;

    if (geo) {
      const depth = geo.depth;
      const axis = placement.axis;

      // For beams/columns the extrusion is usually along the local Z axis
      // which maps to the placement axis direction
      endPoint = [
        startPoint[0] + axis[0] * depth,
        startPoint[1] + axis[1] * depth,
        startPoint[2] + axis[2] * depth,
      ];
    } else {
      // Fallback: assume 1m length along axis direction
      endPoint = [
        startPoint[0] + placement.axis[0],
        startPoint[1] + placement.axis[1],
        startPoint[2] + placement.axis[2],
      ];
    }

    members.push({
      type: memberType,
      name,
      startPoint,
      endPoint,
      profile,
    });
  }

  return members;
}
