const fc = require('fast-check');
const { generateGraph } = require('..');

describe('generateGraph', () => {
  it('produces same graph for same seed', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.record({
          persons: fc.nat(10),
          orgs: fc.nat(10),
          assets: fc.nat(10),
          comms: fc.nat(10)
        }),
        (seed, counts) => {
          const spec = { seed: String(seed), counts };
          const g1 = generateGraph(spec);
          const g2 = generateGraph(spec);
          expect(g1).toEqual(g2);
        }
      )
    );
  });
});
