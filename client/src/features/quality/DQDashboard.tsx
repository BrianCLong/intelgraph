import React from 'react';
import { gql, useQuery } from '@apollo/client';

const DQ_STATUS = gql`
  query dqStatus($sourceId: ID!) {
    dqStatus(sourceId: $sourceId) {
      passRate
      failures {
        field
        reason
      }
    }
  }
`;

interface Props {
  sourceId: string;
}

const DQDashboard: React.FC<Props> = ({ sourceId }) => {
  const { data } = useQuery(DQ_STATUS, { variables: { sourceId } });
  const status = data?.dqStatus;
  return (
    <div>
      <h2>Data Quality</h2>
      {status && (
        <>
          <p>Pass rate: {(status.passRate * 100).toFixed(2)}%</p>
          <ul>
            {status.failures.slice(0, 5).map((f: any, idx: number) => (
              <li key={idx}>{`${f.field}: ${f.reason}`}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default DQDashboard;
