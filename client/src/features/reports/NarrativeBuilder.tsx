import React from 'react';
import { Hypothesis } from '../hypotheses/store';

interface Props {
  hypotheses: Hypothesis[];
}

export function NarrativeBuilder({ hypotheses }: Props) {
  const uncited = hypotheses.flatMap((h) =>
    h.evidence.filter((e) => !e.cited).map((e) => `${h.id}:${e.id}`),
  );
  if (uncited.length > 0) {
    return <div>Missing citations: {uncited.join(', ')}</div>;
  }
  return (
    <div>
      <h2>Report</h2>
      {hypotheses.map((h) => (
        <p key={h.id}>
          {h.text} ({Math.round(h.posterior * 100)}%)
        </p>
      ))}
    </div>
  );
}

export default NarrativeBuilder;
