import React from 'react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAnalysisStore } from './store';

export const GraphPane: React.FC = () => {
  const { timeRange, pinned, togglePinned } = useAnalysisStore();
  const nodes = [
    {
      id: '1',
      position: { x: 0, y: 0 },
      data: { label: `Node ${timeRange.start}-${timeRange.end}` },
      style: {
        border: pinned.has('1') ? '2px solid #f00' : undefined,
        padding: 4,
        borderRadius: 4,
      },
    },
  ];
  return (
    <div data-testid="graph-pane" style={{ height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodeClick={(_, node) => togglePinned(node.id)}
      >
        <Background />
      </ReactFlow>
    </div>
  );
};

export default GraphPane;
