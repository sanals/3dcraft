'use client';

import { useVoxelStore } from '@/lib/voxel-store';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Paintbrush, Pointer, BoxSelect } from 'lucide-react';

export function ToolPanel() {
  const {
    currentTool, setCurrentTool,
    currentColor, setCurrentColor,
    symmetry, setSymmetry,
    symmetryOffset, setSymmetryOffset,
    clearAll
  } = useVoxelStore();

  const tools = [
    { id: 'add', label: 'Add', icon: Plus },
    { id: 'remove', label: 'Remove', icon: Trash2 },
    { id: 'paint', label: 'Paint', icon: Paintbrush },
    { id: 'select', label: 'Select', icon: Pointer },
    { id: 'box', label: 'Box', icon: BoxSelect },
  ] as const;

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Button
                key={tool.id}
                variant={currentTool === tool.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool(tool.id)}
                className="flex items-center gap-2"
                title={tool.label}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{tool.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Color</h3>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-12 h-12 rounded cursor-pointer border-2 border-slate-600 hover:border-slate-500"
          />
          <span className="text-sm text-slate-300 font-mono">{currentColor}</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3" title="Place voxels symmetrically across axes">
          Symmetry (Mirroring)
        </h3>
        <div className="flex gap-2">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <Button
              key={axis}
              variant={symmetry[axis] ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSymmetry(axis, !symmetry[axis])}
              className="flex-1 uppercase font-bold"
              title={`Mirror across ${axis.toUpperCase()} axis`}
            >
              {axis}
            </Button>
          ))}
        </div>
        
        {/* Render offset inputs for any active symmetry axis */}
        {(symmetry.x || symmetry.y || symmetry.z) && (
          <div className="mt-2 space-y-1 bg-slate-800 p-2 rounded-md border border-slate-700">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Mirror Plane Offset
            </label>
            {(['x', 'y', 'z'] as const).map((axis) => {
              if (!symmetry[axis]) return null;
              return (
                <div key={axis} className="flex items-center justify-between text-xs">
                  <span className="uppercase text-slate-300 w-4 font-mono">{axis}:</span>
                  <input
                    type="number"
                    step={1}
                    value={symmetryOffset[axis]}
                    onChange={(e) => setSymmetryOffset(axis, parseInt(e.target.value) || 0)}
                    className="w-16 bg-slate-900 text-slate-100 text-xs rounded px-1.5 py-1 border border-slate-600 focus:outline-none focus:border-indigo-500 text-center"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={clearAll}
        className="w-full"
      >
        Clear All
      </Button>
    </div>
  );
}
