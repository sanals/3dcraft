# Voxel Editor App

A 3D voxel editor built with Next.js, React Three Fiber, and Three.js. Create and edit 3D voxel models in your browser.

## Features

- **3D Voxel Grid** - Interactive 3D workspace for creating voxel models
- **Multiple Tools** - Add, Remove, Paint, and Select voxels
- **Color Picker** - Choose custom colors for voxels
- **Layer System** - Organize voxels into named layers
- **Import/Export** - Save and load voxel models as JSON
- **Grid Visualization** - Adjustable grid size and visibility
- **3D Camera Controls** - Rotate, pan, and zoom the viewport

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm (or npm/yarn)

### Installation & Running

```bash
# Navigate to project directory
cd /vercel/share/v0-project

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# App will be available at http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Hard Reset & Cache Clear

If you're not seeing the 3D grid rendering:

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall (if needed)
rm -rf node_modules
npm install

# Start dev server
npm run dev

# In your browser:
# 1. Press Ctrl+Shift+Delete to open Clear Browsing Data
# 2. Select "All time" and check "Cached images and files"
# 3. Click "Clear data"
# 4. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## Project Structure

```
/app
  â”œâ”€â”€ layout.tsx         - Root layout with metadata
  â””â”€â”€ page.tsx           - Main landing page

/components
  â”œâ”€â”€ voxel-editor.tsx   - Main editor UI container
  â”œâ”€â”€ voxel-canvas.tsx   - 3D canvas with React Three Fiber
  â”œâ”€â”€ sidebar.tsx        - Left sidebar with tools
  â”œâ”€â”€ status-bar.tsx     - Bottom status display
  â””â”€â”€ ui/                - shadcn UI components

/lib
  â”œâ”€â”€ voxel-store.ts     - Zustand state management for voxels
  â””â”€â”€ utils.ts           - Utility functions

/styles
  â””â”€â”€ globals.css        - Global styles and Tailwind config
```

## Usage

### Creating Voxels

1. Select the **"Add"** tool from the Tools panel
2. Click on the blue grid to place voxels
3. Use the **color picker** to change voxel colors
4. Click to add voxels at the highlighted position

### Editing Voxels

- **Paint Tool** - Click on existing voxels to change their color
- **Remove Tool** - Click on voxels to delete them
- **Select Tool** - Select voxels for future operations

### Camera Controls

- **Rotate** - Click and drag with mouse
- **Pan** - Right-click and drag
- **Zoom** - Scroll mouse wheel

### Managing Layers

- Create new layers with the **"+"** button
- Name layers for organization
- Switch between layers by clicking them
- Layers help organize complex models

### Export/Import

- **Export JSON** - Save your voxel model to a JSON file
- **Import JSON** - Load a previously saved voxel model

## Key Components

### VoxelCanvas (`components/voxel-canvas.tsx`)

Renders the 3D scene using React Three Fiber. Contains:
- Three.js Scene setup with camera and lights
- Invisible ground plane for raycasting
- Instanced mesh for efficient voxel rendering
- Pointer event handlers for interaction

### VoxelStore (`lib/voxel-store.ts`)

Zustand state management store that manages:
- All voxels (position, color, layer)
- Current tool mode
- Current color selection
- Grid size
- Layer management

### VoxelEditor (`components/voxel-editor.tsx`)

Main component that combines:
- Sidebar with tools and controls
- 3D canvas viewport
- Status bar with info display

## Common Issues & Solutions

### Canvas Shows Black/Empty Screen

**Problem:** The 3D grid isn't rendering.

**Solution:**
```bash
# 1. Hard refresh your browser (Ctrl+Shift+R)
# 2. Clear browser cache and cookies
# 3. Restart dev server:
npm run dev
```

### Voxels Not Appearing

**Problem:** Clicking doesn't create voxels.

**Solution:**
- Check the status bar shows "Tool: Add Mode"
- Verify you're clicking on the blue grid area
- Try a different browser
- Check console for errors (F12)

### Performance Issues

**Problem:** App is slow or laggy.

**Solution:**
- Reduce grid size in View Settings
- Close other browser tabs
- Reduce the number of voxels (try clearing and starting fresh)

## Development Notes

### Tech Stack

- **Next.js 16** - React framework
- **React Three Fiber** - React renderer for Three.js
- **Three.js** - 3D graphics library
- **Zustand** - State management
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - UI components

### Key Technical Decisions

1. **Instanced Mesh** - Uses `THREE.InstancedMesh` for efficient voxel rendering
2. **Raycasting** - Ground plane provides fallback raycasting for click detection
3. **State Management** - Zustand provides lightweight, reactive state
4. **Event Handling** - React Three Fiber's `onPointerMove` and `onClick` props for 3D interaction

### Performance Optimizations

- Instanced rendering (1000+ voxels without lag)
- Memoized components to prevent unnecessary re-renders
- Efficient color buffer updates
- Lazy material and geometry creation

## Deployment

### Deploy to Vercel

```bash
# Push to GitHub, then:
# 1. Go to https://vercel.com/new
# 2. Import your GitHub repository
# 3. Deploy automatically

# Or deploy via CLI:
vercel deploy
```

## Troubleshooting

### Build Fails

```bash
# Clear everything and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use a different port
npm run dev -- -p 3001
```

### TypeScript Errors

```bash
# Clear cache and recheck
npm install
npm run dev
```

## Future Enhancements

- Undo/Redo functionality
- Multi-selection and bulk operations
- More advanced brush tools
- Voxel model templates
- 3D model export (OBJ, GLTF)
- Collaborative editing
- Animation system

## License

MIT

## Support

For issues or questions, check the AI Developer Guide (AI_DEVELOPER_GUIDE.md) for detailed technical information.
