import { INode, IElement, IMaterial, IMesh, ITriangleElement, IBeamElement, IBeamSection, IPlateRegion } from './types';
import { DEFAULT_MATERIALS } from './Material';
import { DEFAULT_SECTIONS } from './Beam';

export class Mesh implements IMesh {
  nodes: Map<number, INode>;
  elements: Map<number, IElement>;
  beamElements: Map<number, IBeamElement>;
  materials: Map<number, IMaterial>;
  sections: Map<string, IBeamSection>;
  plateRegions: Map<number, IPlateRegion>;
  private nextNodeId: number;
  private nextElementId: number;
  private nextMaterialId: number;
  private nextPlateId: number;

  constructor() {
    this.nodes = new Map();
    this.elements = new Map();
    this.beamElements = new Map();
    this.materials = new Map();
    this.sections = new Map();
    this.plateRegions = new Map();
    this.nextNodeId = 1;
    this.nextElementId = 1;
    this.nextMaterialId = 10;
    this.nextPlateId = 1;

    // Add default materials
    DEFAULT_MATERIALS.forEach(m => this.materials.set(m.id, { ...m }));

    // Add default sections
    DEFAULT_SECTIONS.forEach(s => this.sections.set(s.name, s.section));
  }

  addNode(x: number, y: number): INode {
    const node: INode = {
      id: this.nextNodeId++,
      x,
      y,
      constraints: { x: false, y: false, rotation: false },
      loads: { fx: 0, fy: 0, moment: 0 }
    };
    this.nodes.set(node.id, node);
    return node;
  }

  removeNode(id: number): boolean {
    if (!this.nodes.has(id)) return false;

    // Cascade: if node belongs to a plate region, remove the whole plate
    const platesToRemove: number[] = [];
    for (const [plateId, plate] of this.plateRegions) {
      if (plate.nodeIds.includes(id)) {
        platesToRemove.push(plateId);
      }
    }
    for (const plateId of platesToRemove) {
      const plate = this.plateRegions.get(plateId);
      if (plate) {
        // Remove all elements of the plate
        for (const elemId of plate.elementIds) {
          this.elements.delete(elemId);
        }
        // Remove plate-only nodes (except the one being removed, handled below)
        for (const nodeId of plate.nodeIds) {
          if (nodeId !== id) {
            // Check if used elsewhere
            let usedElsewhere = false;
            for (const beam of this.beamElements.values()) {
              if (beam.nodeIds.includes(nodeId)) { usedElsewhere = true; break; }
            }
            if (!usedElsewhere) {
              for (const [pid, otherPlate] of this.plateRegions) {
                if (pid !== plateId && otherPlate.nodeIds.includes(nodeId)) { usedElsewhere = true; break; }
              }
            }
            if (!usedElsewhere) {
              for (const elem of this.elements.values()) {
                if (elem.nodeIds.includes(nodeId)) { usedElsewhere = true; break; }
              }
            }
            if (!usedElsewhere) {
              this.nodes.delete(nodeId);
            }
          }
        }
        this.plateRegions.delete(plateId);
      }
    }

    // Cascade: remove triangle elements connected to this node
    for (const [elemId, element] of this.elements) {
      if (element.nodeIds.includes(id)) {
        this.elements.delete(elemId);
      }
    }

    // Cascade: remove beam elements connected to this node
    for (const [beamId, beam] of this.beamElements) {
      if (beam.nodeIds.includes(id)) {
        this.beamElements.delete(beamId);
      }
    }

    return this.nodes.delete(id);
  }

  updateNode(id: number, updates: Partial<INode>): INode | null {
    const node = this.nodes.get(id);
    if (!node) return null;

    const updated = { ...node, ...updates, id }; // Prevent ID change
    this.nodes.set(id, updated);
    return updated;
  }

  addTriangleElement(nodeIds: [number, number, number], materialId: number = 1, thickness: number = 0.01): ITriangleElement | null {
    // Verify all nodes exist
    for (const nodeId of nodeIds) {
      if (!this.nodes.has(nodeId)) return null;
    }

    // Verify material exists
    if (!this.materials.has(materialId)) {
      materialId = 1; // Default to steel
    }

    const element: ITriangleElement = {
      id: this.nextElementId++,
      nodeIds,
      materialId,
      thickness
    };
    this.elements.set(element.id, element);
    return element;
  }

  removeElement(id: number): boolean {
    // Try to remove from triangles first, then beams
    if (this.elements.delete(id)) {
      return true;
    }
    return this.beamElements.delete(id);
  }

  addBeamElement(
    nodeIds: [number, number],
    materialId: number = 1,
    section: IBeamSection = { A: 53.8e-4, I: 8360e-8, h: 0.300 },  // IPE 300 default
    profileName?: string
  ): IBeamElement | null {
    // Verify all nodes exist
    for (const nodeId of nodeIds) {
      if (!this.nodes.has(nodeId)) return null;
    }

    // Verify material exists
    if (!this.materials.has(materialId)) {
      materialId = 1; // Default to steel
    }

    const element: IBeamElement = {
      id: this.nextElementId++,
      nodeIds,
      materialId,
      thickness: 1, // Not used for beams, but required by IElement
      section,
      profileName
    };
    this.beamElements.set(element.id, element);
    return element;
  }

  getBeamElement(id: number): IBeamElement | undefined {
    return this.beamElements.get(id);
  }

  updateBeamElement(id: number, updates: Partial<IBeamElement>): IBeamElement | null {
    const element = this.beamElements.get(id);
    if (!element) return null;

    const updated = { ...element, ...updates, id };
    this.beamElements.set(id, updated);
    return updated;
  }

  getBeamElementNodes(element: IBeamElement): [INode, INode] | null {
    const n1 = this.nodes.get(element.nodeIds[0]);
    const n2 = this.nodes.get(element.nodeIds[1]);
    if (!n1 || !n2) return null;
    return [n1, n2];
  }

  getBeamCount(): number {
    return this.beamElements.size;
  }

  updateElement(id: number, updates: Partial<IElement>): IElement | null {
    const element = this.elements.get(id);
    if (!element) return null;

    const updated = { ...element, ...updates, id };
    this.elements.set(id, updated);
    return updated;
  }

  addMaterial(material: Omit<IMaterial, 'id'>): IMaterial {
    const newMaterial: IMaterial = {
      ...material,
      id: this.nextMaterialId++
    };
    this.materials.set(newMaterial.id, newMaterial);
    return newMaterial;
  }

  getNode(id: number): INode | undefined {
    return this.nodes.get(id);
  }

  getElement(id: number): IElement | undefined {
    return this.elements.get(id);
  }

  getMaterial(id: number): IMaterial | undefined {
    return this.materials.get(id);
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getElementCount(): number {
    return this.elements.size;
  }

  /**
   * Split a beam at a given position and optionally apply a point load there
   * @param beamId - ID of the beam to split
   * @param position - Position along beam (0 to 1, where 0 = start, 1 = end)
   * @param load - Optional load to apply at the split point {fx, fy, moment}
   * @returns The new node at the split point, or null if failed
   */
  splitBeamAt(
    beamId: number,
    position: number,
    load?: { fx: number; fy: number; moment: number }
  ): INode | null {
    const beam = this.beamElements.get(beamId);
    if (!beam) return null;

    // Clamp position to valid range (avoid splitting at endpoints)
    position = Math.max(0.01, Math.min(0.99, position));

    const nodes = this.getBeamElementNodes(beam);
    if (!nodes) return null;

    const [n1, n2] = nodes;

    // Calculate the position of the new node
    const newX = n1.x + position * (n2.x - n1.x);
    const newY = n1.y + position * (n2.y - n1.y);

    // Check if there's already a node at this position
    const existingNode = this.findNodeAt(newX, newY, 0.01);
    if (existingNode) {
      // Just apply the load to the existing node
      if (load) {
        this.updateNode(existingNode.id, {
          loads: {
            fx: existingNode.loads.fx + load.fx,
            fy: existingNode.loads.fy + load.fy,
            moment: existingNode.loads.moment + load.moment
          }
        });
      }
      return existingNode;
    }

    // Create new node at the split position
    const newNode = this.addNode(newX, newY);

    // Apply load if provided
    if (load) {
      this.updateNode(newNode.id, {
        loads: { fx: load.fx, fy: load.fy, moment: load.moment }
      });
    }

    // Store original beam properties
    const { materialId, section, distributedLoad, profileName } = beam;

    // Remove the original beam
    this.beamElements.delete(beamId);

    // Create two new beam elements
    const beam1 = this.addBeamElement([n1.id, newNode.id], materialId, section, profileName);
    const beam2 = this.addBeamElement([newNode.id, n2.id], materialId, section, profileName);

    // Copy distributed load if present
    if (distributedLoad && beam1 && beam2) {
      this.updateBeamElement(beam1.id, { distributedLoad });
      this.updateBeamElement(beam2.id, { distributedLoad });
    }

    return newNode;
  }

  /**
   * Add a point load at a specific position on a beam
   * This will automatically split the beam and create a new node
   * @param beamId - ID of the beam
   * @param position - Position along beam (0 to 1)
   * @param fx - Force in global X direction (N)
   * @param fy - Force in global Y direction (N)
   * @param moment - Moment (Nm)
   * @returns The node where the load is applied, or null if failed
   */
  addPointLoadOnBeam(
    beamId: number,
    position: number,
    fx: number = 0,
    fy: number = 0,
    moment: number = 0
  ): INode | null {
    return this.splitBeamAt(beamId, position, { fx, fy, moment });
  }

  addPlateRegion(plate: IPlateRegion): IPlateRegion {
    plate.id = this.nextPlateId++;
    this.plateRegions.set(plate.id, plate);
    return plate;
  }

  removePlateRegion(plateId: number): boolean {
    return this.plateRegions.delete(plateId);
  }

  getPlateRegion(id: number): IPlateRegion | undefined {
    return this.plateRegions.get(id);
  }

  getPlateForElement(elemId: number): IPlateRegion | undefined {
    for (const plate of this.plateRegions.values()) {
      if (plate.elementIds.includes(elemId)) {
        return plate;
      }
    }
    return undefined;
  }

  clear(): void {
    this.nodes.clear();
    this.elements.clear();
    this.beamElements.clear();
    this.plateRegions.clear();
    this.nextNodeId = 1;
    this.nextElementId = 1;
    this.nextPlateId = 1;
  }

  getElementNodes(element: IElement): INode[] {
    return element.nodeIds.map(id => this.nodes.get(id)!).filter(n => n !== undefined);
  }

  findNodeAt(x: number, y: number, tolerance: number = 0.1): INode | null {
    for (const node of this.nodes.values()) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < tolerance) {
        return node;
      }
    }
    return null;
  }

  getConstrainedDofs(): number[] {
    const dofs: number[] = [];
    for (const node of this.nodes.values()) {
      const baseIndex = (node.id - 1) * 2;
      if (node.constraints.x) dofs.push(baseIndex);
      if (node.constraints.y) dofs.push(baseIndex + 1);
    }
    return dofs;
  }

  toJSON(): object {
    return {
      nodes: Array.from(this.nodes.values()),
      elements: Array.from(this.elements.values()),
      beamElements: Array.from(this.beamElements.values()),
      materials: Array.from(this.materials.values()),
      sections: Array.from(this.sections.entries()).map(([name, section]) => ({ name, section })),
      plateRegions: Array.from(this.plateRegions.values())
    };
  }

  static fromJSON(data: {
    nodes: INode[];
    elements: IElement[];
    beamElements?: IBeamElement[];
    materials: IMaterial[];
    sections?: { name: string; section: IBeamSection }[];
    plateRegions?: IPlateRegion[];
  }): Mesh {
    const mesh = new Mesh();
    mesh.nodes.clear();
    mesh.elements.clear();
    mesh.beamElements.clear();
    mesh.materials.clear();
    mesh.plateRegions.clear();

    data.materials.forEach(m => mesh.materials.set(m.id, m));

    if (data.sections) {
      mesh.sections.clear();
      data.sections.forEach(s => mesh.sections.set(s.name, s.section));
    }

    // Ensure nodes have rotation constraint and moment fields
    data.nodes.forEach(n => {
      const node: INode = {
        ...n,
        constraints: {
          x: n.constraints.x,
          y: n.constraints.y,
          rotation: n.constraints.rotation ?? false
        },
        loads: {
          fx: n.loads.fx,
          fy: n.loads.fy,
          moment: n.loads.moment ?? 0
        }
      };
      mesh.nodes.set(n.id, node);
    });

    data.elements.forEach(e => mesh.elements.set(e.id, e));

    if (data.beamElements) {
      data.beamElements.forEach(b => mesh.beamElements.set(b.id, b));
    }

    if (data.plateRegions) {
      data.plateRegions.forEach(p => mesh.plateRegions.set(p.id, p));
    }

    const allElementIds = [
      ...data.elements.map(e => e.id),
      ...(data.beamElements || []).map(b => b.id)
    ];

    const allPlateIds = (data.plateRegions || []).map(p => p.id);

    mesh.nextNodeId = Math.max(...data.nodes.map(n => n.id), 0) + 1;
    mesh.nextElementId = Math.max(...allElementIds, 0) + 1;
    mesh.nextMaterialId = Math.max(...data.materials.map(m => m.id), 10) + 1;
    mesh.nextPlateId = Math.max(...allPlateIds, 0) + 1;

    return mesh;
  }
}
