import React from 'react';
import ReactFlow from 'react-flow-renderer';

const FearsomeDashboard = ({ plan }) => (
  <div>
    <h1>Fearsome Ops</h1>
    <ReactFlow elements={plan?.shadowWarSims || []} />
  </div>
);

export default FearsomeDashboard;
