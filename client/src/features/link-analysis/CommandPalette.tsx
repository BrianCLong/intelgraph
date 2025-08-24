import React, { useEffect, useState } from 'react';
import { useAnalysisStore } from './store';

const SAVED_QUERIES = ['recent-incidents', 'top-entities'];

export const CommandPalette: React.FC = () => {
  const runQuery = useAnalysisStore((s) => s.runQuery);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) return null;

  return (
    <div data-testid="command-palette" className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white text-black p-4 space-y-2">
        {SAVED_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => {
              runQuery(q);
              setOpen(false);
            }}
            className="block w-full text-left p-2 hover:bg-gray-100"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CommandPalette;
