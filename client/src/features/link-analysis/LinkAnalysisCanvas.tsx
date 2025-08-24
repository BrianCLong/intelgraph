import React from 'react';
import TimelinePane from './TimelinePane';
import MapPane from './MapPane';
import GraphPane from './GraphPane';
import CommandPalette from './CommandPalette';
import ExplainPanel from './ExplainPanel';

export const LinkAnalysisCanvas: React.FC = () => {
  return (
    <div
      className="relative grid grid-cols-3 h-screen divide-x"
      data-testid="link-analysis-canvas"
    >
      <TimelinePane />
      <MapPane />
      <GraphPane />
      <CommandPalette />
      <ExplainPanel />
    </div>
  );
};

export default LinkAnalysisCanvas;
