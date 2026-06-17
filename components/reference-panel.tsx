'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2, Upload, Package, ChevronDown, ChevronRight, Download, Crosshair, Maximize, ArrowDownToLine, Link as LinkIcon, Unlink } from 'lucide-react';
import { useVoxelStore } from '@/lib/voxel-store';
import { loadMeshFile, disposeRefGeometry, setRefOpacity, recenterRefGeometry, getFitScale, getDropToGroundOffset } from '@/lib/reference-loader';
import { Button } from '@/components/ui/button';

export function ReferencePanel() {
  const { referenceObjects, addReferenceObject, removeReferenceObject, updateReferenceObject } =
    useVoxelStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uniformScale, setUniformScale] = useState<Record<string, boolean>>({});

  // ── Import ────────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const meta = await loadMeshFile(file);
      addReferenceObject({ ...meta, includeInExport: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Per-object actions ────────────────────────────────────────────────────

  const toggleVisible = (id: string, current: boolean) =>
    updateReferenceObject(id, { visible: !current });

  const toggleLocked = (id: string, current: boolean) =>
    updateReferenceObject(id, { locked: !current });

  const toggleExport = (id: string, current: boolean) =>
    updateReferenceObject(id, { includeInExport: !current });

  const handleOpacity = (id: string, opacity: number) => {
    updateReferenceObject(id, { opacity });
    setRefOpacity(id, opacity);  // live-update the Three.js material
  };

  const handleCenter = (id: string) => {
    recenterRefGeometry(id);
    // Reset the store position to [0,0,0] so the panel inputs reflect the new state
    updateReferenceObject(id, { position: [0, 0, 0] });
  };

  const handleFit = (id: string) => {
    const s = getFitScale(id, 16); // 16 units is a reasonable size to fit the default grid
    updateReferenceObject(id, { scale: [s, s, s] });
  };

  const handleDrop = (id: string) => {
    const obj = referenceObjects.find((r) => r.id === id);
    if (!obj) return;
    const offset = getDropToGroundOffset(id);
    updateReferenceObject(id, {
      position: [obj.position[0], obj.position[1] + offset, obj.position[2]],
    });
  };

  const handleTransform = (
    id: string,
    field: 'position' | 'rotation' | 'scale',
    axis: 0 | 1 | 2,
    value: number
  ) => {
    const obj = referenceObjects.find((r) => r.id === id);
    if (!obj) return;

    if (field === 'scale' && uniformScale[id]) {
      // Apply the new value to all three axes at once
      updateReferenceObject(id, { scale: [value, value, value] });
      return;
    }

    const updated = [...obj[field]] as [number, number, number];
    updated[axis] = value;
    updateReferenceObject(id, { [field]: updated });
  };

  const handleDelete = (id: string) => {
    disposeRefGeometry(id);
    removeReferenceObject(id);
    if (expandedId === id) setExpandedId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Package size={14} className="text-indigo-400" />
          Reference Meshes
        </h3>
        <span className="text-xs text-slate-500">{referenceObjects.length} loaded</span>
      </div>

      {/* Import button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="w-full gap-2 border-indigo-700/60 text-indigo-400 hover:bg-indigo-900/30 hover:text-indigo-300"
      >
        <Upload size={16} />
        {loading ? 'Loading…' : 'Import Mesh (.stl / .obj / .glb)'}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj,.glb,.gltf"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 rounded p-2">{error}</p>
      )}

      {/* Object list */}
      {referenceObjects.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-3">
          No reference meshes imported yet.
          <br />Import a mesh to use as a building guide.
        </p>
      ) : (
        <div className="space-y-2">
          {referenceObjects.map((obj) => (
            <div
              key={obj.id}
              className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden"
            >
              {/* Row header */}
              <div className="flex items-center gap-1 px-2 py-1.5">
                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(expandedId === obj.id ? null : obj.id)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  {expandedId === obj.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>

                {/* Name */}
                <span
                  className="flex-1 text-xs text-slate-200 truncate"
                  title={obj.name}
                >
                  {obj.name}
                </span>

                {/* Visibility */}
                <button
                  onClick={() => toggleVisible(obj.id, obj.visible)}
                  title={obj.visible ? 'Hide' : 'Show'}
                  className={`p-0.5 rounded transition-colors ${
                    obj.visible ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {obj.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>

                {/* Lock / Unlock — locked = visual only */}
                <button
                  onClick={() => toggleLocked(obj.id, obj.locked)}
                  title={obj.locked ? 'Locked (visual only) — click to allow voxel placement on surface' : 'Unlocked — clicking surface places voxels'}
                  className={`p-0.5 rounded transition-colors ${
                    obj.locked ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'
                  }`}
                >
                  {obj.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(obj.id)}
                  title="Remove reference mesh"
                  className="p-0.5 rounded text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Expanded controls */}
              {expandedId === obj.id && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-700 space-y-3">

                  {/* Tools Row (Opacity + Actions) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider">
                        Opacity — {Math.round(obj.opacity * 100)}%
                      </label>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleDrop(obj.id)}
                          title="Drop mesh so its lowest point rests on the ground"
                          className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-200 transition-colors"
                        >
                          <ArrowDownToLine size={10} />
                          Drop
                        </button>
                        <button
                          onClick={() => handleFit(obj.id)}
                          title="Scale mesh uniformly so it fits reasonably within the grid"
                          className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-200 transition-colors"
                        >
                          <Maximize size={10} />
                          Fit
                        </button>
                        <button
                          onClick={() => handleCenter(obj.id)}
                          title="Move mesh so its geometric centre is at position [0, 0, 0]"
                          className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-200 transition-colors"
                        >
                          <Crosshair size={10} />
                          Center
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={obj.opacity}
                      onChange={(e) => handleOpacity(obj.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 accent-indigo-500"
                    />
                  </div>

                  {/* Position */}
                  <TransformRow
                    label="Position"
                    value={obj.position}
                    step={1}
                    onChange={(axis, v) => handleTransform(obj.id, 'position', axis, v)}
                  />

                  {/* Rotation */}
                  <TransformRow
                    label="Rotation °"
                    value={obj.rotation}
                    step={15}
                    onChange={(axis, v) => handleTransform(obj.id, 'rotation', axis, v)}
                  />

                  {/* Scale */}
                  <TransformRow
                    label="Scale"
                    value={obj.scale}
                    step={0.1}
                    onChange={(axis, v) => handleTransform(obj.id, 'scale', axis, v)}
                    isUniform={uniformScale[obj.id]}
                    onToggleUniform={() => setUniformScale(prev => ({ ...prev, [obj.id]: !prev[obj.id] }))}
                  />

                  {/* Include in export */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={obj.includeInExport}
                      onChange={() => toggleExport(obj.id, obj.includeInExport)}
                      className="w-3.5 h-3.5 accent-emerald-500"
                    />
                    <span className="text-xs text-slate-300 flex items-center gap-1">
                      <Download size={11} className="text-emerald-400" />
                      Include in OBJ / 3MF export
                    </span>
                  </label>

                  {/* Lock hint */}
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {obj.locked
                      ? '🔒 Locked — visual guide only. Unlock to place voxels on its surface.'
                      : '🔓 Unlocked — click the mesh surface in the viewport to place voxels on it.'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Transform row sub-component ───────────────────────────────────────────────

function TransformRow({
  label,
  value,
  step,
  onChange,
  onToggleUniform,
  isUniform,
}: {
  label: string;
  value: [number, number, number];
  step: number;
  onChange: (axis: 0 | 1 | 2, v: number) => void;
  onToggleUniform?: () => void;
  isUniform?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 w-14">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
        {onToggleUniform && (
          <button
            onClick={onToggleUniform}
            title={isUniform ? 'Uniform Scale: Linked' : 'Uniform Scale: Unlinked'}
            className={`p-0.5 rounded transition-colors ${
              isUniform ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isUniform ? <LinkIcon size={10} /> : <Unlink size={10} />}
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <div key={axis} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-slate-500">{axis}</span>
            <input
              type="number"
              value={value[i]}
              step={step}
              onChange={(e) => onChange(i as 0 | 1 | 2, parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-700 text-slate-100 text-xs rounded px-1.5 py-0.5 border border-slate-600 focus:outline-none focus:border-indigo-500 text-center"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
