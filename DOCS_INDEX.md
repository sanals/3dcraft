# Documentation Index

Welcome to the Voxel Editor project! This document helps you find the right guide for what you need.

## For Users - Getting Started

### ðŸ“– [QUICKSTART.md](./QUICKSTART.md) - **START HERE**
- Fastest way to get the app running
- 5-minute setup
- What to expect when it's working
- Basic usage instructions

### ðŸ“– [README.md](./README.md) - Full User Guide
- Project overview and features
- Detailed setup instructions
- Complete usage guide
- Troubleshooting section
- Tech stack information

## For Developers - Working on the Project

### ðŸ¤– [AI_DEVELOPER_GUIDE.md](./AI_DEVELOPER_GUIDE.md) - **For AI Assistants**
- Architecture overview
- Component structure and data flow
- State management patterns (Zustand)
- 3D rendering system (React Three Fiber)
- Known issues and their solutions
- Common development tasks
- Zustand and R3F quick references
- Performance optimization tips
- Debugging techniques
- Deployment checklist

**Read this if:**
- You're an AI assistant working on this project
- You need to understand the codebase architecture
- You're fixing bugs or adding features
- You want to learn React Three Fiber patterns used here

### ðŸ”§ [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Fix Common Issues
- Why canvas shows black instead of grid
- Quick fixes (cache clearing, hard refresh)
- Technical explanation of canvas sizing
- Advanced debugging techniques
- Step-by-step diagnostic checklist
- Browser compatibility info

**Read this if:**
- The grid isn't showing (black canvas)
- Voxels aren't appearing
- State isn't updating
- Performance is slow
- You get WebGL errors

## Setup Scripts (Automated)

### ðŸ§ [setup.sh](./setup.sh) - Mac/Linux
Automated setup and run script:
```bash
./setup.sh
```

### ðŸªŸ [setup.bat](./setup.bat) - Windows
Automated setup and run script:
```bash
setup.bat
```

These scripts will:
- Check prerequisites (Node.js, npm)
- Offer clean install option
- Install dependencies
- Build for production (optional)
- Start dev server

## Project Structure

```
/app
  - layout.tsx        Main layout
  - page.tsx          Landing page
  
/components
  - voxel-editor.tsx  Main UI container
  - voxel-canvas.tsx  3D scene rendering
  - sidebar.tsx       Tools panel
  - status-bar.tsx    Status display
  
/lib
  - voxel-store.ts    State management
  - utils.ts          Helper functions
  
/styles
  - globals.css       Tailwind config
```

## Quick Navigation

| I want to... | Read this |
|---|---|
| Get the app running ASAP | [QUICKSTART.md](./QUICKSTART.md) |
| Understand the architecture | [AI_DEVELOPER_GUIDE.md](./AI_DEVELOPER_GUIDE.md) |
| Fix a rendering issue | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Learn how to use the app | [README.md](./README.md) |
| Add a new feature | [AI_DEVELOPER_GUIDE.md](./AI_DEVELOPER_GUIDE.md) â†’ Common Development Tasks |
| Deploy to production | [README.md](./README.md) â†’ Deployment |
| Debug a problem | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) â†’ Debugging |

## Running the App

### Option 1: Using Setup Script (Recommended)
```bash
# Mac/Linux
./setup.sh

# Windows
setup.bat
```

### Option 2: Manual
```bash
npm install
npm run dev
```

### Option 3: Fresh Clean Install
```bash
rm -rf .next node_modules
npm install
npm run dev
```

Then open **http://localhost:3000** and hard refresh (`Ctrl+Shift+R`).

## Common Issues Quick Reference

| Issue | Solution |
|---|---|
| Black canvas (no grid) | See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Canvas Shows Black |
| Voxels don't appear | Hard refresh browser + clear cache |
| App won't start | Run `npm install` then `npm run dev` |
| Port in use | Use `npm run dev -- -p 3001` |
| TypeScript errors | Run `rm -rf .next && npm run dev` |

## Technology Stack

- **Next.js 16** - React framework
- **React Three Fiber** - 3D rendering
- **Three.js** - WebGL graphics
- **Zustand** - State management
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - UI components

## For AI Developers (Important!)

Before working on this project, **read [AI_DEVELOPER_GUIDE.md](./AI_DEVELOPER_GUIDE.md)**. It contains:

1. **Architecture Overview** - How components fit together
2. **Known Issues** - Problems we've solved and how
3. **Common Patterns** - React Three Fiber, Zustand, component structure
4. **Debugging Tips** - How to troubleshoot common problems
5. **Performance Notes** - Optimization techniques used
6. **Important Notes** - Best practices for this codebase

## Version History

| Version | Notes |
|---|---|
| 1.0.0 | Initial release with core voxel editor features |

## Getting Help

1. **Is the app not running?** â†’ [QUICKSTART.md](./QUICKSTART.md)
2. **Is the canvas black?** â†’ [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. **Need to modify code?** â†’ [AI_DEVELOPER_GUIDE.md](./AI_DEVELOPER_GUIDE.md)
4. **Want to understand usage?** â†’ [README.md](./README.md)

## Last Updated

Documentation updated: **December 16, 2024**

Future AI developers: Please keep this index and all guides updated as you make changes!

---

**Ready to get started?** â†’ Open [QUICKSTART.md](./QUICKSTART.md)

**Building a new feature?** â†’ Open [AI_DEVELOPER_GUIDE.md](./AI_DEVELOPER_GUIDE.md)

**Something broken?** â†’ Open [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
