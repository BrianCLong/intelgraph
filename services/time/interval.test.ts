import { overlaps, isConsistent, TemporalInterval } from './interval.js';

describe('Temporal interval helpers', () => {
  const a: TemporalInterval = {
    validFrom: new Date('2024-01-01'),
    validTo: new Date('2024-02-01'),
  };
  const b: TemporalInterval = {
    validFrom: new Date('2024-02-01'),
    validTo: new Date('2024-03-01'),
  };

  test('non-overlapping intervals', () => {
    expect(overlaps(a, b)).toBe(false);
    expect(isConsistent([a], b)).toBe(true);
  });
});
