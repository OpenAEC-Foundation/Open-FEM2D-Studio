/**
 * IFC-SPF (STEP Physical File) exporter for 2D structural analysis models.
 *
 * Exports the structural model (nodes, beam elements, supports, loads) to
 * IFC 2x3 / IFC4 structural analysis entities in STEP Physical File format.
 *
 * Reference: ISO 10303-21 (STEP) and ISO 16739 (IFC).
 */

import { Mesh } from '../fem/Mesh';
import { ILoadCase } from '../fem/LoadCase';
import type { IProjectInfo } from '../../context/FEMContext';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Pad a number to a fixed-width string with leading zeroes. */
function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** Format a Date into an IFC-compatible ISO 8601 timestamp. */
function isoTimestamp(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    pad2(d.getMonth() + 1) +
    '-' +
    pad2(d.getDate()) +
    'T' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes()) +
    ':' +
    pad2(d.getSeconds())
  );
}

/** Return a Unix-epoch timestamp (seconds) for an IFC IfcTimeStamp. */
function unixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Escape a plain string for IFC-SPF (single-quoted, backslash-escaped).
 * IFC-SPF uses '' to represent a literal single-quote inside a string.
 */
function ifcString(value: string): string {
  const escaped = value.replace(/'/g, "''");
  return "'" + escaped + "'";
}

/**
 * Format a floating point number for IFC output.
 * IFC-SPF requires a period as decimal separator and at least one decimal digit.
 */
function ifcReal(value: number): string {
  if (!Number.isFinite(value)) return '0.';
  // Use enough precision to not lose structural engineering data
  const s = value.toPrecision(10);
  // Ensure there is a decimal point
  if (!s.includes('.') && !s.includes('E') && !s.includes('e')) {
    return s + '.';
  }
  return s;
}

// ---------------------------------------------------------------------------
// Line counter / entity ID manager
// ---------------------------------------------------------------------------

class IfcWriter {
  private lines: string[] = [];
  private nextId = 1;

  /** Reserve and return the next entity ID (#N). */
  newId(): number {
    return this.nextId++;
  }

  /** Write an entity line and return the assigned id. */
  write(id: number, entity: string): number {
    this.lines.push(`#${id}=${entity};`);
    return id;
  }

  /** Convenience: allocate an id, write the entity, return the id. */
  add(entity: string): number {
    const id = this.newId();
    this.write(id, entity);
    return id;
  }

  /** Return all entity lines joined with line breaks. */
  getDataLines(): string {
    return this.lines.join('\n');
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export the structural analysis model to an IFC-SPF string.
 *
 * The resulting text conforms to the STEP Physical File format and can be
 * opened by IFC viewers that support structural analysis entities.
 *
 * @param mesh        - The FEM mesh containing nodes and beam elements.
 * @param projectInfo - Project metadata (name, engineer, company, etc.).
 * @param loadCases   - Array of load case definitions with point and distributed loads.
 * @returns           The full IFC file content as a string.
 */
export function exportToIfc(
  mesh: Mesh,
  projectInfo: IProjectInfo,
  loadCases: ILoadCase[]
): string {
  const w = new IfcWriter();
  const now = new Date();
  const ts = unixTimestamp();

  // -------------------------------------------------------------------
  // Shared geometric context entities
  // -------------------------------------------------------------------

  // IfcCartesianPoint (origin)
  const originId = w.add(`IFCCARTESIANPOINT((${ifcReal(0)},${ifcReal(0)},${ifcReal(0)}))`);

  // IfcDirection – Z axis (0,0,1)
  const dirZId = w.add(`IFCDIRECTION((${ifcReal(0)},${ifcReal(0)},${ifcReal(1)}))`);

  // IfcDirection – X axis (1,0,0)
  const dirXId = w.add(`IFCDIRECTION((${ifcReal(1)},${ifcReal(0)},${ifcReal(0)}))`);

  // IfcDirection – Y axis (0,1,0) — emitted for completeness in the IFC file
  w.add(`IFCDIRECTION((${ifcReal(0)},${ifcReal(1)},${ifcReal(0)}))`);

  // IfcAxis2Placement3D (world coordinate system)
  const wcsId = w.add(`IFCAXIS2PLACEMENT3D(#${originId},#${dirZId},#${dirXId})`);

  // IfcGeometricRepresentationContext
  const geomCtxId = w.add(
    `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-05,#${wcsId},$)`
  );

  // IfcDimensionalExponents (all zeroes) & IfcSIUnit for length (METRE)
  const siLengthId = w.add(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`);
  const siForceId = w.add(`IFCSIUNIT(*,.FORCEUNIT.,$,.NEWTON.)`);
  const siAngleId = w.add(`IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)`);

  // IfcUnitAssignment
  const unitAssignId = w.add(
    `IFCUNITASSIGNMENT((#${siLengthId},#${siForceId},#${siAngleId}))`
  );

  // -------------------------------------------------------------------
  // IfcOwnerHistory
  // -------------------------------------------------------------------

  // IfcPerson
  const personId = w.add(
    `IFCPERSON($,${ifcString(projectInfo.engineer)},$,$,$,$,$,$)`
  );

  // IfcOrganization
  const orgId = w.add(
    `IFCORGANIZATION($,${ifcString(projectInfo.company)},$,$,$)`
  );

  // IfcPersonAndOrganization
  const personOrgId = w.add(
    `IFCPERSONANDORGANIZATION(#${personId},#${orgId},$)`
  );

  // IfcApplication
  const appId = w.add(
    `IFCAPPLICATION(#${orgId},'1.0',${ifcString('Open-FEM2D-Studio')},'OpenFEM2D')`
  );

  // IfcOwnerHistory
  const ownerHistId = w.add(
    `IFCOWNERHISTORY(#${personOrgId},#${appId},$,.NOCHANGE.,$,#${personOrgId},#${appId},${ts})`
  );

  // -------------------------------------------------------------------
  // IfcProject
  // -------------------------------------------------------------------

  const projectId = w.add(
    `IFCPROJECT('${generateGuid()}',#${ownerHistId},${ifcString(projectInfo.name)},${ifcString(projectInfo.description)},$,$,$,(#${geomCtxId}),#${unitAssignId})`
  );

  // -------------------------------------------------------------------
  // IfcStructuralAnalysisModel
  // -------------------------------------------------------------------

  const analysisModelId = w.add(
    `IFCSTRUCTURALANALYSISMODEL('${generateGuid()}',#${ownerHistId},${ifcString('Structural Model')},$,$,.LOADING_3D.,$,$,$,$)`
  );

  // IfcRelAggregates – link analysis model to project
  w.add(
    `IFCRELAGGREGATES('${generateGuid()}',#${ownerHistId},$,$,#${projectId},(#${analysisModelId}))`
  );

  // -------------------------------------------------------------------
  // Nodes  ->  IfcStructuralPointConnection
  // -------------------------------------------------------------------

  /** Map from node id to IFC entity id for the IfcStructuralPointConnection. */
  const nodeEntityIds = new Map<number, number>();

  /** Map from node id to the vertex point entity id. */
  const nodePointIds = new Map<number, number>();

  for (const [nodeId, node] of mesh.nodes) {
    // IfcCartesianPoint for the node location (2D model: z = 0)
    const ptId = w.add(
      `IFCCARTESIANPOINT((${ifcReal(node.x)},${ifcReal(node.y)},${ifcReal(0)}))`
    );
    nodePointIds.set(nodeId, ptId);

    // IfcVertexPoint
    const vpId = w.add(`IFCVERTEXPOINT(#${ptId})`);

    // IfcAxis2Placement3D local placement for the connection
    const localPlaceId = w.add(
      `IFCAXIS2PLACEMENT3D(#${ptId},#${dirZId},#${dirXId})`
    );
    const localPlacementId = w.add(
      `IFCLOCALPLACEMENT($,#${localPlaceId})`
    );

    // Topology: IfcTopologyRepresentation
    const topoRepId = w.add(
      `IFCTOPOLOGYREPRESENTATION(#${geomCtxId},'Reference','Vertex',(#${vpId}))`
    );
    const prodDefShapeId = w.add(
      `IFCPRODUCTDEFINITIONSHAPE($,$,(#${topoRepId}))`
    );

    // IfcStructuralPointConnection
    const connId = w.add(
      `IFCSTRUCTURALPOINTCONNECTION('${generateGuid()}',#${ownerHistId},${ifcString('Node ' + nodeId)},$,$,#${localPlacementId},#${prodDefShapeId},$,$)`
    );
    nodeEntityIds.set(nodeId, connId);
  }

  // -------------------------------------------------------------------
  // Beam elements  ->  IfcStructuralCurveMember
  // -------------------------------------------------------------------

  /** Map from beam element id to IFC entity id. */
  const beamEntityIds = new Map<number, number>();

  for (const [beamId, beam] of mesh.beamElements) {
    const nodesResult = mesh.getBeamElementNodes(beam);
    if (!nodesResult) continue;
    const [n1, n2] = nodesResult;

    // Edge topology: start point, end point, IfcEdge
    const p1Id = nodePointIds.get(n1.id)!;
    const p2Id = nodePointIds.get(n2.id)!;

    const vp1Id = w.add(`IFCVERTEXPOINT(#${p1Id})`);
    const vp2Id = w.add(`IFCVERTEXPOINT(#${p2Id})`);
    const edgeId = w.add(`IFCEDGE(#${vp1Id},#${vp2Id})`);

    // Direction along the beam
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const dirBeamId = length > 1e-12
      ? w.add(`IFCDIRECTION((${ifcReal(dx / length)},${ifcReal(dy / length)},${ifcReal(0)}))`)
      : dirXId;

    // Local placement at start node
    const beamPlaceId = w.add(
      `IFCAXIS2PLACEMENT3D(#${p1Id},#${dirZId},#${dirBeamId})`
    );
    const beamLocalPlacementId = w.add(
      `IFCLOCALPLACEMENT($,#${beamPlaceId})`
    );

    // Topology representation
    const topoRepId = w.add(
      `IFCTOPOLOGYREPRESENTATION(#${geomCtxId},'Reference','Edge',(#${edgeId}))`
    );
    const prodDefShapeId = w.add(
      `IFCPRODUCTDEFINITIONSHAPE($,$,(#${topoRepId}))`
    );

    // IfcStructuralCurveMember
    const curveMemberId = w.add(
      `IFCSTRUCTURALCURVEMEMBER('${generateGuid()}',#${ownerHistId},${ifcString('Beam ' + beamId)},$,$,#${beamLocalPlacementId},#${prodDefShapeId},$,.RIGID_JOINED_MEMBER.)`
    );
    beamEntityIds.set(beamId, curveMemberId);

    // IfcRelConnectsStructuralMember – start node
    const conn1EntityId = nodeEntityIds.get(n1.id);
    if (conn1EntityId !== undefined) {
      w.add(
        `IFCRELCONNECTSSTRUCTURALMEMBER('${generateGuid()}',#${ownerHistId},$,$,#${curveMemberId},#${conn1EntityId},$,$,$,$)`
      );
    }

    // IfcRelConnectsStructuralMember – end node
    const conn2EntityId = nodeEntityIds.get(n2.id);
    if (conn2EntityId !== undefined) {
      w.add(
        `IFCRELCONNECTSSTRUCTURALMEMBER('${generateGuid()}',#${ownerHistId},$,$,#${curveMemberId},#${conn2EntityId},$,$,$,$)`
      );
    }
  }

  // -------------------------------------------------------------------
  // Boundary conditions  ->  IfcBoundaryNodeCondition
  // -------------------------------------------------------------------

  for (const [nodeId, node] of mesh.nodes) {
    const cx = node.constraints.x;
    const cy = node.constraints.y;
    const cr = node.constraints.rotation;

    if (!cx && !cy && !cr) continue;

    // Determine support label
    let supportLabel = 'Support';
    if (cx && cy && cr) supportLabel = 'Fixed';
    else if (cx && cy) supportLabel = 'Pinned';
    else if (cx) supportLabel = 'Roller X';
    else if (cy) supportLabel = 'Roller Y';
    else if (cr) supportLabel = 'Rotation Lock';

    // IFC boolean encoding for boundary: FIXED for constrained, FREE for unconstrained.
    // Using IfcBoundaryNodeCondition with IfcBoolean values.
    // In IFC2x3/IFC4 the translational stiffness can be given as a boolean
    // (.T. = fully fixed, .F. = free) when using IfcBooleanStiffnessSelect.

    const xFix = cx ? '.T.' : '.F.';
    const yFix = cy ? '.T.' : '.F.';
    const zFix = '.F.'; // 2D model, Z translation always free
    const rxFix = '.F.'; // rotation about X always free in 2D
    const ryFix = '.F.'; // rotation about Y always free in 2D
    const rzFix = cr ? '.T.' : '.F.'; // rotation about Z (in-plane rotation)

    // IfcBoundaryNodeCondition
    const conditionId = w.add(
      `IFCBOUNDARYNODECONDITION(${ifcString(supportLabel + ' @ Node ' + nodeId)},${xFix},${yFix},${zFix},${rxFix},${ryFix},${rzFix})`
    );

    // Apply the boundary condition to the IfcStructuralPointConnection
    const connEntityId = nodeEntityIds.get(nodeId);
    if (connEntityId !== undefined) {
      // IfcRelAssociates or via AppliedCondition on the connection.
      // In practice, the condition is referenced via the 9th attribute
      // (AppliedCondition) of IfcStructuralPointConnection. Since we
      // already emitted that entity, we create a relationship using
      // IfcRelConnectsWithConditions is not standard here. Instead we
      // note the condition as a property set for interoperability.
      //
      // The most standards-compliant way is via IfcRelAssociatesConstraint
      // but many viewers simply read IfcBoundaryNodeCondition referenced
      // from the structural item. We emit a property set relationship.
      const psetId = w.add(
        `IFCPROPERTYSET('${generateGuid()}',#${ownerHistId},${ifcString('BoundaryConditions')},$,(#${conditionId}))`
      );
      w.add(
        `IFCRELDEFINESBYPROPERTIES('${generateGuid()}',#${ownerHistId},$,$,(#${connEntityId}),#${psetId})`
      );
    }
  }

  // -------------------------------------------------------------------
  // Loads  ->  IfcStructuralLoadGroup + actions
  // -------------------------------------------------------------------

  const allActionIds: number[] = [];

  for (const lc of loadCases) {
    // IfcStructuralLoadGroup for this load case
    const loadGroupId = w.add(
      `IFCSTRUCTURALLOADGROUP('${generateGuid()}',#${ownerHistId},${ifcString(lc.name)},$,$,.LOAD_CASE.,.PERMANENT_G.,.NOTDEFINED.,${ifcReal(1)},$)`
    );

    const actionIdsInGroup: number[] = [];

    // ---------------------------------------------------------------
    // Point loads  ->  IfcStructuralPointAction
    // ---------------------------------------------------------------
    for (const pl of lc.pointLoads) {
      const connEntityId = nodeEntityIds.get(pl.nodeId);
      if (connEntityId === undefined) continue;

      // IfcStructuralLoadSingleForce
      const loadValueId = w.add(
        `IFCSTRUCTURALLOADSINGLEFORCE(${ifcString('PL@Node' + pl.nodeId)},${ifcReal(pl.fx)},${ifcReal(pl.fy)},${ifcReal(0)},${ifcReal(0)},${ifcReal(0)},${ifcReal(pl.mz)})`
      );

      // IfcStructuralPointAction
      const actionId = w.add(
        `IFCSTRUCTURALPOINTACTION('${generateGuid()}',#${ownerHistId},${ifcString('Point Load @ Node ' + pl.nodeId)},$,$,$,$,$,.GLOBAL_COORDS.,$,#${loadValueId})`
      );

      actionIdsInGroup.push(actionId);
      allActionIds.push(actionId);

      // IfcRelConnectsStructuralActivity
      w.add(
        `IFCRELCONNECTSSTRUCTURALACTIVITY('${generateGuid()}',#${ownerHistId},$,$,#${connEntityId},#${actionId})`
      );
    }

    // ---------------------------------------------------------------
    // Distributed loads  ->  IfcStructuralLinearAction
    // ---------------------------------------------------------------
    for (const dl of lc.distributedLoads) {
      const beamEntityId = beamEntityIds.get(dl.elementId);
      if (beamEntityId === undefined) continue;

      // IfcStructuralLoadLinearForce
      const loadValueId = w.add(
        `IFCSTRUCTURALLOADLINEARFORCE(${ifcString('DL@Beam' + dl.elementId)},${ifcReal(dl.qx)},${ifcReal(dl.qy)},${ifcReal(0)},${ifcReal(0)},${ifcReal(0)},${ifcReal(0)})`
      );

      // IfcStructuralLinearAction
      const actionId = w.add(
        `IFCSTRUCTURALLINEARACTION('${generateGuid()}',#${ownerHistId},${ifcString('Dist. Load @ Beam ' + dl.elementId)},$,$,$,$,$,.GLOBAL_COORDS.,$,#${loadValueId},.CONST.,.GLOBAL_COORDS.)`
      );

      actionIdsInGroup.push(actionId);
      allActionIds.push(actionId);

      // IfcRelConnectsStructuralActivity
      w.add(
        `IFCRELCONNECTSSTRUCTURALACTIVITY('${generateGuid()}',#${ownerHistId},$,$,#${beamEntityId},#${actionId})`
      );
    }

    // IfcRelAssignsToGroup – link actions to load group
    if (actionIdsInGroup.length > 0) {
      const refs = actionIdsInGroup.map((id) => '#' + id).join(',');
      w.add(
        `IFCRELASSIGNSTOGROUP('${generateGuid()}',#${ownerHistId},$,$,(${refs}),$,#${loadGroupId})`
      );
    }
  }

  // Also export node-level loads (from mesh.nodes.loads) that may not be
  // part of any explicit load case.
  for (const [nodeId, node] of mesh.nodes) {
    const { fx, fy, moment } = node.loads;
    if (fx === 0 && fy === 0 && moment === 0) continue;

    const connEntityId = nodeEntityIds.get(nodeId);
    if (connEntityId === undefined) continue;

    const loadValueId = w.add(
      `IFCSTRUCTURALLOADSINGLEFORCE(${ifcString('NodeLoad@' + nodeId)},${ifcReal(fx)},${ifcReal(fy)},${ifcReal(0)},${ifcReal(0)},${ifcReal(0)},${ifcReal(moment)})`
    );

    const actionId = w.add(
      `IFCSTRUCTURALPOINTACTION('${generateGuid()}',#${ownerHistId},${ifcString('Node Load @ ' + nodeId)},$,$,$,$,$,.GLOBAL_COORDS.,$,#${loadValueId})`
    );

    w.add(
      `IFCRELCONNECTSSTRUCTURALACTIVITY('${generateGuid()}',#${ownerHistId},$,$,#${connEntityId},#${actionId})`
    );
  }

  // Also export beam-level distributed loads (from beam.distributedLoad)
  // that may not be part of any explicit load case.
  for (const [beamId, beam] of mesh.beamElements) {
    if (!beam.distributedLoad) continue;
    const { qx, qy } = beam.distributedLoad;
    if (qx === 0 && qy === 0) continue;

    const beamEntityId = beamEntityIds.get(beamId);
    if (beamEntityId === undefined) continue;

    const loadValueId = w.add(
      `IFCSTRUCTURALLOADLINEARFORCE(${ifcString('BeamDL@' + beamId)},${ifcReal(qx)},${ifcReal(qy)},${ifcReal(0)},${ifcReal(0)},${ifcReal(0)},${ifcReal(0)})`
    );

    const actionId = w.add(
      `IFCSTRUCTURALLINEARACTION('${generateGuid()}',#${ownerHistId},${ifcString('Beam Dist. Load @ ' + beamId)},$,$,$,$,$,.LOCAL_COORDS.,$,#${loadValueId},.CONST.,.LOCAL_COORDS.)`
    );

    w.add(
      `IFCRELCONNECTSSTRUCTURALACTIVITY('${generateGuid()}',#${ownerHistId},$,$,#${beamEntityId},#${actionId})`
    );
  }

  // -------------------------------------------------------------------
  // Assign all structural items to the analysis model
  // -------------------------------------------------------------------

  const allStructuralItemIds: number[] = [
    ...Array.from(nodeEntityIds.values()),
    ...Array.from(beamEntityIds.values()),
  ];

  if (allStructuralItemIds.length > 0) {
    const refs = allStructuralItemIds.map((id) => '#' + id).join(',');
    w.add(
      `IFCRELASSIGNSTOGROUP('${generateGuid()}',#${ownerHistId},$,$,(${refs}),$,#${analysisModelId})`
    );
  }

  // -------------------------------------------------------------------
  // Assemble the full IFC-SPF file
  // -------------------------------------------------------------------

  const header = buildHeader(projectInfo, now);
  const dataSection = w.getDataLines();

  return [
    'ISO-10303-21;',
    'HEADER;',
    header,
    'ENDSEC;',
    '',
    'DATA;',
    dataSection,
    'ENDSEC;',
    '',
    'END-ISO-10303-21;',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Header builder
// ---------------------------------------------------------------------------

function buildHeader(info: IProjectInfo, now: Date): string {
  const ts = isoTimestamp(now);
  const lines: string[] = [];

  lines.push(
    `FILE_DESCRIPTION((${ifcString('ViewDefinition [StructuralAnalysisView]')}),'2;1');`
  );
  lines.push(
    `FILE_NAME(${ifcString(info.name + '.ifc')},${ifcString(ts)},(${ifcString(info.engineer)}),(${ifcString(info.company)}),${ifcString('Open-FEM2D-Studio IFC Exporter')},${ifcString('Open-FEM2D-Studio 1.0')},${ifcString('')});`
  );
  lines.push(`FILE_SCHEMA(('IFC4'));`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Simplified GUID generator (IFC GlobalId is a 22-char base-64 string)
// ---------------------------------------------------------------------------

const BASE64_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

/**
 * Generate a simplified IFC GlobalId (22 characters, base-64 encoded).
 *
 * A production exporter would use a proper UUID-to-IFC-base64 conversion.
 * This implementation generates a random 22-character string from the IFC
 * base-64 alphabet, which is sufficient for export purposes.
 */
function generateGuid(): string {
  let guid = '';
  for (let i = 0; i < 22; i++) {
    guid += BASE64_CHARS.charAt(Math.floor(Math.random() * 64));
  }
  return guid;
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/**
 * Trigger a browser download of IFC content as a file.
 *
 * Creates a temporary Blob URL, programmatically clicks an anchor element,
 * and cleans up afterwards.
 *
 * @param content  - The IFC file content string.
 * @param filename - The desired filename (e.g. "model.ifc").
 */
export function downloadIfc(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/x-step' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.ifc') ? filename : filename + '.ifc';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
