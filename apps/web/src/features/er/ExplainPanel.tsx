import React from 'react';

export interface ExplainPanelProps {
  details?: any;
}

export const ExplainPanel: React.FC<ExplainPanelProps> = ({ details }) => {
  return (
    <div>
      <h3>Explanation</h3>
      <pre>{details ? JSON.stringify(details, null, 2) : 'No data'}</pre>
    </div>
  );
};
