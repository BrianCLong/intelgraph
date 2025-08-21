import React from 'react';
interface DQFailure {
  index: number;
  field: string;
  reason: string;
}

interface Props {
  result: { passRate: number; failures: DQFailure[] };
}

const DQRunDetails: React.FC<Props> = ({ result }) => (
  <div>
    <h3>Run Details</h3>
    <p>Pass rate: {(result.passRate * 100).toFixed(2)}%</p>
    <ul>
      {result.failures.map((f, i) => (
        <li key={i}>{`${f.index} - ${f.field}: ${f.reason}`}</li>
      ))}
    </ul>
  </div>
);

export default DQRunDetails;
