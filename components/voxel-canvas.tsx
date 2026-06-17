'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useVoxelStore } from '@/lib/voxel-store';
import { refGeometryCache, setRefOpacity } from '@/lib/reference-loader';

// Shared geometry/material created once, outside component to avoid recreation
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const HOVER_GEO = new THREE.BoxGeometry(1, 1, 1);

function VoxelMesh() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groundPlaneRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<any>(null);

  const { getAllVoxels, currentTool, addVoxel, removeVoxel, paintVoxel, currentColor, gridSize, voxelSubdivision } =
    useVoxelStore();
  const { camera, raycaster, gl } = useThree();

  const voxelSize = 1 / voxelSubdivision;

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
    const tempColor = new THREE.Color();
    meshRef.current.count = voxels.length;

    voxels.forEach((voxel, index) => {
      // +0.5 on all axes so each voxel sits INSIDE its grid cell,
      // then scale down by voxelSize so e.g. 4×4 = 16 voxels fit per grid square.
      dummy.position.set(
        (voxel.x + 0.5) * voxelSize,
        (voxel.y + 0.5) * voxelSize,
        (voxel.z + 0.5) * voxelSize
      );
      dummy.scale.set(0.95 * voxelSize, 0.95 * voxelSize, 0.95 * voxelSize);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(index, dummy.matrix);

      tempColor.set(voxel.color);
      meshRef.current!.setColorAt(index, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [voxels, voxelSize]);

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
          // renderPos = (storePos + 0.5) * voxelSize
          // → storePos = renderPos / voxelSize - 0.5
          const storeX = Math.round(renderPos.x / voxelSize - 0.5);
          const storeY = Math.round(renderPos.y / voxelSize - 0.5);
          const storeZ = Math.round(renderPos.z / voxelSize - 0.5);

          if (currentTool === 'add') {
            // New voxel is one step along the face normal from the store position
            const nx = storeX + Math.round(normal.x);
            const ny = storeY + Math.round(normal.y);
            const nz = storeZ + Math.round(normal.z);
            if (ny >= 0) return [nx, ny, nz];
            return null;
          } else {
            // Remove, Paint, or Select tools target the exact voxel intersected
            return [storeX, storeY, storeZ];
          }
        }
      }

      // 2. Fall back: hit the ground plane
      if (groundPlaneRef.current) {
        // If we are removing or painting, we shouldn't target the ground plane.
        // We only want to interact with empty ground space when adding.
        if (currentTool !== 'add') return null;

        const hits = raycaster.intersectObject(groundPlaneRef.current);
        if (hits.length > 0) {
          const p = hits[0].point;
          // Divide by voxelSize then floor to snap to the correct voxel cell.
          // With voxelSize=0.25: clicking at world x=0.6 → store x = floor(0.6/0.25) = floor(2.4) = 2
          return [
            Math.floor(p.x / voxelSize),
            0,
            Math.floor(p.z / voxelSize),
          ];
        }
      }
      return null;
    },
    [camera, raycaster, voxels, voxelSize, currentTool]
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
          // Scale and position consistent with real voxel rendering
          position={[
            (hoveredPos[0] + 0.5) * voxelSize,
            (hoveredPos[1] + 0.5) * voxelSize,
            (hoveredPos[2] + 0.5) * voxelSize,
          ]}
          geometry={HOVER_GEO}
          material={hoverMaterial}
          scale={[1.05 * voxelSize, 1.05 * voxelSize, 1.05 * voxelSize]}
        />
      )}
    </>
  );
}

// ── Reference Objects renderer ────────────────────────────────────────────────

/**
 * Renders every imported reference mesh from the Zustand store.
 * The actual Three.js Groups live in refGeometryCache (see reference-loader.ts);
 * we read metadata (position, rotation, scale, visible) from the store and
 * apply them as props on a <primitive> element.
 */
function ReferenceObjects() {
  const referenceObjects = useVoxelStore((s) => s.referenceObjects);

  return (
    <>
      {referenceObjects.map((obj) => {
        const group = refGeometryCache.get(obj.id);
        if (!group || !obj.visible) return null;

        const rotRad = obj.rotation.map((deg) =>
          THREE.MathUtils.degToRad(deg)
        ) as [number, number, number];

        return (
          <primitive
            key={obj.id}
            object={group}
            position={obj.position}
            rotation={rotRad}
            scale={obj.scale}
          />
        );
      })}
    </>
  );
}

function Scene() {
  const { showGrid, gridSize, voxelSubdivision } = useVoxelStore();
  const voxelSize = 1 / voxelSubdivision;

  return (
    <>
      <color attach="background" args={['#1a1a1a']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />

      <VoxelMesh />
      <ReferenceObjects />

      {showGrid && (
        <Grid
          args={[gridSize * 2, gridSize * 2]}
          // Fine sub-grid: one cell per voxel slot
          cellSize={voxelSize}
          cellColor="#1e3a4a"
          cellThickness={0.4}
          // Coarse grid: one section per original grid square (1.0 world units)
          sectionSize={1}
          sectionColor="#2255aa"
          sectionThickness={1.2}
          fadeDistance={30}
          fadeStrength={1.5}
        />
      )}

        <OrbitControls
          makeDefault
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
          autoRotate={false}
          minDistance={0.5}
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
          // Start closer so individual 0.25-unit voxels are visible
          position: [8, 8, 8],
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
