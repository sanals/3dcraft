# AI Developer Guide - Voxel Editor App

This guide is for AI assistants (like Claude, v0, etc.) working on the Voxel Editor project. It provides context about the architecture, common patterns, and how to approach development tasks.

## Project Overview

**Voxel Editor** is a 3D voxel modeling application built with:
- Next.js 16 (React framework)
- React Three Fiber (3D rendering)
- Three.js (WebGL graphics)
- Zustand (state management)
- Tailwind CSS v4 + shadcn/ui (styling)

The app allows users to create and edit 3D voxel models in an interactive 3D viewport.

## Architecture Overview

### Directory Structure

```
/app
  - layout.tsx: Root metadata and layout setup
  - page.tsx: Main landing page wrapper

/components
  - voxel-editor.tsx: Main container component (sidebar + canvas + status)
  - voxel-canvas.tsx: React Three Fiber Canvas with 3D scene
  - sidebar.tsx: Tool buttons, color picker, layers panel
  - status-bar.tsx: Bottom status display (tool, color, voxel count)
  - ui/: shadcn UI components (buttons, sliders, etc.)

/lib
  - voxel-store.ts: Zustand store (state management)
  - utils.ts: Helper functions

/styles
  - globals.css: Tailwind v4 + CSS variables
```

### State Management (Zustand Store)

Located in `lib/voxel-store.ts`, the store manages:

```typescript
// Voxel data structure
interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string; // hex color
  layerId: string;
}

// Store state
{
  voxels: Voxel[];
  currentTool: 'add' | 'remove' | 'paint' | 'select';
  currentColor: string;
  currentLayerId: string;
  gridSize: number;
  // ... methods
}
```

**Key Functions:**
- `addVoxel(voxel)` - Add a voxel to the store
- `removeVoxel(x, y, z)` - Remove voxel at position
- `paintVoxel(x, y, z, color)` - Change voxel color
- `getAllVoxels()` - Get all voxels (used for rendering)
- `setCurrentTool(tool)` - Change active tool
- `setCurrentColor(color)` - Change active color

### Component Hierarchy

```
VoxelEditor
  â”œâ”€â”€ Sidebar (left panel - 30% width)
  â”‚   â”œâ”€â”€ Tool buttons
  â”‚   â”œâ”€â”€ Color picker
  â”‚   â”œâ”€â”€ Layers panel
  â”‚   â””â”€â”€ View settings
  â””â”€â”€ Right Panel (flex-1, 70% width)
      â”œâ”€â”€ VoxelCanvas (flex-1, takes remaining space)
      â”‚   â””â”€â”€ Canvas (React Three Fiber)
      â”‚       â”œâ”€â”€ Scene
      â”‚       â”œâ”€â”€ VoxelMesh (InstancedMesh for rendering voxels)
      â”‚       â”œâ”€â”€ Ground plane (invisible, for raycasting)
      â”‚       â””â”€â”€ Grid (from drei library)
      â””â”€â”€ StatusBar
```

### 3D Rendering System

**VoxelCanvas Component:**
- Uses React Three Fiber's `<Canvas>` component
- Sets up camera at position `[20, 20, 20]` looking at origin
- Uses `PerspectiveCamera` with FOV 50
- Handles WebGL context and rendering

**VoxelMesh Component:**
- Uses `THREE.InstancedMesh` for efficient rendering
- Each voxel is an instance of a BoxGeometry
- Per-instance colors stored in a `InstancedBufferAttribute`
- Updates on every voxel change via `useEffect`
- Invisible ground plane at y=0 for raycasting

**Rendering Pattern:**
```typescript
// Create instanced mesh
const mesh = new THREE.InstancedMesh(geometry, material, voxels.length);

// Update instance positions and colors on each voxel change
useEffect(() => {
  voxels.forEach((voxel, index) => {
    dummy.position.set(voxel.x, voxel.y, voxel.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    // Update color buffer
    colors[index * 3] = r;
    colors[index * 3 + 1] = g;
    colors[index * 3 + 2] = b;
  });
  mesh.instanceMatrix.needsUpdate = true;
}, [voxels]);
```

## Known Issues & Fixes

### Issue: Canvas Shows Black/Empty

**Root Cause:** React Three Fiber's Canvas needs explicit pixel dimensions. Flex-based sizing alone doesn't work.

**Solution:**
```typescript
<div className="flex-1 w-full overflow-hidden">
  <Canvas style={{ width: '100%', height: '100%', display: 'block' }}>
    <Scene />
  </Canvas>
</div>
```

**Why:** Canvas element (SVG-like) requires `display: block` and explicit `width`/`height` styles, not just Tailwind flex.

### Issue: Voxels Placed Below Ground Plane

**Root Cause:** Raycasting fallback was calculating incorrect Y positions.

**Solution:**
```typescript
y = Math.max(0, y); // Clamp Y to >= 0 in click handler
```

**Why:** Y=0 is the ground level. Negative Y places voxels underground.

### Issue: Event Listeners Not Firing

**Root Cause:** Raw `addEventListener` on canvas doesn't work well with React Three Fiber because r3f intercepts pointer events.

**Solution:** Use React Three Fiber's built-in event props on meshes:
```typescript
<mesh onClick={handleClick} onPointerMove={handleMove}>
  <planeGeometry />
  <meshBasicMaterial />
</mesh>
```

**Why:** R3F provides proper event integration with Three.js raycasting.

## Common Development Tasks

### Adding a New Tool

1. **Update tool type in store:**
   ```typescript
   // lib/voxel-store.ts
   currentTool: 'add' | 'remove' | 'paint' | 'select' | 'newTool';
   ```

2. **Add button to sidebar:**
   ```typescript
   // components/sidebar.tsx
   <button onClick={() => setCurrentTool('newTool')}>New Tool</button>
   ```

3. **Implement tool logic in click handler:**
   ```typescript
   // components/voxel-canvas.tsx
   const handlePlaneClick = useCallback((e: any) => {
     if (currentTool === 'newTool') {
       // Your logic here
     }
   }, [currentTool, ...]);
   ```

### Adding a Feature to the Sidebar

1. Add state to Zustand store if needed
2. Create UI component in `components/sidebar.tsx`
3. Use store hooks to connect state and actions
4. Style with Tailwind CSS

Example:
```typescript
// In sidebar.tsx
const { someState, setSomeState } = useVoxelStore();

return (
  <div className="p-4 bg-slate-800 rounded-lg">
    <button onClick={() => setSomeState(!someState)}>
      Toggle Feature
    </button>
  </div>
);
```

### Modifying Voxel Rendering

The voxel rendering happens in `VoxelMesh` component inside `voxel-canvas.tsx`:

1. **Change voxel appearance:**
   - Modify `material` (color, metalness, roughness, etc.)
   - Edit `geometry` (size, scale)
   - Change lighting in Scene

2. **Update instance data:**
   - Modify the color buffer update logic
   - Add new buffer attributes for custom data
   - Update the `useEffect` that syncs voxels to mesh

3. **Performance optimizations:**
   - Use `useCallback` for event handlers
   - Memoize components that depend on voxels
   - Consider if a new `useEffect` is actually necessary

## React Three Fiber (R3F) Quick Reference

### Canvas Setup
```typescript
<Canvas
  camera={{ position: [x, y, z], fov: 50 }}
  gl={{ antialias: true }}
>
  <Scene />
</Canvas>
```

### Using Hooks
```typescript
// Inside R3F component (child of <Canvas>)
function MyComponent() {
  const { camera, gl, raycaster } = useThree();
  // Access Three.js objects
}
```

### Meshes & Geometry
```typescript
<mesh position={[x, y, z]} onClick={handler} onPointerMove={handler}>
  <boxGeometry args={[w, h, d]} />
  <meshStandardMaterial color="red" />
</mesh>
```

### Group & Positioning
```typescript
<group position={[x, y, z]} rotation={[rx, ry, rz]} scale={[sx, sy, sz]}>
  <mesh />
  <mesh />
</group>
```

## Zustand Store Usage

### In Components
```typescript
// Get state and actions
const { voxels, currentTool, addVoxel } = useVoxelStore();

// Subscribe to specific values (for performance)
const count = useVoxelStore(state => state.voxels.length);
```

### Store Definition Pattern
```typescript
interface VoxelState {
  // State
  voxels: Voxel[];
  currentTool: string;
  
  // Actions
  addVoxel: (voxel: Voxel) => void;
  removeVoxel: (x: number, y: number, z: number) => void;
}

export const useVoxelStore = create<VoxelState>((set) => ({
  voxels: [],
  currentTool: 'add',
  
  addVoxel: (voxel) => set((state) => ({
    voxels: [...state.voxels, voxel]
  })),
  
  removeVoxel: (x, y, z) => set((state) => ({
    voxels: state.voxels.filter(v => !(v.x === x && v.y === y && v.z === z))
  })),
}));
```

## Tailwind CSS v4 Notes

- No `tailwind.config.js` file - configuration is in `globals.css`
- Use CSS variables for theming
- Responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Custom theme tokens defined in `@theme` block

Example:
```css
@theme inline {
  --color-primary: #ff0000;
  --font-sans: 'Geist', sans-serif;
}
```

## Debugging Tips

### Canvas Not Rendering

1. Check browser console (F12) for errors
2. Verify Canvas has parent with explicit height
3. Check camera position isn't inside geometry
4. Verify lights are set up correctly

### Voxels Not Appearing

1. Check if voxels exist in store: `useVoxelStore.getState().voxels`
2. Verify instanced mesh count: `mesh.count === voxels.length`
3. Check instance matrix updates: `instanceMatrix.needsUpdate`
4. Verify colors are valid hex strings

### State Not Updating

1. Check if using store correctly: `const { state, action } = useVoxelStore()`
2. Verify actions modify state immutably
3. Use React DevTools to inspect state changes
4. Add `console.log("[v0] ...")` in store actions for debugging

### Performance Issues

1. Open DevTools Performance tab
2. Look for long render times
3. Check if useEffect runs too often
4. Profile with React Profiler (DevTools)
5. Consider memoizing expensive components

## Deployment Checklist

- [ ] Run `npm run build` - verify no errors
- [ ] Test production build locally: `npm start`
- [ ] Clear browser cache and hard refresh
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Check console for errors in production
- [ ] Verify 3D rendering works smoothly
- [ ] Test all tools (Add, Remove, Paint, Select)
- [ ] Test import/export functionality

## Version History

### v1.0.0 (Current)
- Initial voxel editor with basic tools
- 3D grid rendering with React Three Fiber
- Zustand state management
- Tool system (Add, Remove, Paint, Select)
- Color picker
- Layer management
- Import/Export JSON
- Fixed canvas sizing with inline styles
- Fixed Y-axis constraint for ground level voxels
- Fixed event handling with R3F mesh props

## Future Enhancement Areas

1. **Undo/Redo** - Consider using a state history pattern
2. **Performance** - Profile with large voxel counts
3. **3D Export** - Export to OBJ/GLTF formats
4. **Animation** - Keyframe-based voxel animations
5. **Collaboration** - Real-time multi-user editing
6. **Mobile Support** - Touch controls for mobile devices

## Important Notes for AI Developers

1. **Always read the full file** before editing - context matters
2. **Use parallel tool calls** when reading multiple files
3. **Check for existing patterns** before creating new ones
4. **Test in browser** after major changes
5. **Keep components small** - easier to debug and maintain
6. **Document complex logic** with inline comments
7. **Use TypeScript** - catch errors before runtime
8. **Prefer composition** over complex props drilling
9. **Avoid performance anti-patterns** (expensive renders, missing keys)
10. **Hard refresh browser** if changes don't appear (Ctrl+Shift+R)

---

Last Updated: 2024-12-16
Next AI: Please update this guide with any major changes or new patterns discovered.
