import { resolvers } from '../graphql/resolvers';
import { mockDriver } from './mocks';

test('activeMeasuresPortfolio returns tuned measures', async () => {
  const result = await resolvers.Query.activeMeasuresPortfolio(null, { query: 'disinfo', tuners: { proportionality: 0.7 } }, { driver: mockDriver });
  expect(result[0].unattributabilityScore).toBeGreaterThan(0.5);
});