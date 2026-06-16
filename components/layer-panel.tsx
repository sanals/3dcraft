'use client';

import { useVoxelStore } from '@/lib/voxel-store';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Plus, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';

export function LayerPanel() {
  const { layers, activeLayerId, setActiveLayer, addLayer, removeLayer, toggleLayerVisibility, renameLayer } = useVoxelStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newLayerName, setNewLayerName] = useState('');

  const handleAddLayer = () => {
    const name = newLayerName.trim() || `Layer ${layers.length + 1}`;
    addLayer(name);
    setNewLayerName('');
  };

  const handleRename = (id: string, name: string) => {
    renameLayer(id, name);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Layers</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center gap-2 p-2 rounded border transition-colors cursor-pointer ${
                activeLayerId === layer.id
                  ? 'bg-blue-900 border-blue-500'
                  : 'bg-slate-800 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => setActiveLayer(layer.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layer.id);
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              {editingId === layer.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(layer.id, editName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(layer.id, editName);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-2 py-1 rounded bg-slate-700 text-white text-sm outline-none"
                />
              ) : (
                <span className="flex-1 text-sm text-white truncate">{layer.name}</span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(layer.id);
                  setEditName(layer.name);
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Edit2 size={14} />
              </button>

              {layers.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Layer name"
          value={newLayerName}
          onChange={(e) => setNewLayerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddLayer();
          }}
          className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-sm outline-none focus:border-blue-500"
        />
        <Button size="sm" onClick={handleAddLayer}>
          <Plus size={16} />
        </Button>
      </div>
    </div>
  );
}
