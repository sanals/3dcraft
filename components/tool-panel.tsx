'use client';

import { useVoxelStore } from '@/lib/voxel-store';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Paintbrush, Pointer } from 'lucide-react';

export function ToolPanel() {
  const { currentTool, setCurrentTool, currentColor, setCurrentColor, clearAll } = useVoxelStore();

  const tools = [
    { id: 'add', label: 'Add', icon: Plus },
    { id: 'remove', label: 'Remove', icon: Trash2 },
    { id: 'paint', label: 'Paint', icon: Paintbrush },
    { id: 'select', label: 'Select', icon: Pointer },
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
