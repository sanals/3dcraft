'use client';

import { useVoxelStore } from '@/lib/voxel-store';
import { Button } from '@/components/ui/button';
import { Grid3X3, Eye, RotateCcw } from 'lucide-react';

export function ViewPanel() {
  const { showGrid, setShowGrid, gridSize, setGridSize, voxelSubdivision, setVoxelSubdivision } = useVoxelStore();

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">View Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300 flex items-center gap-2">
              <Grid3X3 size={16} />
              Show Grid
            </label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Grid Size</label>
            <input
              type="range"
              min="8"
              max="64"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-slate-400 mt-1 block">{gridSize}x{gridSize}x{gridSize}</span>
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2" title="How many blocks fit along one edge of a grid square">
              Blocks per Square (Subdivision)
            </label>
            <select
              value={voxelSubdivision}
              onChange={(e) => setVoxelSubdivision(parseInt(e.target.value))}
              className="w-full bg-slate-800 text-slate-200 text-sm rounded border border-slate-700 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="1">1 (1x1)</option>
              <option value="2">2 (2x2 = 4 blocks)</option>
              <option value="4">4 (4x4 = 16 blocks)</option>
              <option value="8">8 (8x8 = 64 blocks)</option>
              <option value="16">16 (16x16 = 256 blocks)</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-1.5 block">
              Warning: Changing this shrinks/grows all currently painted blocks!
            </span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        title="Reset camera view"
      >
        <RotateCcw size={16} />
        Reset View
      </Button>
    </div>
  );
}
