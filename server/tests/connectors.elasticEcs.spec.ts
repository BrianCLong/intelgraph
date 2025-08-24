import { ingestEcsEvents } from '../src/services/connectors/elasticEcs';
import * as neo from '../src/db/neo4j';

jest.spyOn(neo, 'getNeo4jDriver').mockReturnValue({
  session: () => ({
    writeTransaction: async (fn: any) => fn({ run: async () => {} }),
    close: async () => {}
  })
} as any);

test('ingests minimal ECS array', async () => {
  const events = [{ '@timestamp': '2025-08-22T00:00:00Z', event: { id: 'e1', category: 'network' }, source: { ip: '1.1.1.1' }, destination: { ip: '2.2.2.2' }, host: { name: 'h1' }, user: { name: 'u1' } }];
  const res = await ingestEcsEvents(events, { source: 'test' });
  expect(res.received).toBe(1);
  expect(res.accepted).toBe(1);
  expect(res.rejected).toBe(0);
});
