import React from 'react';
import { createHypothesisStore } from '../store';

const store = createHypothesisStore();

export function HypothesisWorkbench() {
  return (
    <div>
      <h2>Hypotheses</h2>
      <ul>
        {store.hypotheses.map((h) => (
          <li key={h.id}>
            {h.text} – {Math.round(h.posterior * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HypothesisWorkbench;
