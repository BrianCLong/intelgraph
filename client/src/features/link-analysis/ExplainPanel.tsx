import React from 'react';
import { useAnalysisStore } from './store';

export const ExplainPanel: React.FC = () => {
  const { timeRange, activeQuery, pinned, clearPinned } = useAnalysisStore();
  return (
    <div
      data-testid="explain-panel"
      className="absolute bottom-0 right-0 m-4 p-2 bg-gray-800 text-white text-sm space-y-1"
    >
      <div>Time: {timeRange.start} - {timeRange.end}</div>
      <div>Query: {activeQuery ?? 'none'}</div>
      <div>Pinned: {pinned.size}</div>
      {pinned.size > 0 && (
        <div>
          <button
            onClick={clearPinned}
            className="mt-1 rounded bg-gray-700 px-2 py-1 text-xs"
          >
            Clear pinned
          </button>
        </div>
      )}
    </div>
  );
};

export default ExplainPanel;
