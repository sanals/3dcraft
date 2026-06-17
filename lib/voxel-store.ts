/**
 * voxel-store.ts
 *
 * Single Zustand store for the voxel editor.
 * Organized into clear sections:
 *   Grid · Layers · Voxels · Tools · History · View · Reference Objects · File
 *
 * Design decisions:
 *  • History snapshots are PLAIN DATA only — never functions or class instances.
 *    This makes undo/redo trivially safe and keeps snapshots tiny.
 *  • All mutation actions validate inputs and emit descriptive console.warn()
 *    messages so bugs show up in the browser console during development.
 *  • Reference objects are NOT part of undo/redo history — they are import
 *    metadata, not creative work.
 */

import { create } from 'zustand';

// ══════════════════════════════════════════════════════════════════════════════
// Public types
// ══════════════════════════════════════════════════════════════════════════════

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  voxels: Voxel[];
}

export type Tool = 'add' | 'remove' | 'paint' | 'select' | 'box';

/**
 * An imported reference mesh (STL / OBJ / GLB).
 * Three.js geometry is stored in refGeometryCache in reference-loader.ts;
 * only serialisable metadata lives here.
 */
export interface ReferenceObject {
  id: string;
  name: string;
  visible: boolean;
  /** Locked = visual guide only; no voxel placement on its surface. */
  locked: boolean;
  /** 0.05 – 1.0. Applied to all child materials in the scene. */
  opacity: number;
  /** Include geometry when exporting OBJ / 3MF (opt-in per object). */
  includeInExport: boolean;
  position: [number, number, number];
  /** Euler angles in degrees. */
  rotation: [number, number, number];
  scale: [number, number, number];
}

// ══════════════════════════════════════════════════════════════════════════════
// Store interface
// ══════════════════════════════════════════════════════════════════════════════

export interface VoxelEditorState {
  // ── Grid ──────────────────────────────────────────────────────────────────
  gridSize: number;
  setGridSize: (size: number) => void;
  /** Number of voxels per edge of a single grid square. Default: 4 */
  voxelSubdivision: number;
  setVoxelSubdivision: (sub: number) => void;

  // ── Layers ────────────────────────────────────────────────────────────────
  layers: Layer[];
  activeLayerId: string | null;
  addLayer: (name: string) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  /** Return voxels for a specific layer (used for per-layer export). */
  getLayerVoxels: (layerId: string) => Voxel[];

  // ── Voxels ────────────────────────────────────────────────────────────────
  addVoxel: (voxel: Voxel, layerId?: string, skipHistory?: boolean) => void;
  batchAddVoxels: (voxels: Voxel[], layerId?: string) => void;
  removeVoxel: (x: number, y: number, z: number, layerId?: string, skipHistory?: boolean) => void;
  paintVoxel: (x: number, y: number, z: number, color: string, layerId?: string, skipHistory?: boolean) => void;
  getVoxelAt: (x: number, y: number, z: number, layerId?: string) => Voxel | undefined;
  /** Returns voxels from all *visible* layers combined. */
  getAllVoxels: () => Voxel[];

  // ── History ───────────────────────────────────────────────────────────────
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Call before starting a continuous interaction (e.g. drag-to-draw) so it is grouped as one undo step. */
  beginInteraction: () => void;

  // ── Tools & Color ─────────────────────────────────────────────────────────
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;

  // ── Mass Placement & Symmetry ─────────────────────────────────────────────
  symmetry: { x: boolean; y: boolean; z: boolean };
  setSymmetry: (axis: 'x' | 'y' | 'z', enabled: boolean) => void;
  symmetryOffset: { x: number; y: number; z: number };
  setSymmetryOffset: (axis: 'x' | 'y' | 'z', offset: number) => void;

  // ── History ───────────────────────────────────────────────────────────────
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // ── View ──────────────────────────────────────────────────────────────────
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;

  // ── Reference Objects ─────────────────────────────────────────────────────
  referenceObjects: ReferenceObject[];
  addReferenceObject: (obj: ReferenceObject) => void;
  removeReferenceObject: (id: string) => void;
  updateReferenceObject: (id: string, patch: Partial<ReferenceObject>) => void;

  // ── File Operations ───────────────────────────────────────────────────────
  clearAll: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// Validation helpers
// ══════════════════════════════════════════════════════════════════════════════

/** Accept only 6-digit hex colours like "#FF0000". */
const isHexColor = (v: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(v);

const GRID_MIN = 4;
const GRID_MAX = 64;
const MAX_HISTORY_DEPTH = 50;

function warn(action: string, message: string): void {
  console.warn(`[VoxelStore / ${action}] ${message}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// History snapshot type — PLAIN DATA only, never functions
// ══════════════════════════════════════════════════════════════════════════════

interface Snapshot {
  layers: Layer[];
  activeLayerId: string | null;
  gridSize: number;
  voxelSubdivision: number;
  currentColor: string;
  currentTool: Tool;
  symmetry: { x: boolean; y: boolean; z: boolean };
  symmetryOffset: { x: number; y: number; z: number };
  showGrid: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// Symmetry Helper
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns all mirrored coordinates for a given point based on the active symmetry axes.
 * Mirroring occurs across the world origin (x=0, y=0, z=0).
 * Since voxels occupy physical width, a voxel at x=0 spans from 0 to +w.
 * Its mirror across x=0 is exactly x=-1 (which spans from -w to 0).
 * Thus, the mirrored coordinate is always `-val - 1`.
 */
function getSymmetricPoints(
  x: number,
  y: number,
  z: number,
  sym: { x: boolean; y: boolean; z: boolean },
  offset: { x: number; y: number; z: number }
): [number, number, number][] {
  const points: [number, number, number][] = [[x, y, z]];

  if (sym.x) {
    const len = points.length;
    for (let i = 0; i < len; i++) {
      points.push([2 * offset.x - points[i][0] - 1, points[i][1], points[i][2]]);
    }
  }
  if (sym.y) {
    const len = points.length;
    for (let i = 0; i < len; i++) {
      points.push([points[i][0], 2 * offset.y - points[i][1] - 1, points[i][2]]);
    }
  }
  if (sym.z) {
    const len = points.length;
    for (let i = 0; i < len; i++) {
      points.push([points[i][0], points[i][1], 2 * offset.z - points[i][2] - 1]);
    }
  }

  return points;
}

// ══════════════════════════════════════════════════════════════════════════════
// Store
// ══════════════════════════════════════════════════════════════════════════════

export const useVoxelStore = create<VoxelEditorState>()((set, get) => {
  // ── History state ── private to this closure ────────────────────────────
  const past: Snapshot[] = [];
  const future: Snapshot[] = [];

  /** Deep-copy the current plain-data fields into a snapshot. */
  const takeSnapshot = (): Snapshot => {
    const s = get();
    return {
      layers: JSON.parse(JSON.stringify(s.layers)),
      activeLayerId: s.activeLayerId,
      gridSize: s.gridSize,
      voxelSubdivision: s.voxelSubdivision,
      currentColor: s.currentColor,
      currentTool: s.currentTool,
      symmetry: { ...s.symmetry },
      symmetryOffset: { ...s.symmetryOffset },
      showGrid: s.showGrid,
    };
  };

  /**
   * Call before any destructive mutation.
   * Pushes the current state onto the past stack and clears the redo stack.
   */
  const saveToHistory = () => {
    past.push(takeSnapshot());
    if (past.length > MAX_HISTORY_DEPTH) past.shift();
    future.length = 0;
    set({ canUndo: true, canRedo: false });
  };

  /** Sync the canUndo / canRedo flags after a history operation. */
  const syncFlags = () =>
    set({ canUndo: past.length > 0, canRedo: future.length > 0 });

  /** Resolve an optional layerId to the active layer id. */
  const resolveLayer = (layerId?: string): string | null =>
    layerId ?? get().activeLayerId;

  // ════════════════════════════════════════════════════════════════════════════
  return {
    // ── Grid ────────────────────────────────────────────────────────────────
    gridSize: 16,

    setGridSize: (size) => {
      const clamped = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(size)));
      if (clamped !== Math.round(size)) {
        warn('setGridSize', `${size} is outside [${GRID_MIN}–${GRID_MAX}], clamped to ${clamped}.`);
      }
      saveToHistory();
      set({ gridSize: clamped });
    },

    voxelSubdivision: 4,

    setVoxelSubdivision: (sub) => {
      const clamped = Math.max(1, Math.min(16, Math.round(sub)));
      saveToHistory();
      set({ voxelSubdivision: clamped });
    },

    // ── Layers ──────────────────────────────────────────────────────────────
    layers: [{ id: 'layer-0', name: 'Layer 1', visible: true, voxels: [] }],
    activeLayerId: 'layer-0',

    addLayer: (name) => {
      const trimmed = name?.trim();
      if (!trimmed) {
        warn('addLayer', 'Layer name must not be empty.');
        return;
      }
      saveToHistory();
      const id = `layer-${Date.now()}`;
      set((s) => ({
        layers: [...s.layers, { id, name: trimmed, visible: true, voxels: [] }],
        activeLayerId: id, // automatically switch to the new layer
      }));
    },

    removeLayer: (id) => {
      const { layers } = get();
      if (layers.length <= 1) {
        warn('removeLayer', 'Cannot remove the last remaining layer.');
        return;
      }
      if (!layers.some((l) => l.id === id)) {
        warn('removeLayer', `Layer "${id}" does not exist.`);
        return;
      }
      saveToHistory();
      set((s) => {
        const remaining = s.layers.filter((l) => l.id !== id);
        return {
          layers: remaining,
          activeLayerId:
            s.activeLayerId === id ? (remaining[0]?.id ?? null) : s.activeLayerId,
        };
      });
    },

    setActiveLayer: (id) => {
      if (!get().layers.some((l) => l.id === id)) {
        warn('setActiveLayer', `Layer "${id}" does not exist.`);
        return;
      }
      set({ activeLayerId: id });
    },

    toggleLayerVisibility: (id) => {
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
      }));
    },

    renameLayer: (id, name) => {
      const trimmed = name?.trim();
      if (!trimmed) {
        warn('renameLayer', 'Layer name must not be empty.');
        return;
      }
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, name: trimmed } : l)),
      }));
    },

    getLayerVoxels: (layerId) =>
      get().layers.find((l) => l.id === layerId)?.voxels ?? [],

    // ── Voxels ──────────────────────────────────────────────────────────────
    addVoxel: (voxel, layerId?, skipHistory?) => {
      if (!isHexColor(voxel.color)) {
        warn('addVoxel', `"${voxel.color}" is not a valid hex color (e.g. "#FF0000").`);
        return;
      }
      const targetId = resolveLayer(layerId);
      if (!targetId) { warn('addVoxel', 'No active layer to add to.'); return; }

      if (!skipHistory) saveToHistory();
      set((s) => ({
        layers: s.layers.map((l) => {
          if (l.id !== targetId) return l;

          const points = getSymmetricPoints(voxel.x, voxel.y, voxel.z, s.symmetry, s.symmetryOffset);
          let newVoxels = [...l.voxels];

          for (const [px, py, pz] of points) {
            const exists = newVoxels.some((v) => v.x === px && v.y === py && v.z === pz);
            if (!exists) {
              newVoxels.push({ x: px, y: py, z: pz, color: voxel.color });
            }
          }

          return { ...l, voxels: newVoxels };
        }),
      }));
    },

    batchAddVoxels: (voxelsToApply, layerId?) => {
      const targetId = resolveLayer(layerId);
      if (!targetId) { warn('batchAddVoxels', 'No active layer to add to.'); return; }
      if (voxelsToApply.length === 0) return;

      saveToHistory();
      set((s) => ({
        layers: s.layers.map((l) => {
          if (l.id !== targetId) return l;

          let newVoxels = [...l.voxels];
          
          for (const voxel of voxelsToApply) {
            if (!isHexColor(voxel.color)) continue;
            
            const points = getSymmetricPoints(voxel.x, voxel.y, voxel.z, s.symmetry, s.symmetryOffset);
            for (const [px, py, pz] of points) {
              const exists = newVoxels.some((v) => v.x === px && v.y === py && v.z === pz);
              if (!exists) {
                newVoxels.push({ x: px, y: py, z: pz, color: voxel.color });
              }
            }
          }

          return { ...l, voxels: newVoxels };
        }),
      }));
    },

    removeVoxel: (x, y, z, layerId?, skipHistory?) => {
      const targetId = resolveLayer(layerId);
      if (!targetId) { warn('removeVoxel', 'No active layer.'); return; }

      if (!skipHistory) saveToHistory();
      set((s) => ({
        layers: s.layers.map((l) => {
          if (l.id !== targetId) return l;

          const points = getSymmetricPoints(x, y, z, s.symmetry, s.symmetryOffset);
          const newVoxels = l.voxels.filter(
            (v) => !points.some(([px, py, pz]) => px === v.x && py === v.y && pz === v.z)
          );

          return { ...l, voxels: newVoxels };
        }),
      }));
    },

    paintVoxel: (x, y, z, color, layerId?, skipHistory?) => {
      if (!isHexColor(color)) {
        warn('paintVoxel', `"${color}" is not a valid hex color.`);
        return;
      }
      const targetId = resolveLayer(layerId);
      if (!targetId) { warn('paintVoxel', 'No active layer.'); return; }

      if (!skipHistory) saveToHistory();
      set((s) => ({
        layers: s.layers.map((l) => {
          if (l.id !== targetId) return l;

          const points = getSymmetricPoints(x, y, z, s.symmetry, s.symmetryOffset);
          let changed = false;

          const newVoxels = l.voxels.map((v) => {
            if (points.some(([px, py, pz]) => px === v.x && py === v.y && pz === v.z)) {
              changed = true;
              return { ...v, color };
            }
            return v;
          });

          return changed ? { ...l, voxels: newVoxels } : l;
        }),
      }));
    },

    getVoxelAt: (x, y, z, layerId?) => {
      const targetId = resolveLayer(layerId);
      if (!targetId) return undefined;
      return get()
        .layers.find((l) => l.id === targetId)
        ?.voxels.find((v) => v.x === x && v.y === y && v.z === z);
    },

    getAllVoxels: () =>
      get().layers.filter((l) => l.visible).flatMap((l) => l.voxels),

    // ── Tools & Color ────────────────────────────────────────────────────────
    currentColor: '#FF0000',

    setCurrentColor: (color) => {
      if (!isHexColor(color)) {
        warn('setCurrentColor', `"${color}" is not a valid hex color. Ignored.`);
        return;
      }
      set({ currentColor: color });
    },

    currentTool: 'add',
    setCurrentTool: (tool) => set({ currentTool: tool }),

    // ── Mass Placement & Symmetry ─────────────────────────────────────────────
    symmetry: { x: false, y: false, z: false },
    setSymmetry: (axis, enabled) => {
      saveToHistory();
      set((s) => ({ symmetry: { ...s.symmetry, [axis]: enabled } }));
    },
    symmetryOffset: { x: 0, y: 0, z: 0 },
    setSymmetryOffset: (axis, offset) => {
      saveToHistory();
      set((s) => ({ symmetryOffset: { ...s.symmetryOffset, [axis]: offset } }));
    },

    // ── History ──────────────────────────────────────────────────────────────
    canUndo: false,
    canRedo: false,

    undo: () => {
      if (past.length === 0) return;
      future.push(takeSnapshot());   // save current state so it can be redone
      const prev = past.pop()!;
      set(prev);
      syncFlags();
    },

    redo: () => {
      if (future.length === 0) return;
      past.push(takeSnapshot());     // save current state so it can be undone
      const next = future.pop()!;
      set(next);
      syncFlags();
    },

    beginInteraction: () => {
      saveToHistory();
    },

    // ── View ─────────────────────────────────────────────────────────────────
    showGrid: true,
    setShowGrid: (show) => set({ showGrid: show }),

    // ── Reference Objects ─────────────────────────────────────────────────────
    // Not part of undo/redo — importing a mesh is not "creative work".
    referenceObjects: [],

    addReferenceObject: (obj) => {
      set((s) => ({ referenceObjects: [...s.referenceObjects, obj] }));
    },

    removeReferenceObject: (id) => {
      set((s) => ({
        referenceObjects: s.referenceObjects.filter((r) => r.id !== id),
      }));
    },

    updateReferenceObject: (id, patch) => {
      set((s) => ({
        referenceObjects: s.referenceObjects.map((r) =>
          r.id === id ? { ...r, ...patch } : r
        ),
      }));
    },

    // ── File Operations ───────────────────────────────────────────────────────
    clearAll: () => {
      saveToHistory();
      set((s) => ({ layers: s.layers.map((l) => ({ ...l, voxels: [] })) }));
    },

    exportJSON: () => {
      const { gridSize, voxelSubdivision, layers } = get();
      return JSON.stringify({ version: 1, gridSize, voxelSubdivision, layers }, null, 2);
    },

    importJSON: (json) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(json);
      } catch (e) {
        warn('importJSON', `JSON parse error: ${(e as Error).message}`);
        return;
      }
      if (!Array.isArray(data.layers)) {
        warn('importJSON', 'Invalid file — "layers" array is missing.');
        return;
      }
      saveToHistory();
      set({
        gridSize: typeof data.gridSize === 'number' ? data.gridSize : 16,
        voxelSubdivision: typeof data.voxelSubdivision === 'number' ? data.voxelSubdivision : 4,
        layers: data.layers as Layer[],
        activeLayerId: ((data.layers as Layer[])[0]?.id) ?? null,
      });
    },
  };
});
