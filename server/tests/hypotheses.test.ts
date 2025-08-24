import { bayesianUpdate, applyEvidence, addDissent, Hypothesis, Evidence } from '../src/hypotheses';

describe('hypothesis updates', () => {
  const base: Hypothesis = {
    id: 'h1',
    statement: 'Test hypothesis',
    prior: 0.2,
    evidence: [],
    posterior: 0.2,
    residualUnknowns: [],
    dissent: [],
  };

  it('updates probability with evidence', () => {
    const e: Evidence = {
      id: 'e1',
      description: 'supporting',
      likelihoodGivenHypothesis: 0.9,
      likelihoodGivenAlternative: 0.1,
      cited: true,
    };
    const updated = applyEvidence(base, e);
    expect(updated.posterior).toBeCloseTo(0.6923, 4);
  });

  it('records dissent', () => {
    const dissenting = addDissent(base, 'alternative explanation');
    expect(dissenting.dissent).toContain('alternative explanation');
  });
});
