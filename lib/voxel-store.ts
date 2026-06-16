import { create } from 'zustand';

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

interface VoxelEditorStateBase {
  // Grid state
  gridSize: number;
  setGridSize: (size: number) => void;

  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  addLayer: (name: string) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  renameLayer: (id: string, name: string) => void;

  // Voxels
  addVoxel: (voxel: Voxel, layerId?: string) => void;
  removeVoxel: (x: number, y: number, z: number, layerId?: string) => void;
  paintVoxel: (x: number, y: number, z: number, color: string, layerId?: string) => void;
  getVoxelAt: (x: number, y: number, z: number, layerId?: string) => Voxel | undefined;
  getAllVoxels: () => Voxel[];

  // Tools & colors
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentTool: 'add' | 'remove' | 'paint' | 'select';
  setCurrentTool: (tool: 'add' | 'remove' | 'paint' | 'select') => void;

  // History
  undo: () => void;
  redo: () => void;

  // View
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;

  // File operations
  clearAll: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
}

export type VoxelEditorState = VoxelEditorStateBase & {
  canUndo: boolean;
  canRedo: boolean;
};

const createInitialState = (): Omit<VoxelEditorStateBase, 'undo' | 'redo'> => ({
  gridSize: 16,
  setGridSize: () => {},
  layers: [
    {
      id: 'layer-0',
      name: 'Layer 1',
      visible: true,
      voxels: [],
    },
  ],
  activeLayerId: 'layer-0',
  addLayer: () => {},
  removeLayer: () => {},
  setActiveLayer: () => {},
  toggleLayerVisibility: () => {},
  renameLayer: () => {},
  addVoxel: () => {},
  removeVoxel: () => {},
  paintVoxel: () => {},
  getVoxelAt: () => undefined,
  getAllVoxels: () => [],
  currentColor: '#FF0000',
  setCurrentColor: () => {},
  currentTool: 'add',
  setCurrentTool: () => {},
  showGrid: true,
  setShowGrid: () => {},
  clearAll: () => {},
  exportJSON: () => '',
  importJSON: () => {},
});

export const useVoxelStore = create<VoxelEditorStateBase & { canUndo: boolean; canRedo: boolean }>((set, get) => {
  let history: {
    past: Array<Omit<VoxelEditorStateBase, 'undo' | 'redo'>>;
    future: Array<Omit<VoxelEditorStateBase, 'undo' | 'redo'>>;
  } = {
    past: [],
    future: [],
  };

  const saveToHistory = () => {
    const state = get();
    history.past.push({
      gridSize: state.gridSize,
      layers: JSON.parse(JSON.stringify(state.layers)),
      activeLayerId: state.activeLayerId,
      currentColor: state.currentColor,
      currentTool: state.currentTool,
      showGrid: state.showGrid,
      setGridSize: state.setGridSize,
      setActiveLayer: state.setActiveLayer,
      addLayer: state.addLayer,
      removeLayer: state.removeLayer,
      toggleLayerVisibility: state.toggleLayerVisibility,
      renameLayer: state.renameLayer,
      addVoxel: state.addVoxel,
      removeVoxel: state.removeVoxel,
      paintVoxel: state.paintVoxel,
      getVoxelAt: state.getVoxelAt,
      getAllVoxels: state.getAllVoxels,
      setCurrentColor: state.setCurrentColor,
      setCurrentTool: state.setCurrentTool,
      setShowGrid: state.setShowGrid,
      clearAll: state.clearAll,
      exportJSON: state.exportJSON,
      importJSON: state.importJSON,
    });
    history.future = [];
    if (history.past.length > 50) {
      history.past.shift();
    }
  };

  const updateCanUndo = () => {
    set({
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    });
  };

  return {
    ...createInitialState(),
    canUndo: false,
    canRedo: false,

    setGridSize: (size: number) => {
      saveToHistory();
      set({ gridSize: size });
      updateCanUndo();
    },

    addLayer: (name: string) => {
      saveToHistory();
      set((state) => ({
        layers: [
          ...state.layers,
          {
            id: `layer-${Date.now()}`,
            name,
            visible: true,
            voxels: [],
          },
        ],
      }));
      updateCanUndo();
    },

    removeLayer: (id: string) => {
      saveToHistory();
      set((state) => {
        const filtered = state.layers.filter((l) => l.id !== id);
        return {
          layers: filtered,
          activeLayerId:
            state.activeLayerId === id
              ? filtered[0]?.id || null
              : state.activeLayerId,
        };
      });
      updateCanUndo();
    },

    setActiveLayer: (id: string) => {
      set({ activeLayerId: id });
    },

    toggleLayerVisibility: (id: string) => {
      set((state) => ({
        layers: state.layers.map((l) =>
          l.id === id ? { ...l, visible: !l.visible } : l
        ),
      }));
    },

    renameLayer: (id: string, name: string) => {
      set((state) => ({
        layers: state.layers.map((l) =>
          l.id === id ? { ...l, name } : l
        ),
      }));
    },

    addVoxel: (voxel: Voxel, layerId?: string) => {
      saveToHistory();
      const targetLayerId = layerId || get().activeLayerId;
      if (!targetLayerId) return;

      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === targetLayerId
            ? {
                ...layer,
                voxels: layer.voxels.some(
                  (v) => v.x === voxel.x && v.y === voxel.y && v.z === voxel.z
                )
                  ? layer.voxels
                  : [...layer.voxels, voxel],
              }
            : layer
        ),
      }));
      updateCanUndo();
    },

    removeVoxel: (x: number, y: number, z: number, layerId?: string) => {
      saveToHistory();
      const targetLayerId = layerId || get().activeLayerId;
      if (!targetLayerId) return;

      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === targetLayerId
            ? {
                ...layer,
                voxels: layer.voxels.filter(
                  (v) => !(v.x === x && v.y === y && v.z === z)
                ),
              }
            : layer
        ),
      }));
      updateCanUndo();
    },

    paintVoxel: (x: number, y: number, z: number, color: string, layerId?: string) => {
      saveToHistory();
      const targetLayerId = layerId || get().activeLayerId;
      if (!targetLayerId) return;

      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === targetLayerId
            ? {
                ...layer,
                voxels: layer.voxels.map((v) =>
                  v.x === x && v.y === y && v.z === z ? { ...v, color } : v
                ),
              }
            : layer
        ),
      }));
      updateCanUndo();
    },

    getVoxelAt: (x: number, y: number, z: number, layerId?: string) => {
      const targetLayerId = layerId || get().activeLayerId;
      if (!targetLayerId) return undefined;

      const layer = get().layers.find((l) => l.id === targetLayerId);
      return layer?.voxels.find(
        (v) => v.x === x && v.y === y && v.z === z
      );
    },

    getAllVoxels: () => {
      return get()
        .layers.filter((l) => l.visible)
        .flatMap((l) => l.voxels);
    },

    setCurrentColor: (color: string) => {
      set({ currentColor: color });
    },

    setCurrentTool: (tool) => {
      set({ currentTool: tool });
    },

    setShowGrid: (show: boolean) => {
      set({ showGrid: show });
    },

    clearAll: () => {
      saveToHistory();
      set((state) => ({
        layers: state.layers.map((l) => ({ ...l, voxels: [] })),
      }));
      updateCanUndo();
    },

    exportJSON: () => {
      const state = get();
      return JSON.stringify({
        gridSize: state.gridSize,
        layers: state.layers,
      });
    },

    importJSON: (json: string) => {
      try {
        saveToHistory();
        const data = JSON.parse(json);
        set({
          gridSize: data.gridSize || 16,
          layers: data.layers || [],
        });
        updateCanUndo();
      } catch (error) {
        console.error('Failed to import JSON:', error);
      }
    },

    undo: () => {
      if (history.past.length > 0) {
        const currentState = {
          gridSize: get().gridSize,
          layers: JSON.parse(JSON.stringify(get().layers)),
          activeLayerId: get().activeLayerId,
          currentColor: get().currentColor,
          currentTool: get().currentTool,
          showGrid: get().showGrid,
          setGridSize: get().setGridSize,
          setActiveLayer: get().setActiveLayer,
          addLayer: get().addLayer,
          removeLayer: get().removeLayer,
          toggleLayerVisibility: get().toggleLayerVisibility,
          renameLayer: get().renameLayer,
          addVoxel: get().addVoxel,
          removeVoxel: get().removeVoxel,
          paintVoxel: get().paintVoxel,
          getVoxelAt: get().getVoxelAt,
          getAllVoxels: get().getAllVoxels,
          setCurrentColor: get().setCurrentColor,
          setCurrentTool: get().setCurrentTool,
          setShowGrid: get().setShowGrid,
          clearAll: get().clearAll,
          exportJSON: get().exportJSON,
          importJSON: get().importJSON,
        };
        history.future.push(currentState);

        const previousState = history.past.pop();
        if (previousState) {
          set({
            gridSize: previousState.gridSize,
            layers: previousState.layers,
            activeLayerId: previousState.activeLayerId,
            currentColor: previousState.currentColor,
            currentTool: previousState.currentTool,
            showGrid: previousState.showGrid,
          });
        }
      }
      updateCanUndo();
    },

    redo: () => {
      if (history.future.length > 0) {
        const currentState = {
          gridSize: get().gridSize,
          layers: JSON.parse(JSON.stringify(get().layers)),
          activeLayerId: get().activeLayerId,
          currentColor: get().currentColor,
          currentTool: get().currentTool,
          showGrid: get().showGrid,
          setGridSize: get().setGridSize,
          setActiveLayer: get().setActiveLayer,
          addLayer: get().addLayer,
          removeLayer: get().removeLayer,
          toggleLayerVisibility: get().toggleLayerVisibility,
          renameLayer: get().renameLayer,
          addVoxel: get().addVoxel,
          removeVoxel: get().removeVoxel,
          paintVoxel: get().paintVoxel,
          getVoxelAt: get().getVoxelAt,
          getAllVoxels: get().getAllVoxels,
          setCurrentColor: get().setCurrentColor,
          setCurrentTool: get().setCurrentTool,
          setShowGrid: get().setShowGrid,
          clearAll: get().clearAll,
          exportJSON: get().exportJSON,
          importJSON: get().importJSON,
        };
        history.past.push(currentState);

        const nextState = history.future.pop();
        if (nextState) {
          set({
            gridSize: nextState.gridSize,
            layers: nextState.layers,
            activeLayerId: nextState.activeLayerId,
            currentColor: nextState.currentColor,
            currentTool: nextState.currentTool,
            showGrid: nextState.showGrid,
          });
        }
      }
      updateCanUndo();
    },
  };
});

