import React from 'react';
import { useAnalysisStore } from './store';
// Placeholder for Mapbox GL map
// In a full implementation, mapbox-gl would render a map synchronized with timeRange

export const MapPane: React.FC = () => {
  const timeRange = useAnalysisStore((s) => s.timeRange);
  return (
    <div data-testid="map-pane" className="p-2">
      Map showing data from {timeRange.start} to {timeRange.end}
    </div>
  );
};

export default MapPane;
