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

function VoxelMesh({ orbitRef }: { orbitRef: React.MutableRefObject<any> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groundPlaneRef = useRef<THREE.Mesh>(null);

  const {
    getAllVoxels, currentTool,
    addVoxel, removeVoxel, paintVoxel, batchAddVoxels, fillVoxels,
    currentColor, gridSize, voxelSubdivision,
    continuousMode,
    symmetry, symmetryOffset,
    beginInteraction
  } = useVoxelStore();
  const { camera, raycaster, gl } = useThree();

  const voxelSize = 1 / voxelSubdivision;

  const [hoveredPos, setHoveredPos] = useState<[number, number, number] | null>(null);


  // Stable material — created once
  const material = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: '#ffffff',
        emissive: '#444444',
      }),
    []
  );

  // Ref callback: pre-initialize instanceColor buffer BEFORE first render
  // so the Three.js shader compiles with USE_INSTANCING_COLOR support.
  const meshRefCallback = useCallback((mesh: THREE.InstancedMesh | null) => {
    meshRef.current = mesh;
    if (mesh && !mesh.instanceColor) {
      const colors = new Float32Array(250000 * 3).fill(1); // default white
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      mesh.instanceColor.needsUpdate = true;
      mesh.count = 0; // no visible instances yet
    }
  }, []);

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

  // Track drag-to-draw state
  const isDrawing = useRef(false);
  const lastDrawnPos = useRef<string | null>(null);

  // Track Box tool state
  const boxStartPos = useRef<[number, number, number] | null>(null);

  // Track how far the mouse has moved since pointerdown to distinguish click vs drag
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const DRAG_THRESHOLD = 10; // pixels

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
    meshRef.current.computeBoundingSphere();
  }, [voxels, voxelSize]);

  // Update hover-ghost material color when tool or currentColor changes
  useEffect(() => {
    if (!hoverMaterial) return;
    let c = '#00ff00'; // default green for add/box/select
    if (currentTool === 'remove') c = '#ff0000';
    else if (currentTool === 'paint' || currentTool === 'fill') c = currentColor;
    hoverMaterial.color.set(c);
    hoverMaterial.emissive.set(c);
  }, [currentTool, currentColor, hoverMaterial]);

  /**
   * Compute the hovered grid position by raycasting against:
   *   1. Existing voxels (instanced mesh) → place on top face
   *   2. The invisible ground plane          → place at y=0
   * Used for hover visual feedback (always shows cursor).
   */
  const computeHoverPos = useCallback(
    (ndc: THREE.Vector2): [number, number, number] | null => {
      raycaster.setFromCamera(ndc, camera);

      // 1. Try hitting existing voxels first
      if (meshRef.current && voxels.length > 0) {
        const hits = raycaster.intersectObject(meshRef.current);
        const validHit = hits.find((h) => h.instanceId !== undefined && h.instanceId < voxels.length);
        if (validHit) {
          const normal = validHit.face?.normal ?? new THREE.Vector3(0, 1, 0);
          const idx = validHit.instanceId!;
          const voxel = voxels[idx];
          const storeX = voxel.x;
          const storeY = voxel.y;
          const storeZ = voxel.z;

          if (currentTool === 'add' || currentTool === 'box') {
            const nx = storeX + Math.round(normal.x);
            const ny = storeY + Math.round(normal.y);
            const nz = storeZ + Math.round(normal.z);
            if (ny >= 0) return [nx, ny, nz];
            return null;
          } else {
            return [storeX, storeY, storeZ];
          }
        }
      }

      // 2. Fall back: hit the ground plane (always, for visual hover feedback)
      if (groundPlaneRef.current) {
        const hits = raycaster.intersectObject(groundPlaneRef.current);
        if (hits.length > 0) {
          const p = hits[0].point;
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

  /**
   * Raycast ONLY against existing voxels — returns the exact voxel position hit.
   * Used by paint/fill/remove tools that need to target a real block.
   */
  const computeVoxelHitPos = useCallback(
    (ndc: THREE.Vector2): [number, number, number] | null => {
      raycaster.setFromCamera(ndc, camera);
      if (!meshRef.current || voxels.length === 0) return null;

      const hits = raycaster.intersectObject(meshRef.current);
      const validHit = hits.find((h) => h.instanceId !== undefined && h.instanceId < voxels.length);
      if (!validHit) return null;

      const voxel = voxels[validHit.instanceId!];
      return [voxel.x, voxel.y, voxel.z];
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

  // ── Tool Execution ─────────────────────────────────────────────────────────

  const executeTool = useCallback(
    (ndc: THREE.Vector2, skipHistory: boolean = false) => {
      if (currentTool === 'add') {
        const pos = computeHoverPos(ndc);
        if (!pos) return;
        const [x, y, z] = pos;
        const posKey = `${x},${y},${z}`;
        if (skipHistory && lastDrawnPos.current === posKey) return;
        lastDrawnPos.current = posKey;
        addVoxel({ x, y, z, color: currentColor }, undefined, skipHistory);
      } else if (currentTool === 'remove') {
        const pos = computeVoxelHitPos(ndc);
        if (!pos) return;
        const [x, y, z] = pos;
        const posKey = `${x},${y},${z}`;
        if (skipHistory && lastDrawnPos.current === posKey) return;
        lastDrawnPos.current = posKey;
        removeVoxel(x, y, z, undefined, skipHistory);
      } else if (currentTool === 'paint') {
        const pos = computeVoxelHitPos(ndc);
        if (!pos) return;
        const [x, y, z] = pos;
        const posKey = `${x},${y},${z}`;
        if (skipHistory && lastDrawnPos.current === posKey) return;
        lastDrawnPos.current = posKey;
        paintVoxel(x, y, z, currentColor, undefined, skipHistory);
      } else if (currentTool === 'fill') {
        if (!skipHistory) {
          const pos = computeVoxelHitPos(ndc);
          if (!pos) return;
          const [x, y, z] = pos;
          fillVoxels(x, y, z, currentColor, undefined);
        }
      }
    },
    [computeHoverPos, computeVoxelHitPos, currentTool, currentColor, addVoxel, removeVoxel, paintVoxel, fillVoxels]
  );

  // ── Pointer event handlers (attached to canvas DOM element) ────────────────

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return; // Only trigger tools on left click
    
    const ndc = domToNDC(e);
    const pos = computeHoverPos(ndc);
    
    // Ctrl+Drag acts as a shortcut for the Box tool
    const isBoxTool = currentTool === 'box' || e.ctrlKey || e.metaKey;

    // Handle Box tool
    if (isBoxTool) {
      if (pos) {
        boxStartPos.current = pos;
        if (orbitRef.current) orbitRef.current.enabled = false;
        if (gl.domElement.setPointerCapture) {
          gl.domElement.setPointerCapture(e.pointerId);
        }
      }
      return;
    }

    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;

    if (continuousMode && (currentTool === 'add' || currentTool === 'paint' || currentTool === 'remove')) {
      if (orbitRef.current) orbitRef.current.enabled = false;
      isDrawing.current = true;
      lastDrawnPos.current = null;
      beginInteraction(); // Start history batch

      executeTool(ndc, true); // true = skip individual history save since beginInteraction handled it
      
      // Capture pointer so dragging outside the canvas still works
      if (gl.domElement.setPointerCapture) {
        gl.domElement.setPointerCapture(e.pointerId);
      }
    }
  }, [beginInteraction, domToNDC, executeTool, gl.domElement, computeHoverPos, currentTool, orbitRef, continuousMode]);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const ndc = domToNDC(e);
      setHoveredPos(computeHoverPos(ndc));

      // Detect drag for non-ctrl clicks
      if (pointerDownPos.current && !isDrawing.current) {
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          isDragging.current = true;
        }
      }

      if (isDrawing.current) {
        executeTool(ndc, true);
      }
    },
    [domToNDC, computeHoverPos, executeTool]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      
      // Handle Box tool completion
      if (boxStartPos.current) {
        const endPos = computeHoverPos(domToNDC(e)) || hoveredPos;
        if (endPos) {
          const [x1, y1, z1] = boxStartPos.current;
          const [x2, y2, z2] = endPos;
          
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const minZ = Math.min(z1, z2);
          const maxZ = Math.max(z1, z2);
          
          const vol = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
          if (vol < 100000) {
            const voxelsToApply: {x: number, y: number, z: number, color: string}[] = [];
            for (let x = minX; x <= maxX; x++) {
              for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                  voxelsToApply.push({ x, y, z, color: currentColor });
                }
              }
            }
            batchAddVoxels(voxelsToApply);
          } else {
            console.warn(`Box too large to generate! Vol: ${vol}`);
          }
        }
        boxStartPos.current = null;
        if (orbitRef.current) orbitRef.current.enabled = true;
        if (gl.domElement.releasePointerCapture) {
          gl.domElement.releasePointerCapture(e.pointerId);
        }
        return;
      }

      if (isDrawing.current) {
        // Finishing a continuous paint
        isDrawing.current = false;
        lastDrawnPos.current = null;
        if (orbitRef.current) orbitRef.current.enabled = true;
        
        if (gl.domElement.releasePointerCapture) {
          gl.domElement.releasePointerCapture(e.pointerId);
        }
      } else {
        // Finishing a normal click (no ctrl)
        if (!isDragging.current) {
          // It was a single click without dragging, so execute tool once
          const ndc = domToNDC(e);
          executeTool(ndc, false); // don't skip history
        }
      }

      pointerDownPos.current = null;
      isDragging.current = false;
    },
    [domToNDC, executeTool, gl.domElement, computeHoverPos, hoveredPos, currentTool, batchAddVoxels, currentColor, orbitRef]
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
      <instancedMesh
        ref={meshRefCallback}
        args={[BOX_GEO, material, 250000]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      {/* Box Tool Ghost Preview */}
      {boxStartPos.current && hoveredPos && (
        <mesh
          position={[
            (Math.min(boxStartPos.current[0], hoveredPos[0]) + (Math.max(boxStartPos.current[0], hoveredPos[0]) - Math.min(boxStartPos.current[0], hoveredPos[0])) / 2 + 0.5) * voxelSize,
            (Math.min(boxStartPos.current[1], hoveredPos[1]) + (Math.max(boxStartPos.current[1], hoveredPos[1]) - Math.min(boxStartPos.current[1], hoveredPos[1])) / 2 + 0.5) * voxelSize,
            (Math.min(boxStartPos.current[2], hoveredPos[2]) + (Math.max(boxStartPos.current[2], hoveredPos[2]) - Math.min(boxStartPos.current[2], hoveredPos[2])) / 2 + 0.5) * voxelSize,
          ]}
          scale={[
            (Math.max(boxStartPos.current[0], hoveredPos[0]) - Math.min(boxStartPos.current[0], hoveredPos[0]) + 1) * voxelSize,
            (Math.max(boxStartPos.current[1], hoveredPos[1]) - Math.min(boxStartPos.current[1], hoveredPos[1]) + 1) * voxelSize,
            (Math.max(boxStartPos.current[2], hoveredPos[2]) - Math.min(boxStartPos.current[2], hoveredPos[2]) + 1) * voxelSize,
          ]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={currentColor} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      )}

      {/* Hover ghost (only show if not drawing a box) */}
      {hoveredPos && !boxStartPos.current && (
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

      {/* Visual Mirror Planes */}
      {symmetry.x && (
        <mesh position={[symmetryOffset.x * voxelSize, gridSize / 2, 0]}>
          <boxGeometry args={[0.02, gridSize, gridSize * 2]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      )}
      {symmetry.y && (
        <mesh position={[0, symmetryOffset.y * voxelSize, 0]}>
          <boxGeometry args={[gridSize * 2, 0.02, gridSize * 2]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      )}
      {symmetry.z && (
        <mesh position={[0, gridSize / 2, symmetryOffset.z * voxelSize]}>
          <boxGeometry args={[gridSize * 2, gridSize, 0.02]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} depthWrite={false} />
        </mesh>
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
  const orbitRef = useRef<any>(null);

  return (
    <>
      <color attach="background" args={['#1a1a1a']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />

      <VoxelMesh orbitRef={orbitRef} />
      <ReferenceObjects />

      {showGrid && (
        <>
          <axesHelper args={[gridSize * 1.5]} />
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
        </>
      )}

      <OrbitControls
        ref={orbitRef}
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
