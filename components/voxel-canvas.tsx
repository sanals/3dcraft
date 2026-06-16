'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useVoxelStore } from '@/lib/voxel-store';

// Shared geometry/material created once, outside component to avoid recreation
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const HOVER_GEO = new THREE.BoxGeometry(1, 1, 1);

function VoxelMesh() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groundPlaneRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<any>(null);

  const { getAllVoxels, currentTool, addVoxel, removeVoxel, paintVoxel, currentColor, gridSize } =
    useVoxelStore();
  const { camera, raycaster, gl } = useThree();

  const [hoveredPos, setHoveredPos] = useState<[number, number, number] | null>(null);

  // Stable material — created once
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#444444',
        metalness: 0.3,
        roughness: 0.4,
        vertexColors: true,
      }),
    []
  );

  const hoverMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#00ff00',
        emissive: '#00ff00',
        emissiveIntensity: 0.3,
        wireframe: true,
        transparent: true,
      }),
    []
  );

  // Track how far the mouse has moved since pointerdown to distinguish click vs drag
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const DRAG_THRESHOLD = 4; // pixels

  const voxels = getAllVoxels();

  // Update instanced mesh whenever voxels change
  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();
    meshRef.current.count = voxels.length;

    const colors = new Float32Array(voxels.length * 3);

    voxels.forEach((voxel, index) => {
      // +0.5 on all axes so each voxel sits INSIDE its grid cell,
      // not on the intersection of grid lines.
      dummy.position.set(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5);
      dummy.scale.set(0.95, 0.95, 0.95);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(index, dummy.matrix);

      const hex = voxel.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      colors[index * 3] = r;
      colors[index * 3 + 1] = g;
      colors[index * 3 + 2] = b;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Always delete and recreate the color attribute — Three.js does not support
    // resizing an existing buffer attribute, so we can never patch the old array
    // when the voxel count changes.
    meshRef.current.geometry.deleteAttribute('color');
    meshRef.current.geometry.setAttribute(
      'color',
      new THREE.InstancedBufferAttribute(colors, 3)
    );
  }, [voxels]);

  // Update hover-ghost material color when tool or currentColor changes
  useEffect(() => {
    if (!hoverMaterial) return;
    const c =
      currentTool === 'remove' ? '#ff0000' : currentTool === 'paint' ? currentColor : '#00ff00';
    hoverMaterial.color.set(c);
    hoverMaterial.emissive.set(c);
  }, [currentTool, currentColor, hoverMaterial]);

  /**
   * Compute the hovered grid position by raycasting against:
   *   1. Existing voxels (instanced mesh) → place on top face
   *   2. The invisible ground plane          → place at y=0
   */
  const computeHoverPos = useCallback(
    (ndc: THREE.Vector2): [number, number, number] | null => {
      raycaster.setFromCamera(ndc, camera);

      // 1. Try hitting existing voxels first
      if (meshRef.current && voxels.length > 0) {
        const hits = raycaster.intersectObject(meshRef.current);
        if (hits.length > 0) {
          const hit = hits[0];
          // The face normal tells us which face was hit
          const normal = hit.face?.normal ?? new THREE.Vector3(0, 1, 0);
          // instanceId gives us the voxel
          const idx = hit.instanceId ?? 0;
          const matrix = new THREE.Matrix4();
          meshRef.current.getMatrixAt(idx, matrix);
          const renderPos = new THREE.Vector3().setFromMatrixPosition(matrix);
          // renderPos = storePos + 0.5 on all axes  →  storePos = renderPos - 0.5
          const storeX = Math.round(renderPos.x - 0.5);
          const storeY = Math.round(renderPos.y - 0.5);
          const storeZ = Math.round(renderPos.z - 0.5);
          // New voxel is one step along the face normal from the store position
          const nx = storeX + Math.round(normal.x);
          const ny = storeY + Math.round(normal.y);
          const nz = storeZ + Math.round(normal.z);
          if (ny >= 0) return [nx, ny, nz];
        }
      }

      // 2. Fall back: hit the ground plane
      if (groundPlaneRef.current) {
        const hits = raycaster.intersectObject(groundPlaneRef.current);
        if (hits.length > 0) {
          const p = hits[0].point;
          // Math.floor maps world position to cell index:
          // cell 0 spans world 0–1, cell 1 spans 1–2, etc.
          return [Math.floor(p.x), 0, Math.floor(p.z)];
        }
      }
      return null;
    },
    [camera, raycaster, voxels]
  );

  // Convert native DOM event to NDC for raycasting
  const domToNDC = useCallback(
    (e: MouseEvent | PointerEvent): THREE.Vector2 => {
      const rect = gl.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    },
    [gl]
  );

  // ── Pointer event handlers (attached to canvas DOM element) ────────────────

  const handlePointerDown = useCallback((e: PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      // Detect drag
      if (pointerDownPos.current) {
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          isDragging.current = true;
        }
      }

      const ndc = domToNDC(e);
      setHoveredPos(computeHoverPos(ndc));
    },
    [domToNDC, computeHoverPos]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      // Only fire if this was a clean click (not a drag)
      if (!isDragging.current && e.button === 0) {
        const ndc = domToNDC(e);
        const pos = computeHoverPos(ndc);
        if (!pos) return;
        const [x, y, z] = pos;

        if (currentTool === 'add') {
          addVoxel({ x, y, z, color: currentColor });
        } else if (currentTool === 'remove') {
          removeVoxel(x, y, z);
        } else if (currentTool === 'paint') {
          paintVoxel(x, y, z, currentColor);
        }
      }
      pointerDownPos.current = null;
      isDragging.current = false;
    },
    [currentTool, currentColor, addVoxel, removeVoxel, paintVoxel, domToNDC, computeHoverPos]
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredPos(null);
    pointerDownPos.current = null;
    isDragging.current = false;
  }, []);

  // Attach native events to the WebGL canvas (avoids R3F event conflicts)
  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [gl, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave]);

  return (
    <>
      {/* Invisible ground plane — raycasting target only */}
      <mesh
        ref={groundPlaneRef}
        position={[0, -0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <planeGeometry args={[gridSize * 4, gridSize * 4]} />
        <meshBasicMaterial />
      </mesh>

      {/* Actual voxels */}
      {voxels.length > 0 && (
        <instancedMesh
          ref={meshRef}
          args={[BOX_GEO, material, Math.max(voxels.length, 1)]}
          castShadow
          receiveShadow
        />
      )}

      {/* Hover ghost */}
      {hoveredPos && (
        <mesh
          // +0.5 on all axes matches the render offset applied to real voxels
          position={[hoveredPos[0] + 0.5, hoveredPos[1] + 0.5, hoveredPos[2] + 0.5]}
          geometry={HOVER_GEO}
          material={hoverMaterial}
          scale={[1.05, 1.05, 1.05]}
        />
      )}
    </>
  );
}

function Scene() {
  const { showGrid, gridSize } = useVoxelStore();

  return (
    <>
      <color attach="background" args={['#1a1a1a']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />

      <VoxelMesh />

      {showGrid && <Grid args={[gridSize * 2, gridSize * 2]} cellSize={1} />}

      <OrbitControls
        makeDefault
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        autoRotate={false}
        minDistance={5}
        maxDistance={100}
        enablePan={true}
      />
    </>
  );
}

export function VoxelCanvas() {
  return (
    <div className="flex-1 w-full overflow-hidden">
      <Canvas
        camera={{
          position: [20, 20, 20],
          fov: 50,
          far: 10000,
        }}
        gl={{
          antialias: true,
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
