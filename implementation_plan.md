# Voxel Editor: Comprehensive Roadmap

Now that the Foundation (Phase 0) and Per-Face Coloring (Phase 2) are completed and functioning perfectly, we can focus on the remaining advanced features. I have organized all our pending ideas and original phases into a cohesive, sequential roadmap below. 

> [!TIP]
> **To AI Agents:** NEVER delete phases or items from this document when they are finished. Instead, move them to the "Completed Phases / History" section at the bottom of this document so we maintain a permanent record of what was built.

Please review the descriptions and answer the **Open Questions** listed for the advanced phases so we can finalize their designs!

---

## ✅ Completed Phases / History

### Phase 0: Foundation
- Basic voxel grid setup and rendering
- Zustand state management for blocks
- Add, Remove, and Raycasting logic

### Phase 1: Voxel-Level Targeting & Tools (Fixes)
- Converted Raycaster from matrix decomposition to direct `instanceId` lookup to fix precision errors.
- Fixed a bug where Three.js cached an empty Bounding Sphere, freezing the UI.
- Upgraded the Fill Tool to correctly handle 3D coordinate checks.

### Phase 2: Per-Face Coloring
- Injected custom WebGL shader to `InstancedMesh` for per-face coloring.
- Upgraded `Voxel` memory model to support 6 individual face colors.
- Added Target Mode (Block vs Face) UI to the Tool Panel.
- Updated Fill BFS algorithm (Option B) to only flood-fill across coplanar faces.
- Fixed `export3MF` and `exportOBJ` to correctly pull face-specific colors into exported triangles.

---

## Phase 3: Box Tool Preview & Polish
*Refining the existing Box tool without breaking the smooth workflow.*

**Deep Dive:**
You mentioned that the current `Ctrl + Drag` shortcut for the Box tool works smoothly, and the old "Continuous Draw" mode was too messy and out of control. We will scrap "Continuous Draw" entirely.

Instead of removing the `Ctrl + Drag` shortcut, we will simply upgrade it.
- **Visual Bounding Box Preview:** Right now, when you hold `Ctrl` and drag, you don't see exactly how large the box will be until you release the mouse. We will add a glowing, translucent 3D bounding box that stretches dynamically with your mouse cursor while dragging. Once you release the mouse, the box is filled with voxels. This gives you perfect precision without changing the workflow you already like!

> [!IMPORTANT]
> **Questions for Phase 3:**
> 1. Does a glowing translucent box preview sound like a good enhancement for the `Ctrl + Drag` workflow?

---

## Phase 4: Micro-Voxels (High-Resolution Subdivisions)
*Allowing localized, high-detail sculpting without shrinking the entire world grid.*

**Deep Dive:**
A common limitation in voxel editors is that if you want more detail (like adding facial features to a character), you have to scale up your entire model, making the file huge. Micro-Voxels solve this by allowing a single standard grid block to be subdivided.
- **Technical Implementation:** We will update the engine so that a single 1x1x1 grid space can contain a 2x2x2 (8 micro-blocks) or 4x4x4 (64 micro-blocks) arrangement. The raycaster will be upgraded to snap to these smaller sub-coordinates.
- **Rendering Optimization:** To prevent the GPU from choking on millions of micro-voxels, we will implement an algorithm that dynamically merges adjacent identical micro-voxels back into larger macro-blocks behind the scenes.

> [!IMPORTANT]
> **Questions for Phase 4:**
> 1. Should "Micro-voxels" be an explicit tool (e.g., you click a block with a "Shatter" tool to break it into smaller pieces), or should the user simply zoom in and change their "Grid Scale" to draw smaller blocks globally?
> 2. If we support subdivision, what is the maximum detail level you need? Is 1/8th the size of a standard block (8x8x8 = 512 micro-blocks per standard block) enough?

---

## Phase 5: Reference Objects & Tracing
*Import high-poly 3D models to use as scaffolding or tracing guides.*

**Deep Dive:**
Building organic shapes (like a human face) from scratch in voxels is difficult. This phase allows users to import standard 3D meshes (.OBJ, .GLTF, .STL) directly into the scene.
- **The "Ghost" Mesh:** The imported object is rendered with a translucent or wireframe material so it doesn't block your view of the voxels.
- **Surface Snapping:** The Raycaster will be modified to intersect with the Reference Mesh. When you click on the ghost mesh, the editor will calculate exactly which voxel coordinate that surface point occupies, and place a block there. You can literally "paint" voxels over the 3D model!

> [!IMPORTANT]
> **Questions for Phase 5:**
> 1. STLs and OBJs are often sized in millimeters, which might be massively larger or smaller than our Voxel grid. Should we automatically scale imported meshes to fit within the grid bounds, or prompt the user with a scaling slider?
> 2. When exporting your final voxel model (to 3MF/OBJ), should the Reference Object geometry be included in the export file, or is it strictly a visual guide for the editor only?

---

## Phase 6: Boolean Subtract & Assembly Preview
*Advanced preparation for 3D printing moving parts.*

**Deep Dive:**
- **Boolean Subtract:** Imagine importing a high-res cylinder mesh and using it as a "hole punch" through your voxel structure. The editor will run a Web Worker that checks every voxel's center point. If the voxel is inside the cylinder, it gets deleted. This is critical for making perfect, smooth holes for pins, screws, or joints in 3D prints.
- **Assembly Preview:** If you are building an action figure, you might draw the arm on `Layer 2` and the torso on `Layer 1`. Assembly Preview gives every layer an X, Y, and Z coordinate slider. You can slide the arm into the torso socket to preview the fit, and then slide it back out.

> [!IMPORTANT]
> **Questions for Phase 6:**
> 1. Should the Boolean Subtract tool delete voxels from *all* visible layers at once, or only cut holes in the *currently active* layer?
> 2. Should the Boolean shape be a dynamic "3D Eraser" brush attached to your mouse, or a static object that you place into the scene and click "Apply Cut"?
> 3. For Assembly Preview, do you need complex rotation sliders (pitch/yaw/roll) to test joints, or just simple XYZ movement?

---

## Phase 7: Advanced Per-Layer Exporting
*Making it easy to slice and print articulated, multi-part models.*

**Deep Dive:**
Right now, exporting to OBJ/3MF/STL dumps every single block into one monolithic file. If you want to print the left arm and torso as separate pieces so they can snap together later, you can't.
- **The Solution:** We will add "Export Layer" buttons to the Layer Panel.
- **Mass Export:** A single click on "Export All as ZIP" will generate a `.zip` archive containing `layer_1_torso.stl`, `layer_2_arm.stl`, etc. You can drag this folder straight into Bambu Studio and arrange the parts on your print bed.

> [!IMPORTANT]
> **Questions for Phase 7:**
> 1. If you used the "Assembly Preview" (Phase 6) to offset the arm by 50mm, should that 50mm offset be permanently baked into the exported STL files, or should the parts export at their original `(0,0,0)` origins so they lay flat on the printer bed?
> 2. Do we need an option to automatically calculate and generate a small "clearance gap" (e.g., 0.2mm) between layers so the printed joints don't fuse together?
