'use client';

import { useEffect } from 'react';
import { useVoxelStore } from '@/lib/voxel-store';

export function useKeyboardShortcuts() {
  const { setCurrentTool, undo, redo } = useVoxelStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            undo();
            break;
          case 'y':
            event.preventDefault();
            redo();
            break;
          default:
            break;
        }
      }

      // Tool selection
      switch (event.key.toLowerCase()) {
        case '1':
          event.preventDefault();
          setCurrentTool('add');
          break;
        case '2':
          event.preventDefault();
          setCurrentTool('remove');
          break;
        case '3':
          event.preventDefault();
          setCurrentTool('paint');
          break;
        case '4':
          event.preventDefault();
          setCurrentTool('select');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTool, undo, redo]);
}
