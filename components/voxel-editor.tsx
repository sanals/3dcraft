'use client';

import { VoxelCanvas } from './voxel-canvas';
import { ToolPanel } from './tool-panel';
import { LayerPanel } from './layer-panel';
import { ViewPanel } from './view-panel';
import { FilePanel } from './file-panel';
import { ReferencePanel } from './reference-panel';
import { StatusBar } from './status-bar';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

export function VoxelEditor() {
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar - 30% width */}
      <div className="w-[30%] flex flex-col bg-slate-950 border-r border-slate-700 overflow-y-auto">
        <div className="sticky top-0 bg-slate-950 border-b border-slate-700 p-4 z-10">
          <h1 className="text-2xl font-bold text-white">Voxel Editor</h1>
          <p className="text-xs text-slate-400 mt-1">Create 3D voxel models</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          <ToolPanel />
          <LayerPanel />
          <ViewPanel />
          <FilePanel />
          <ReferencePanel />
        </div>
      </div>

      {/* 3D Canvas - 70% width */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <VoxelCanvas />
        <StatusBar />
      </div>
    </div>
  );
}
