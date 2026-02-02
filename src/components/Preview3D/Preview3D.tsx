import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFEM } from '../../context/FEMContext';
import { calculateBeamLength } from '../../core/fem/Beam';
import { buildNodeIdToIndex } from '../../core/solver/Assembler';
import './Preview3D.css';

// Simple orbit controls (mouse drag to rotate, scroll to zoom)
class SimpleOrbitControls {
  camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3();
  private spherical = new THREE.Spherical(10, Math.PI / 3, Math.PI / 4);
  private isDown = false;
  private lastMouse = { x: 0, y: 0 };
  private dom: HTMLElement;

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.camera = camera;
    this.dom = dom;
    dom.addEventListener('mousedown', this.onMouseDown);
    dom.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('mouseup', this.onMouseUp);
    dom.addEventListener('mouseleave', this.onMouseUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
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
    this.lastMouse = { x: e.clientX, y: e.clientY };
  };
  private onMouseUp = () => { this.isDown = false; };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDown) return;
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.lastMouse = { x: e.clientX, y: e.clientY };

    if (e.shiftKey || e.button === 1) {
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
}

export function Preview3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<SimpleOrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);

  const { state } = useFEM();
  const { mesh, result, showDeformed, deformationScale, analysisType } = state;

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

      // Draw load arrows (supports hidden in 3D view)
      if (node.constraints.x || node.constraints.y || node.constraints.rotation) {
        // Draw load arrows
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

    // Fit camera to scene
    if (controlsRef.current && !boundingBox.isEmpty()) {
      controlsRef.current.fitToScene(boundingBox);
    }
  }, [mesh, result, showDeformed, deformationScale, state.selection]);

  // Helper to map node IDs to result indices (active nodes only)
  const getNodeIdToIndex = useCallback((): Map<number, number> => {
    return buildNodeIdToIndex(mesh, analysisType);
  }, [mesh, analysisType]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
      controls.dispose();
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

  return (
    <div className="preview-3d" ref={containerRef}>
      <div className="preview-3d-hint">
        Drag to rotate | Shift+drag to pan | Scroll to zoom
      </div>
    </div>
  );
}
