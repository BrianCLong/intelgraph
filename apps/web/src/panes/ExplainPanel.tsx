import React from 'react';
import { useAppSelector } from '../store/hooks';
import { selectActiveQuery } from '../features/viewSync/viewSyncSlice';

export default function ExplainPanel() {
  const q = useAppSelector(selectActiveQuery);
  const policy = [{ id: 'POL-001', reason: 'License: internal-only field redacted' }];
  return (
    <div style={{ padding: 12 }}>
      <h3>Explain this view</h3>
      <pre data-test="explain-query">{JSON.stringify(q, null, 2)}</pre>
      <h4>Policy rationale</h4>
      <ul>
        {policy.map((p) => (
          <li key={p.id}>
            {p.id}: {p.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
