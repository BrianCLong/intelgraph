import React from 'react';
import { render, screen } from '@testing-library/react';
import { NarrativeBuilder } from './NarrativeBuilder';
import { Hypothesis } from '../hypotheses/store';

describe('NarrativeBuilder', () => {
  it('blocks publish when citations missing', () => {
    const h: Hypothesis = {
      id: 'h1',
      text: 'claim',
      prior: 0.5,
      posterior: 0.5,
      evidence: [{ id: 'e1', description: 'uncited', cited: false, weight: 1 }],
      residualUnknowns: [],
      dissent: [],
    };
    render(<NarrativeBuilder hypotheses={[h]} />);
    expect(screen.getByText(/Missing citations/)).toBeInTheDocument();
  });
});
