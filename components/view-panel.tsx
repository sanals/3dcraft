'use client';

import { useVoxelStore } from '@/lib/voxel-store';
import { Button } from '@/components/ui/button';
import { Grid3X3, Eye, RotateCcw } from 'lucide-react';

export function ViewPanel() {
  const { showGrid, setShowGrid, gridSize, setGridSize } = useVoxelStore();

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
