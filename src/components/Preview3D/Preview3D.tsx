import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useFEM } from '../../context/FEMContext';
import { calculateBeamLength } from '../../core/fem/Beam';
import { buildNodeIdToIndex } from '../../core/solver/Assembler';
import { parseIfcFile, IfcStructuralMember } from '../../core/io/IfcParser';
import './Preview3D.css';

// ─── Simple Orbit Controls ──────────────────────────────────────────────
class SimpleOrbitControls {
  camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3();
  spherical = new THREE.Spherical(10, Math.PI / 3, Math.PI / 4);
  private isDown = false;
  private lastMouse = { x: 0, y: 0 };
  private dom: HTMLElement;
  private button = 0;

  // Animation state for view cube transitions
  private animating = false;
  private animStart = 0;
  private animDuration = 400; // ms
  private animFromSpherical = new THREE.Spherical();
  private animToSpherical = new THREE.Spherical();
  onUpdate?: () => void;

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.camera = camera;
    this.dom = dom;
    dom.addEventListener('mousedown', this.onMouseDown);
    dom.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('mouseup', this.onMouseUp);
    dom.addEventListener('mouseleave', this.onMouseUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    this.update();
  }

  dispose() {
    this.dom.removeEventListener('mousedown', this.onMouseDown);
    this.dom.removeEventListener('mousemove', this.onMouseMove);
    this.dom.removeEventListener('mouseup', this.onMouseUp);
    this.dom.removeEventListener('mouseleave', this.onMouseUp);
    this.dom.removeEventListener('wheel', this.onWheel);
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDown = true;
    this.button = e.button;
    this.lastMouse = { x: e.clientX, y: e.clientY };
  };
  private onMouseUp = () => { this.isDown = false; };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDown) return;
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.lastMouse = { x: e.clientX, y: e.clientY };

    if (e.shiftKey || this.button === 1 || this.button === 2) {
      // Pan (inverted direction for natural feel)
      const panSpeed = 0.005 * this.spherical.radius;
      const right = new THREE.Vector3();
      right.setFromMatrixColumn(this.camera.matrix, 0);
      const up = new THREE.Vector3();
      up.setFromMatrixColumn(this.camera.matrix, 1);
      this.target.addScaledVector(right, dx * panSpeed);
      this.target.addScaledVector(up, -dy * panSpeed);
    } else {
      // Rotate (inverted for natural feel)
      this.spherical.theta += dx * 0.005;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.005));
    }
    this.update();
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.spherical.radius *= e.deltaY > 0 ? 1.1 : 0.9;
    this.spherical.radius = Math.max(1, Math.min(100, this.spherical.radius));
    this.update();
  };

  update() {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.target);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  fitToScene(boundingBox: THREE.Box3) {
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 2);

    this.target.copy(center);
    this.spherical.radius = maxDim * 2;
    this.update();
  }

  /** Animate the camera to a target spherical coordinate (phi, theta). */
  animateTo(phi: number, theta: number) {
    this.animFromSpherical.copy(this.spherical);
    this.animToSpherical.set(this.spherical.radius, phi, theta);
    this.animStart = performance.now();
    this.animating = true;
  }

  /** Call every frame to advance the animation; returns true if still animating. */
  tick(): boolean {
    if (!this.animating) return false;
    const elapsed = performance.now() - this.animStart;
    let t = Math.min(elapsed / this.animDuration, 1);
    // Ease-in-out
    t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    this.spherical.phi = this.animFromSpherical.phi + (this.animToSpherical.phi - this.animFromSpherical.phi) * t;
    this.spherical.theta = this.animFromSpherical.theta + (this.animToSpherical.theta - this.animFromSpherical.theta) * t;
    this.update();

    if (t >= 1) {
      this.animating = false;
    }
    return this.animating;
  }
}

// ─── ViewCube ───────────────────────────────────────────────────────────
// A small interactive 3D navigation cube rendered in a secondary canvas.
// It mirrors the main camera orientation and allows clicking faces to
// snap the camera to predefined views.

interface CubeFace {
  label: string;
  // Target spherical coordinates (phi, theta) when clicking this face
  phi: number;
  theta: number;
  // Face normal in world space (used for hit-testing)
  normal: THREE.Vector3;
  // Color when hovered vs idle
  color: string;
  hoverColor: string;
}

const CUBE_FACES: CubeFace[] = [
  { label: 'Front',  phi: Math.PI / 2, theta: 0,              normal: new THREE.Vector3(0, 0, 1),  color: '#3b4d6e', hoverColor: '#5a7fb5' },
  { label: 'Back',   phi: Math.PI / 2, theta: Math.PI,        normal: new THREE.Vector3(0, 0, -1), color: '#3b4d6e', hoverColor: '#5a7fb5' },
  { label: 'Right',  phi: Math.PI / 2, theta: -Math.PI / 2,   normal: new THREE.Vector3(1, 0, 0),  color: '#4e6e3b', hoverColor: '#7fb55a' },
  { label: 'Left',   phi: Math.PI / 2, theta: Math.PI / 2,    normal: new THREE.Vector3(-1, 0, 0), color: '#4e6e3b', hoverColor: '#7fb55a' },
  { label: 'Top',    phi: 0.01,        theta: 0,              normal: new THREE.Vector3(0, 1, 0),  color: '#6e3b4e', hoverColor: '#b55a7f' },
  { label: 'Bottom', phi: Math.PI - 0.01, theta: 0,           normal: new THREE.Vector3(0, -1, 0), color: '#6e3b4e', hoverColor: '#b55a7f' },
];

class ViewCube {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cubeMeshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private hoveredFaceIndex = -1;
  private mainControls: SimpleOrbitControls;

  constructor(canvas: HTMLCanvasElement, mainControls: SimpleOrbitControls, size = 140) {
    this.canvas = canvas;
    this.mainControls = mainControls;

    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(size, size);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    // Lighting for the cube
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6);
    dl.position.set(2, 3, 4);
    this.scene.add(dl);

    this.buildCube();

    // Event listeners
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
    canvas.addEventListener('click', this.onClick);
  }

  dispose() {
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('click', this.onClick);
    this.renderer.dispose();
    for (const m of this.cubeMeshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
  }

  private buildCube() {
    // Create 6 individual face quads so we can highlight them individually
    const half = 0.8;
    const faceGeometries = this.createFaceGeometries(half);

    for (let i = 0; i < 6; i++) {
      const face = CUBE_FACES[i];
      const mat = new THREE.MeshPhongMaterial({
        color: face.color,
        transparent: true,
        opacity: 0.92,
        shininess: 40,
      });
      const mesh = new THREE.Mesh(faceGeometries[i], mat);
      mesh.userData.faceIndex = i;
      this.scene.add(mesh);
      this.cubeMeshes.push(mesh);

      // Create label sprite for this face
      const sprite = this.createLabelSprite(face.label, face.normal, half + 0.01);
      this.scene.add(sprite);
    }

    // Add thin edges wireframe around the cube
    const edgeGeo = new THREE.BoxGeometry(half * 2, half * 2, half * 2);
    const edges = new THREE.EdgesGeometry(edgeGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x8899bb, linewidth: 1 });
    const wireframe = new THREE.LineSegments(edges, edgeMat);
    this.scene.add(wireframe);

    // Add small axis indicators
    const axLen = 1.2;
    const axOff = -half - 0.15;
    // X axis (red)
    this.addAxisLine(new THREE.Vector3(axOff, axOff, axOff), new THREE.Vector3(axOff + axLen, axOff, axOff), 0xff4444);
    // Y axis (green)
    this.addAxisLine(new THREE.Vector3(axOff, axOff, axOff), new THREE.Vector3(axOff, axOff + axLen, axOff), 0x44ff44);
    // Z axis (blue)
    this.addAxisLine(new THREE.Vector3(axOff, axOff, axOff), new THREE.Vector3(axOff, axOff, axOff + axLen), 0x4488ff);
  }

  private addAxisLine(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    this.scene.add(new THREE.Line(geo, mat));
  }

  private createFaceGeometries(half: number): THREE.PlaneGeometry[] {
    const geos: THREE.PlaneGeometry[] = [];

    // Front face (+Z)
    const front = new THREE.PlaneGeometry(half * 2, half * 2);
    front.translate(0, 0, half);
    geos.push(front);

    // Back face (-Z)
    const back = new THREE.PlaneGeometry(half * 2, half * 2);
    back.rotateY(Math.PI);
    back.translate(0, 0, -half);
    geos.push(back);

    // Right face (+X)
    const right = new THREE.PlaneGeometry(half * 2, half * 2);
    right.rotateY(Math.PI / 2);
    right.translate(half, 0, 0);
    geos.push(right);

    // Left face (-X)
    const left = new THREE.PlaneGeometry(half * 2, half * 2);
    left.rotateY(-Math.PI / 2);
    left.translate(-half, 0, 0);
    geos.push(left);

    // Top face (+Y)
    const top = new THREE.PlaneGeometry(half * 2, half * 2);
    top.rotateX(-Math.PI / 2);
    top.translate(0, half, 0);
    geos.push(top);

    // Bottom face (-Y)
    const bottom = new THREE.PlaneGeometry(half * 2, half * 2);
    bottom.rotateX(Math.PI / 2);
    bottom.translate(0, -half, 0);
    geos.push(bottom);

    return geos;
  }

  private createLabelSprite(text: string, normal: THREE.Vector3, offset: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(normal.clone().multiplyScalar(offset));
    sprite.scale.set(0.8, 0.8, 1);
    return sprite;
  }

  private getNDC(e: MouseEvent): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private onMouseMove = (e: MouseEvent) => {
    const ndc = this.getNDC(e);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.cubeMeshes);
    const prevHover = this.hoveredFaceIndex;
    this.hoveredFaceIndex = hits.length > 0 ? hits[0].object.userData.faceIndex : -1;

    if (prevHover !== this.hoveredFaceIndex) {
      // Reset previous hover
      if (prevHover >= 0) {
        (this.cubeMeshes[prevHover].material as THREE.MeshPhongMaterial).color.set(CUBE_FACES[prevHover].color);
      }
      // Set new hover
      if (this.hoveredFaceIndex >= 0) {
        (this.cubeMeshes[this.hoveredFaceIndex].material as THREE.MeshPhongMaterial).color.set(CUBE_FACES[this.hoveredFaceIndex].hoverColor);
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'default';
      }
    }
  };

  private onMouseLeave = () => {
    if (this.hoveredFaceIndex >= 0) {
      (this.cubeMeshes[this.hoveredFaceIndex].material as THREE.MeshPhongMaterial).color.set(CUBE_FACES[this.hoveredFaceIndex].color);
      this.hoveredFaceIndex = -1;
    }
    this.canvas.style.cursor = 'default';
  };

  private onClick = () => {
    if (this.hoveredFaceIndex >= 0) {
      const face = CUBE_FACES[this.hoveredFaceIndex];
      this.mainControls.animateTo(face.phi, face.theta);
    }
  };

  render() {
    // Synchronize the ViewCube camera orientation with the main camera.
    // We place the cube camera at a fixed distance looking at origin,
    // but matching the main camera's rotational orientation.
    const mainCam = this.mainControls.camera;
    const dir = new THREE.Vector3();
    mainCam.getWorldDirection(dir);
    // Place cube camera opposite to look direction
    this.camera.position.copy(dir.negate().multiplyScalar(5));
    this.camera.lookAt(0, 0, 0);
    this.camera.up.copy(mainCam.up);

    this.renderer.render(this.scene, this.camera);
  }
}

// ─── Preview3D Component ────────────────────────────────────────────────
export function Preview3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cubeCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<SimpleOrbitControls | null>(null);
  const viewCubeRef = useRef<ViewCube | null>(null);
  const animFrameRef = useRef<number>(0);

  const { state } = useFEM();
  const { mesh, result, showDeformed, deformationScale, analysisType } = state;
  const [showSupports3D, setShowSupports3D] = useState(false);
  const [ifcMembers, setIfcMembers] = useState<IfcStructuralMember[]>([]);

  const handleImportIfc = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ifc';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const members = parseIfcFile(reader.result as string);
          setIfcMembers(members);
          if (members.length === 0) {
            alert('No structural members (beams, columns, slabs) found in this IFC file.');
          }
        } catch (err) {
          alert(`Failed to parse IFC file: ${(err as Error).message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const buildScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing meshes
    while (scene.children.length > 0) {
      const child = scene.children[0];
      scene.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    }

    // Ambient + directional lighting
    scene.add(new THREE.AmbientLight(0x404050, 1.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // Ground plane (grid)
    const gridHelper = new THREE.GridHelper(20, 40, 0x444466, 0x333355);
    gridHelper.rotation.x = Math.PI / 2; // Align to XZ plane in our coordinate system
    scene.add(gridHelper);

    // Coordinate axes
    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);

    const boundingBox = new THREE.Box3();

    // Materials
    const beamMat = new THREE.MeshPhongMaterial({
      color: 0x60a5fa,
      shininess: 60,
      specular: 0x222244,
    });
    const selectedBeamMat = new THREE.MeshPhongMaterial({
      color: 0xe94560,
      shininess: 60,
      specular: 0x442222,
    });
    const nodeMat = new THREE.MeshPhongMaterial({ color: 0xfbbf24 });

    const nodeIdToIndex = result ? getNodeIdToIndex() : null;

    // Draw beam elements as 3D boxes
    for (const beam of mesh.beamElements.values()) {
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      let [n1, n2] = nodes;

      // Apply deformation
      if (showDeformed && result && nodeIdToIndex) {
        const idx1 = nodeIdToIndex.get(n1.id);
        const idx2 = nodeIdToIndex.get(n2.id);
        if (idx1 !== undefined && idx2 !== undefined) {
          const dofs = 3;
          const u1 = result.displacements[idx1 * dofs] * deformationScale;
          const v1 = result.displacements[idx1 * dofs + 1] * deformationScale;
          const u2 = result.displacements[idx2 * dofs] * deformationScale;
          const v2 = result.displacements[idx2 * dofs + 1] * deformationScale;
          n1 = { ...n1, x: n1.x + u1, y: n1.y + v1 };
          n2 = { ...n2, x: n2.x + u2, y: n2.y + v2 };
        }
      }

      const L = calculateBeamLength(n1, n2);
      if (L < 1e-6) continue;

      // Section height for 3D representation
      const h = beam.section?.h || 0.2;
      const w = h * 0.5; // Approximate flange width

      // Create beam geometry (box)
      const geometry = new THREE.BoxGeometry(L, h, w);

      // Position and rotate beam
      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;
      const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);

      const isSelected = state.selection.elementIds.has(beam.id);
      const beamMesh = new THREE.Mesh(geometry, isSelected ? selectedBeamMat : beamMat);
      beamMesh.position.set(midX, midY, 0);
      beamMesh.rotation.z = angle;
      beamMesh.castShadow = true;
      beamMesh.receiveShadow = true;
      scene.add(beamMesh);

      // Add edges for beam outline
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xaaccff, linewidth: 1 });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.position.copy(beamMesh.position);
      wireframe.rotation.copy(beamMesh.rotation);
      scene.add(wireframe);

      boundingBox.expandByPoint(new THREE.Vector3(n1.x, n1.y, 0));
      boundingBox.expandByPoint(new THREE.Vector3(n2.x, n2.y, 0));
    }

    // Draw nodes
    const nodeGeom = new THREE.SphereGeometry(0.06, 16, 16);
    for (const node of mesh.nodes.values()) {
      const nodeMeshObj = new THREE.Mesh(nodeGeom, nodeMat);
      nodeMeshObj.position.set(node.x, node.y, 0);
      scene.add(nodeMeshObj);

      // Draw load arrows for all nodes that have loads applied
      if (node.loads && (node.loads.fx !== 0 || node.loads.fy !== 0)) {
        const arrowDir = new THREE.Vector3(node.loads.fx, node.loads.fy, 0).normalize();
        const arrowLength = 0.5;
        const arrowHelper = new THREE.ArrowHelper(
          arrowDir,
          new THREE.Vector3(node.x - arrowDir.x * arrowLength, node.y - arrowDir.y * arrowLength, 0),
          arrowLength,
          0xef4444,
          0.12,
          0.06
        );
        scene.add(arrowHelper);
      }

      // Draw support symbols when enabled
      if (showSupports3D && (node.constraints.x || node.constraints.y || node.constraints.rotation)) {
        const isFixed = node.constraints.x && node.constraints.y && node.constraints.rotation;
        const isPinned = node.constraints.x && node.constraints.y && !node.constraints.rotation;
        const isRollerY = !node.constraints.x && node.constraints.y && !node.constraints.rotation;
        const isRollerX = node.constraints.x && !node.constraints.y && !node.constraints.rotation;

        const supportMat = new THREE.MeshPhongMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85 });
        const supportSize = 0.15;

        if (isFixed) {
          // Fixed support: small rectangle/box
          const boxGeo = new THREE.BoxGeometry(supportSize * 2.5, supportSize * 0.4, supportSize * 2.5);
          const boxMesh = new THREE.Mesh(boxGeo, supportMat);
          boxMesh.position.set(node.x, node.y - supportSize * 0.8, 0);
          scene.add(boxMesh);

          // Hatching lines on top (represented by thin lines)
          const hatchMat = new THREE.LineBasicMaterial({ color: 0x22c55e });
          for (let hi = -3; hi <= 3; hi++) {
            const hx = hi * supportSize * 0.35;
            const hatchGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(node.x + hx - supportSize * 0.15, node.y - supportSize * 0.6, supportSize * 1.25),
              new THREE.Vector3(node.x + hx + supportSize * 0.15, node.y - supportSize * 1.0, supportSize * 1.25)
            ]);
            scene.add(new THREE.Line(hatchGeo, hatchMat));
          }
        } else if (isPinned) {
          // Pinned support: triangle (cone)
          const coneGeo = new THREE.ConeGeometry(supportSize, supportSize * 1.5, 3);
          const coneMesh = new THREE.Mesh(coneGeo, supportMat);
          coneMesh.position.set(node.x, node.y - supportSize * 0.9, 0);
          coneMesh.rotation.z = 0; // point up
          coneMesh.rotation.x = 0;
          scene.add(coneMesh);
        } else if (isRollerY) {
          // Roller (vertical): triangle with circle underneath
          const coneGeo = new THREE.ConeGeometry(supportSize, supportSize * 1.2, 3);
          const coneMesh = new THREE.Mesh(coneGeo, supportMat);
          coneMesh.position.set(node.x, node.y - supportSize * 0.7, 0);
          scene.add(coneMesh);

          // Roller circle underneath
          const circleGeo = new THREE.SphereGeometry(supportSize * 0.3, 12, 12);
          const circleMesh = new THREE.Mesh(circleGeo, supportMat);
          circleMesh.position.set(node.x, node.y - supportSize * 1.6, 0);
          scene.add(circleMesh);

          // Ground line under roller
          const lineMat = new THREE.LineBasicMaterial({ color: 0x22c55e });
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(node.x - supportSize * 1.2, node.y - supportSize * 2.0, 0),
            new THREE.Vector3(node.x + supportSize * 1.2, node.y - supportSize * 2.0, 0)
          ]);
          scene.add(new THREE.Line(lineGeo, lineMat));
        } else if (isRollerX) {
          // Roller (horizontal): triangle rotated 90 degrees with circle
          const coneGeo = new THREE.ConeGeometry(supportSize, supportSize * 1.2, 3);
          const coneMesh = new THREE.Mesh(coneGeo, supportMat);
          coneMesh.position.set(node.x - supportSize * 0.7, node.y, 0);
          coneMesh.rotation.z = -Math.PI / 2;
          scene.add(coneMesh);

          // Roller circle
          const circleGeo = new THREE.SphereGeometry(supportSize * 0.3, 12, 12);
          const circleMesh = new THREE.Mesh(circleGeo, supportMat);
          circleMesh.position.set(node.x - supportSize * 1.6, node.y, 0);
          scene.add(circleMesh);
        } else {
          // Custom constraint: show a small diamond
          const diamondGeo = new THREE.OctahedronGeometry(supportSize * 0.6);
          const diamondMesh = new THREE.Mesh(diamondGeo, supportMat);
          diamondMesh.position.set(node.x, node.y - supportSize * 0.8, 0);
          scene.add(diamondMesh);
        }
      }
    }

    // Draw distributed loads as arrow rows
    for (const beam of mesh.beamElements.values()) {
      if (!beam.distributedLoad || beam.distributedLoad.qy === 0) continue;
      const nodes = mesh.getBeamElementNodes(beam);
      if (!nodes) continue;
      const [n1, n2] = nodes;
      const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
      const startT = beam.distributedLoad.startT ?? 0;
      const endT = beam.distributedLoad.endT ?? 1;
      const numArrows = 5;
      const arrowLen = 0.3;

      for (let i = 0; i <= numArrows; i++) {
        const t = startT + (endT - startT) * (i / numArrows);
        const px = n1.x + (n2.x - n1.x) * t;
        const py = n1.y + (n2.y - n1.y) * t;

        let dir: THREE.Vector3;
        if (beam.distributedLoad.coordSystem === 'global') {
          dir = new THREE.Vector3(0, beam.distributedLoad.qy > 0 ? 1 : -1, 0);
        } else {
          const perpAngle = angle + Math.PI / 2;
          const sign = beam.distributedLoad.qy > 0 ? 1 : -1;
          dir = new THREE.Vector3(Math.cos(perpAngle) * sign, Math.sin(perpAngle) * sign, 0);
        }

        const origin = new THREE.Vector3(px - dir.x * arrowLen, py - dir.y * arrowLen, 0);
        const arrow = new THREE.ArrowHelper(dir, origin, arrowLen, 0xef4444, 0.08, 0.04);
        scene.add(arrow);
      }
    }

    // Draw imported IFC members
    if (ifcMembers.length > 0) {
      const ifcBeamMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 60, specular: 0x222244 }); // blue
      const ifcColumnMat = new THREE.MeshPhongMaterial({ color: 0x22c55e, shininess: 60, specular: 0x224422 }); // green
      const ifcSlabMat = new THREE.MeshPhongMaterial({ color: 0x9ca3af, shininess: 40, specular: 0x333333, transparent: true, opacity: 0.8 }); // gray

      for (const member of ifcMembers) {
        const [sx, sy, sz] = member.startPoint;
        const [ex, ey, ez] = member.endPoint;
        const dx = ex - sx, dy = ey - sy, dz = ez - sz;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length < 1e-6) continue;

        const mat = member.type === 'column' ? ifcColumnMat : member.type === 'slab' ? ifcSlabMat : ifcBeamMat;

        // Determine cross-section size from profile or defaults
        let h = 0.2, w = 0.1;
        if (member.profile) {
          h = (member.profile.h || 200) / 1000;
          w = (member.profile.b || (member.profile.h ? member.profile.h * 0.5 : 100)) / 1000;
        }
        if (member.type === 'slab') {
          h = 0.2;
          w = 1.0;
        }

        const geo = new THREE.BoxGeometry(length, h, w);
        const memberMesh = new THREE.Mesh(geo, mat);

        // Position at midpoint
        const midX = (sx + ex) / 2;
        const midY = (sy + ey) / 2;
        const midZ = (sz + ez) / 2;
        memberMesh.position.set(midX, midY, midZ);

        // Orient along the member axis
        const direction = new THREE.Vector3(dx, dy, dz).normalize();
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);
        memberMesh.quaternion.copy(quat);

        memberMesh.castShadow = true;
        memberMesh.receiveShadow = true;
        scene.add(memberMesh);

        // Add wireframe edges
        const edges = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x8899bb });
        const wireframe = new THREE.LineSegments(edges, edgeMat);
        wireframe.position.copy(memberMesh.position);
        wireframe.quaternion.copy(memberMesh.quaternion);
        scene.add(wireframe);

        boundingBox.expandByPoint(new THREE.Vector3(sx, sy, sz));
        boundingBox.expandByPoint(new THREE.Vector3(ex, ey, ez));
      }
    }

    // Fit camera to scene
    if (controlsRef.current && !boundingBox.isEmpty()) {
      controlsRef.current.fitToScene(boundingBox);
    }
  }, [mesh, result, showDeformed, deformationScale, state.selection, showSupports3D, ifcMembers]);

  // Helper to map node IDs to result indices (active nodes only)
  const getNodeIdToIndex = useCallback((): Map<number, number> => {
    return buildNodeIdToIndex(mesh, analysisType);
  }, [mesh, analysisType]);

  useEffect(() => {
    const container = containerRef.current;
    const cubeCanvas = cubeCanvasRef.current;
    if (!container || !cubeCanvas) return;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x1a1a2e);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(5, 5, 10);
    cameraRef.current = camera;

    // Setup controls
    const controls = new SimpleOrbitControls(camera, container);
    controlsRef.current = controls;

    // Setup ViewCube
    const viewCube = new ViewCube(cubeCanvas, controls, 140);
    viewCubeRef.current = viewCube;

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      // Advance any view-cube-triggered camera animation
      controls.tick();
      renderer.render(scene, camera);
      viewCube.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
      controls.dispose();
      viewCube.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild scene when mesh changes
  useEffect(() => {
    buildScene();
  }, [buildScene]);

  // Listen for IFC import event dispatched by Ribbon
  useEffect(() => {
    const handler = () => handleImportIfc();
    window.addEventListener('fem2d-import-ifc', handler);
    return () => window.removeEventListener('fem2d-import-ifc', handler);
  }, [handleImportIfc]);

  return (
    <div className="preview-3d" ref={containerRef}>
      <canvas
        ref={cubeCanvasRef}
        className="preview-3d-viewcube"
      />
      <div className="preview-3d-toolbar">
        <button
          className={`preview-3d-toolbar-btn ${showSupports3D ? 'active' : ''}`}
          onClick={() => setShowSupports3D(!showSupports3D)}
          title="Show Supports"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 22 22 2 22" />
          </svg>
          <span>Supports</span>
        </button>
        <button
          className="preview-3d-toolbar-btn"
          onClick={handleImportIfc}
          title="Import IFC File"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Import IFC</span>
        </button>
        {ifcMembers.length > 0 && (
          <button
            className="preview-3d-toolbar-btn"
            onClick={() => setIfcMembers([])}
            title="Clear IFC"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Clear IFC ({ifcMembers.length})</span>
          </button>
        )}
      </div>
      <div className="preview-3d-hint">
        Drag to rotate | Shift+drag to pan | Scroll to zoom
      </div>
    </div>
  );
}
