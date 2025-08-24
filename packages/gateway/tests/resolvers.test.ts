import { createServer } from '../src/index';

it('returns SLOs', async () => {
  const server = await createServer();
  const res = await server.executeOperation({ query: '{ slos { name } }' });
  expect(res.errors).toBeUndefined();
  expect(res.data?.slos[0].name).toBe('availability');
});
