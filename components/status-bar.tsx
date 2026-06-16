'use client';

import { useVoxelStore } from '@/lib/voxel-store';
import { RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StatusBar() {
  const { currentTool, currentColor, getAllVoxels, undo, redo, canUndo, canRedo } = useVoxelStore();
  const voxelCount = getAllVoxels().length;

  const toolLabels: Record<string, string> = {
    add: 'Add Mode',
    remove: 'Remove Mode',
    paint: 'Paint Mode',
    select: 'Select Mode',
  };

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 bg-slate-900 border-t border-slate-700">
      <div className="flex items-center gap-6 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Tool:</span>
          <span className="font-mono">{toolLabels[currentTool] || currentTool}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Color:</span>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-slate-600"
              style={{ backgroundColor: currentColor }}
            />
            <span className="font-mono">{currentColor}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Voxels:</span>
          <span className="font-mono">{voxelCount}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="gap-2"
        >
          <RotateCcw size={16} />
          <span className="text-xs">Undo</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="gap-2"
        >
          <RotateCw size={16} />
          <span className="text-xs">Redo</span>
        </Button>
      </div>
    </div>
  );
}
