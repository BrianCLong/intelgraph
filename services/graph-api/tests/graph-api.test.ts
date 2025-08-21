import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';

class MemoryDriver {
  private store = new Map<string, any>();

  session() {
    const store = this.store;
    return {
      run: async (query: string, params: any) => {
        if (query.startsWith('CREATE')) {
          const props = params.props;
          store.set(props.id, props);
          return { records: [{ get: () => ({ properties: props }) }] };
        }
        if (query.startsWith('MATCH')) {
          const node = store.get(params.id);
          return {
            records: node ? [{ get: () => ({ properties: node }) }] : [],
          };
        }
        return { records: [] };
      },
      close: async () => undefined,
    };
  }

  close = async () => undefined;
}

describe('Graph API', () => {
  let app: any;

  beforeAll(async () => {
    const driver: any = new MemoryDriver();
    const created = await createApp(driver);
    app = created.app;
  });

  const token = jwt.sign({ tenant: 't1' }, 'local-secret');

  it('creates and reads a person', async () => {
    const query = `mutation($input: NodeInput!) { createPerson(input: $input) { id policy { tenantId } } }`;
    const variables = {
      input: {
        provenance: { source: 's', confidence: 0.9, chain: [] },
        policy: { tenantId: 't1' },
      },
    };
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables });
    expect(res.status).toBe(200);
    expect(res.body.data.createPerson.policy.tenantId).toBe('t1');
  });

  it('rejects when no auth provided', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({ query: '{ persons { id } }' });
    expect(res.status).toBe(401);
  });
});
