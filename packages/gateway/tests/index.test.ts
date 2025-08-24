import { resolvers } from '../src/index';
import fetch from 'node-fetch';

jest.mock('node-fetch', () => jest.fn());
class Response {
  constructor(private body: string) {}
  async json() {
    return JSON.parse(this.body);
  }
}

describe('gateway resolvers', () => {
  it('openSession calls assist', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ id: 's1', assistantId: 'a' }))
    );
    const res: any = await resolvers.Mutation.openSession({}, { assistantId: 'a' });
    expect(res.id).toBe('s1');
  });
});
