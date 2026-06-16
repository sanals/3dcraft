'use client';

import { useVoxelStore } from '@/lib/voxel-store';
import { Button } from '@/components/ui/button';
import { Download, Upload, Box, Layers, Package } from 'lucide-react';
import { useRef } from 'react';
import { exportSTL, export3MF, exportOBJ, downloadBlob } from '@/lib/export-3d';

export function FilePanel() {
  const { exportJSON, importJSON, getAllVoxels } = useVoxelStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── JSON ────────────────────────────────────────────────────────────────
  const handleExportJSON = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `voxel-model-${Date.now()}.json`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        importJSON(content);
      } catch (error) {
        alert("Failed to import file. Make sure it's a valid voxel model JSON.");
        console.error(error);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── STL ─────────────────────────────────────────────────────────────────
  const handleExportSTL = () => {
    const voxels = getAllVoxels();
    if (voxels.length === 0) {
      alert('No voxels to export. Add some blocks first!');
      return;
    }
    const blob = exportSTL(voxels);
    downloadBlob(blob, `voxel-model-${Date.now()}.stl`);
  };

  // ── OBJ + MTL (colour) ───────────────────────────────────────────────────
  const handleExportOBJ = () => {
    const voxels = getAllVoxels();
    if (voxels.length === 0) {
      alert('No voxels to export. Add some blocks first!');
      return;
    }
    const blob = exportOBJ(voxels);
    downloadBlob(blob, `voxel-model-${Date.now()}.zip`);
  };

  // ── 3MF ─────────────────────────────────────────────────────────────────
  const handleExport3MF = () => {
    const voxels = getAllVoxels();
    if (voxels.length === 0) {
      alert('No voxels to export. Add some blocks first!');
      return;
    }
    const blob = export3MF(voxels);
    downloadBlob(blob, `voxel-model-${Date.now()}.3mf`);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">File</h3>
        <div className="space-y-2">
          {/* JSON */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="w-full gap-2"
          >
            <Download size={16} />
            Export JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full gap-2"
          >
            <Upload size={16} />
            Import JSON
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          {/* Divider */}
          <div className="border-t border-slate-700 my-1" />
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold px-0.5">
            3D Print Export
          </p>

          {/* OBJ + MTL — best colour support */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportOBJ}
            title="Exports a ZIP containing .obj + .mtl files. Open the .obj in your slicer for full colour support."
            className="w-full gap-2 border-sky-700/60 text-sky-400 hover:bg-sky-900/30 hover:text-sky-300"
          >
            <Package size={16} />
            Export OBJ (colour) ★
          </Button>

          {/* 3MF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport3MF}
            title="Exports a .3mf file with colour data. Bambu Studio will show a 'load geometry only' prompt — this is normal, colour is preserved."
            className="w-full gap-2 border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300"
          >
            <Layers size={16} />
            Export 3MF (colour)
          </Button>

          {/* STL — no colour */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSTL}
            title="Plain geometry only — STL does not support colour in any major slicer. Use OBJ or 3MF for coloured prints."
            className="w-full gap-2 border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
          >
            <Box size={16} />
            Export STL (no colour)
          </Button>
        </div>
      </div>
    </div>
  );
}
