import { makeDepthCostPlugin } from '../src/plugins/depthCost';
import { buildSchema } from 'graphql';

test('rejects over-budget queries', async () => {
  const plugin = makeDepthCostPlugin({ maxDepth: 1, maxCost: 1 });
  const schema = buildSchema('type Query { a: String, b: String }');
  await expect(
    plugin.requestDidStart!({ schema, request: { query: '{ a b }', variables: {} } } as any),
  ).rejects.toThrow('Query exceeds limits');
});
