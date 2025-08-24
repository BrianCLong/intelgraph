import { estimateCost } from '../nl2cypher/costEstimator';

describe('cost estimator', () => {
  it('assigns higher cost for filtered queries', () => {
    expect(estimateCost({ type: 'find', label: 'Person', filter: null })).toBe(1);
    expect(
      estimateCost({
        type: 'find',
        label: 'Person',
        filter: { property: 'name', value: 'Alice' },
      }),
    ).toBe(2);
    expect(estimateCost({ type: 'count', label: 'Person', filter: null })).toBe(1);
    expect(
      estimateCost({
        type: 'count',
        label: 'Person',
        filter: { property: 'name', value: 'Alice' },
      }),
    ).toBe(2);
  });
});
