import { useState } from 'react';
import { GraphPanel } from './GraphPanel';
import { TimelinePanel } from './TimelinePanel';
import { MapPanel } from './MapPanel';
import { CommandPalette } from './CommandPalette';
import { ExplainViewPanel } from './ExplainViewPanel';
import { useAppStore } from './store';
import { ErrorBoundary } from './ErrorBoundary';

export const TriPaneExplorer = () => {
  const theme = useAppStore((s) => s.theme);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="flex h-screen text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900">
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
          <ErrorBoundary>
            <GraphPanel />
          </ErrorBoundary>
        </div>
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
          <ErrorBoundary>
            <TimelinePanel />
          </ErrorBoundary>
        </div>
        <div className="w-1/3">
          <ErrorBoundary>
            <MapPanel />
          </ErrorBoundary>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {explainOpen && (
        <div className="absolute top-0 right-0 w-64 h-full bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <ExplainViewPanel />
        </div>
      )}
      <div className="absolute bottom-4 left-4 space-x-2">
        <button
          aria-label="Undo"
          onClick={undo}
          className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
        >
          Undo
        </button>
        <button
          aria-label="Redo"
          onClick={redo}
          className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
        >
          Redo
        </button>
        <button
          aria-label="Explain"
          onClick={() => setExplainOpen((v) => !v)}
          className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
        >
          Explain
        </button>
      </div>
    </div>
  );
};
