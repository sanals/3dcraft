# Quick Start Guide

## TL;DR - Just Get It Running

### Mac/Linux

```bash
cd /vercel/share/v0-project
./setup.sh
```

Then:
1. Open http://localhost:3000
2. Press `Cmd+Shift+R` to hard refresh
3. If canvas is black, see TROUBLESHOOTING.md

### Windows

```bash
cd C:\path\to\voxel-project
setup.bat
```

Then:
1. Open http://localhost:3000
2. Press `Ctrl+Shift+R` to hard refresh
3. If canvas is black, see TROUBLESHOOTING.md

---

## Manual Steps (If Script Doesn't Work)

```bash
# Navigate to project
cd /vercel/share/v0-project

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open browser: **http://localhost:3000**

---

## What You Should See

âœ… **Left Panel (Dark Blue):**
- Tools: Add, Remove, Paint, Select buttons
- Color picker (red square)
- Layers panel
- View settings

âœ… **Right Panel (Canvas):**
- **BLUE 3D GRID** (blue wireframe lines forming squares)
- Grid should be 3D perspective view
- Can move mouse and see green voxel preview

âœ… **Bottom:**
- Status bar showing "Tool: Add Mode" and "Voxels: 0"

---

## First Time Using It

1. **Click on the grid** â†’ adds a red voxel
2. **Change color** â†’ use color picker on left
3. **Click again** â†’ adds another voxel with new color
4. **Switch to Remove** â†’ click voxels to delete them
5. **Switch to Paint** â†’ click voxels to change their color

---

## Keyboard Shortcuts

- `Ctrl+Shift+R` or `Cmd+Shift+R` â†’ Hard refresh browser
- `Ctrl+Shift+Delete` â†’ Clear cache in browser
- `F12` â†’ Open developer tools (for debugging)

---

## Troubleshooting

### Canvas is Black

1. Hard refresh: `Ctrl+Shift+R`
2. Clear cache: `Ctrl+Shift+Delete` â†’ Select "All time" â†’ "Clear data"
3. Restart dev server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### Can't Start Server

```bash
# Make sure you're in the right directory
cd /vercel/share/v0-project

# Clear everything and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### Port Already in Use

```bash
# Use a different port
npm run dev -- -p 3001
```

Then open: http://localhost:3001

---

## Next Steps

- See **README.md** for full documentation
- See **TROUBLESHOOTING.md** for common issues  
- See **AI_DEVELOPER_GUIDE.md** if you're modifying the code

---

## Need Help?

```bash
# Check logs
npm run dev

# Build check
npm run build

# Check version
node --version    # Should be 18+
npm --version    # Should be 10+
```

---

That's it! You're ready to voxel! ðŸŽ®
