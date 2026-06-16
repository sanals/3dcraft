# Troubleshooting: Why You See Black Canvas Instead of Grid

## The Problem

You see a black/empty canvas where the blue grid should be rendering. The UI loads fine (buttons, panels, colors), but the 3D viewport is completely black or dark.

## Why This Happens

React Three Fiber's Canvas element requires **explicit pixel dimensions** to render WebGL content. Many common layout methods don't provide these dimensions:

- âŒ `flex-1` alone - provides flex growth but no pixel height
- âŒ Tailwind `h-screen` - sometimes conflicts with parent containers  
- âŒ `w-full h-full` without parent height - child has no height to fill
- âŒ Nested flex containers without explicit sizing - dimensions get lost

## Quick Fix (Try This First)

### Step 1: Clear Everything

```bash
# Navigate to project
cd /vercel/share/v0-project

# Stop any running dev servers (Ctrl+C if running)

# Clear Next.js cache
rm -rf .next

# Clear node_modules (if nothing else worked)
rm -rf node_modules

# Reinstall
npm install

# Start fresh
npm run dev
```

### Step 2: Hard Refresh Browser

- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

OR manually clear cache:
1. Press `F12` to open Developer Tools
2. Go to **Application** tab
3. Click **Clear storage**
4. Select **Cached Storage** and **Cookies**
5. Click **Clear**
6. Refresh page (`F5`)

### Step 3: Verify in Browser Console

Press `F12` and paste:

```javascript
// Check if canvas exists
const canvas = document.querySelector('canvas');
console.log("Canvas found:", canvas ? "YES" : "NO");

// Check canvas dimensions
if (canvas) {
  console.log("Canvas size:", canvas.clientWidth, "x", canvas.clientHeight);
}

// Check for WebGL context
if (canvas) {
  const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
  console.log("WebGL context:", gl ? "OK" : "FAILED");
}
```

If dimensions show `0 x 0`, that's the problem - Canvas has no size.

## Technical Details: How Canvas Sizing Works

### Why It Was Breaking

**Before the fix:**
```tsx
<div className="flex-1 flex flex-col">
  <div className="flex-1 relative">
    <VoxelCanvas />  {/* â† No explicit height */}
  </div>
</div>
```

Problem: `<div>` with just `flex-1` gets height, but nested `<Canvas>` inside doesn't automatically get it.

### The Solution

```tsx
<div className="flex-1 w-full overflow-hidden">
  <Canvas
    style={{ 
      width: '100%',
      height: '100%',
      display: 'block'  // Critical: Canvas needs display:block
    }}
  >
    <Scene />
  </Canvas>
</div>
```

**Why this works:**
1. Parent div has `flex-1` - grows to fill available space
2. Canvas gets `width: 100%` and `height: 100%` - fills parent
3. `display: block` - Canvas renders as block element (not inline)
4. Explicit pixel dimensions now exist - WebGL renders correctly

## Verify the Fix Worked

After applying the fix and hard refreshing, you should see:
- **Blue wireframe grid** in the center of the canvas
- Grid should be **3D perspective** view
- Grid lines should be **light blue** (#87ceeb or similar)

Test interaction:
1. Move mouse over grid - you should see a **green voxel preview**
2. Click on grid - **voxel count increases** at bottom
3. Change tool to "Paint" - **color picker button** should be available

## If Still Showing Black Canvas

### Check 1: Dev Server Running?

```bash
# Verify server is running
curl http://localhost:3000
```

Should show HTML content. If connection refused:
```bash
npm run dev
```

### Check 2: Browser Console Errors

Press `F12` â†’ **Console** tab. Look for:
- Red error messages
- WebGL errors
- Missing THREE errors

If errors exist:
```bash
# Rebuild and restart
rm -rf .next
npm run dev
```

### Check 3: Try Different Browser

Canvas rendering issues are sometimes browser-specific:
- Try **Chrome** first (best support)
- Try **Firefox** as backup
- Try **Safari** on Mac
- Try **Edge** on Windows

### Check 4: Disable Browser Extensions

Some extensions (ad blockers, privacy tools) can break WebGL:
1. Open browser in **Incognito/Private** mode
2. Visit `http://localhost:3000`
3. If it works, an extension was blocking it

### Check 5: Check GPU Acceleration

1. Open browser **Settings**
2. Search for **"Hardware acceleration"**
3. Make sure it's **ENABLED**
4. Restart browser

## Advanced Debugging

### Check Canvas Element in DOM

```javascript
const canvas = document.querySelector('canvas');

console.log({
  exists: !!canvas,
  tagName: canvas?.tagName,
  width: canvas?.width,
  height: canvas?.height,
  clientWidth: canvas?.clientWidth,
  clientHeight: canvas?.clientHeight,
  style: {
    width: canvas?.style.width,
    height: canvas?.style.height,
    display: canvas?.style.display,
  },
  computed: {
    width: window.getComputedStyle(canvas).width,
    height: window.getComputedStyle(canvas).height,
    display: window.getComputedStyle(canvas).display,
  }
});
```

Expected output:
```
width: 1400 (or similar, not 0)
height: 800 (or similar, not 0)
display: "block"
```

### Check React Component Rendering

In React DevTools Profiler:
1. Open **DevTools** â†’ **React** tab
2. Click **Profiler** at top
3. Look for `<VoxelCanvas>` component
4. It should show it rendered
5. Click on it and check props in **Components** tab

### Check Three.js Scene

Add this to `components/voxel-canvas.tsx` temporarily:

```typescript
function Scene() {
  useEffect(() => {
    console.log("[v0] Scene mounted and rendering");
  }, []);
  
  // existing component code
}
```

Should see `"[v0] Scene mounted and rendering"` in console.

## Complete Reset (Nuclear Option)

If nothing above works:

```bash
cd /vercel/share/v0-project

# Kill all node processes
pkill -f "node\|npm"

# Remove everything
rm -rf .next node_modules package-lock.json

# Fresh install
npm install

# Fresh start
npm run dev
```

Then:
1. Open new browser window
2. Go to `http://localhost:3000`
3. Clear cache again (Ctrl+Shift+Delete)
4. Hard refresh (Ctrl+Shift+R)

## Still Not Working? Debug Checklist

- [ ] Dev server running? (`npm run dev` in terminal)
- [ ] Accessing `http://localhost:3000`? (not `http://127.0.0.1:3000`)
- [ ] Hard refreshed? (`Ctrl+Shift+R`)
- [ ] Cleared browser cache? (DevTools â†’ Application â†’ Clear storage)
- [ ] No console errors? (F12 â†’ Console tab)
- [ ] Canvas has size? (run console check above)
- [ ] Tried different browser?
- [ ] GPU acceleration enabled in browser?
- [ ] Not running in Incognito mode?
- [ ] .env variables correct?
- [ ] Port 3000 not used by another app?

## Expected vs. Actual

### âœ… What Should Work

```
[Left Panel - 30% width]
- Tools section with Add/Remove/Paint/Select buttons
- Color picker (red square with #FF0000)
- Layers panel with "Layer 1"
- View Settings with grid toggle
- Export/Import buttons

[Right Panel - 70% width]
- BLUE WIREFRAME GRID in 3D perspective
- Grid should look like blue lines forming squares
- Responsive to mouse movement (green preview voxel)
- Clickable to add voxels

[Bottom]
- Status bar showing "Tool: Add Mode" and "Voxels: 0"
```

### âŒ What's Broken (If You See This)

```
[Right Panel]
- Completely BLACK or DARK
- No grid visible at all
- No response to mouse movement
- No preview voxel on hover
```

## Quick Reference: File Locations

If you need to manually check or edit:

```
Key files for canvas rendering:
- /components/voxel-canvas.tsx  â† Main 3D scene
- /components/voxel-editor.tsx  â† Layout container
- /lib/voxel-store.ts           â† State management
- /styles/globals.css           â† Tailwind config
```

## Contact / Escalation

If none of these steps work:
1. Note the exact error messages from console (F12)
2. Run `npm run build` and paste any build errors
3. Check if app works on different device/network
4. Last resort: delete entire project and clone fresh

---

**Last Updated:** December 2024
**Known Working:** Next.js 16, React 19, Three.js latest, Chrome/Firefox latest versions
