/**
 * reference-loader.ts
 *
 * Manages the runtime geometry cache for imported reference meshes.
 *
 * Why not store Three.js objects in Zustand?
 *   Zustand (and React) expect state to be plain, serialisable JS objects.
 *   Three.js Groups / Meshes / Geometries are complex class instances with
 *   circular references — they cannot be JSON-stringified or diffed by React.
 *   So we keep two things separate:
 *     • Zustand  → serialisable metadata  (name, position, opacity, …)
 *     • This Map → the actual Three.js Group for each id
 *
 * Both are keyed by the same `id` string so the canvas component can look up
 * the geometry for any reference object it reads from the store.
 */

import * as THREE from 'three';
import type { ReferenceObject } from './voxel-store';

// ── Geometry cache ─────────────────────────────────────────────────────────────
// Module-level singleton: any component that imports this file shares the same Map.
export const refGeometryCache = new Map<string, THREE.Group>();

// ── Loader ────────────────────────────────────────────────────────────────────

/**
 * Parse a File object into a Three.js Group, register it in the cache and
 * return the initial ReferenceObject metadata record ready to add to the store.
 *
 * Supports: .stl  .obj  .glb  .gltf
 *
 * Auto-centering:
 *   Many files are exported with their origin far from the actual geometry
 *   (e.g. a wheel exported from a full-car scene keeps the car-body origin).
 *   After loading we wrap the mesh in a pivot Group and shift the inner mesh
 *   so its bounding-box centre sits exactly at the pivot's local origin.
 *   The user then moves the *pivot* via the Position inputs in the panel,
 *   starting from [0, 0, 0].
 */
export async function loadMeshFile(
  file: File
): Promise<Omit<ReferenceObject, 'includeInExport'>> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const arrayBuffer = await file.arrayBuffer();
  const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  let inner: THREE.Group;

  if (ext === 'stl') {
    const { STLLoader } = await import(
      'three/examples/jsm/loaders/STLLoader.js'
    );
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: '#88aadd',
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    inner = new THREE.Group();
    inner.add(mesh);

  } else if (ext === 'obj') {
    const { OBJLoader } = await import(
      'three/examples/jsm/loaders/OBJLoader.js'
    );
    const text = new TextDecoder().decode(arrayBuffer);
    const loader = new OBJLoader();
    inner = loader.parse(text);
    // Replace all materials with a consistent ghost material
    inner.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#88aadd',
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
      }
    });

  } else if (ext === 'glb' || ext === 'gltf') {
    const { GLTFLoader } = await import(
      'three/examples/jsm/loaders/GLTFLoader.js'
    );
    const loader = new GLTFLoader();
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve, reject);
    });
    inner = gltf.scene;
    // Make all meshes semi-transparent so the reference reads as a ghost
    inner.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        mats.forEach((m: THREE.Material) => {
          m.transparent = true;
          (m as THREE.MeshStandardMaterial).opacity = 0.5;
        });
      }
    });

  } else {
    throw new Error(
      `Unsupported format ".${ext}". Accepted: .stl, .obj, .glb, .gltf`
    );
  }

  // ── Auto-center: wrap in a pivot Group ──────────────────────────────────────
  // The pivot Group is what the canvas renders (and what the user moves).
  // The inner mesh is offset inside it so that the mesh's bounding-box centre
  // lands at the pivot's local origin → position [0,0,0] = mesh centred at origin.
  const pivot = new THREE.Group();
  const box = new THREE.Box3().setFromObject(inner);

  if (!box.isEmpty()) {
    const centre = box.getCenter(new THREE.Vector3());
    inner.position.set(-centre.x, -centre.y, -centre.z);
  }

  pivot.add(inner);
  refGeometryCache.set(id, pivot);

  return {
    id,
    name: file.name,
    visible: true,
    locked: true,   // default: locked (visual only) — user unlocks to place voxels on surface
    opacity: 0.5,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale:    [1, 1, 1],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Apply an opacity value to every material in the cached pivot group. */
export function setRefOpacity(id: string, opacity: number): void {
  const pivot = refGeometryCache.get(id);
  if (!pivot) return;
  pivot.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((m: THREE.Material) => {
        m.transparent = opacity < 1;
        (m as THREE.MeshStandardMaterial).opacity = opacity;
        m.needsUpdate = true;
      });
    }
  });
}

/**
 * Re-centre the mesh inside its pivot so the bounding-box centre is back at
 * the pivot's local origin.  The pivot's world position is unchanged.
 * Call this when the user clicks "Center" in the reference panel.
 */
export function recenterRefGeometry(id: string): void {
  const pivot = refGeometryCache.get(id);
  if (!pivot || pivot.children.length === 0) return;
  const inner = pivot.children[0] as THREE.Object3D;

  // Compute the pivot-local bounding box of the inner content
  const box = new THREE.Box3().setFromObject(inner);
  if (box.isEmpty()) return;

  const centre = box.getCenter(new THREE.Vector3());
  inner.position.sub(centre); // cancel out the offset
}

/**
 * Free GPU memory and remove the pivot from the cache.
 * Call this when the user deletes a reference object.
 */
export function disposeRefGeometry(id: string): void {
  const pivot = refGeometryCache.get(id);
  if (!pivot) return;
  pivot.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((m: THREE.Material) => m.dispose());
    }
  });
  refGeometryCache.delete(id);
}

/**
 * Calculates a uniform scale factor so the mesh's largest dimension
 * roughly equals the targetSize (default 16 units).
 * This doesn't apply the scale; it just computes it for the store.
 */
export function getFitScale(id: string, targetSize: number = 16): number {
  const pivot = refGeometryCache.get(id);
  if (!pivot || pivot.children.length === 0) return 1;
  const inner = pivot.children[0] as THREE.Object3D;

  const box = new THREE.Box3().setFromObject(inner);
  if (box.isEmpty()) return 1;

  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim === 0) return 1;
  return targetSize / maxDim;
}

/**
 * Calculates the Y offset required to make the lowest point of the mesh
 * sit exactly on the ground plane (Y = 0).
 */
export function getDropToGroundOffset(id: string): number {
  const pivot = refGeometryCache.get(id);
  if (!pivot) return 0;

  const box = new THREE.Box3().setFromObject(pivot);
  if (box.isEmpty()) return 0;

  // box.min.y is the lowest point of the mesh in world space.
  // We want that point to be exactly 0, so we return the inverse.
  return -box.min.y;
}
