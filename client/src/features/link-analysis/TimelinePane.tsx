import React from 'react';
import { useAnalysisStore } from './store';

export const TimelinePane: React.FC = () => {
  const timeRange = useAnalysisStore((s) => s.timeRange);
  const setTimeRange = useAnalysisStore((s) => s.setTimeRange);

  return (
    <div data-testid="timeline-pane" className="p-2 space-y-2">
      <input
        data-testid="start-range"
        type="range"
        min={0}
        max={100}
        value={timeRange.start}
        onChange={(e) =>
          setTimeRange({ ...timeRange, start: Number(e.target.value) })
        }
      />
      <input
        data-testid="end-range"
        type="range"
        min={0}
        max={100}
        value={timeRange.end}
        onChange={(e) =>
          setTimeRange({ ...timeRange, end: Number(e.target.value) })
        }
      />
    </div>
  );
};

export default TimelinePane;
