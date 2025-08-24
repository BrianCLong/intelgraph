import { resolvers } from '../src/graphql/resolvers';

test('deployFearsomeOps escalates', async () => {
  const plan = await resolvers.Mutation.deployFearsomeOps(null, { 
    ids: ['1'], 
    tuners: { fearsomeMode: 0.9 } 
  });
  expect(plan.agenticSwarms).toBeDefined();
});
