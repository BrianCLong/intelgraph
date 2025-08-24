import axios from 'axios';
import { createRule } from '../src';

jest.mock('axios');
const mocked = axios as jest.Mocked<typeof axios>;

describe('alerts-js SDK', () => {
  it('posts rule to service', async () => {
    mocked.post.mockResolvedValue({ data: { ok: true } });
    const res = await createRule('http://example.com', {
      source: 's',
      actions: [],
      correlationKey: 'k',
      windowMs: 1
    });
    expect(res.ok).toBe(true);
    expect(mocked.post).toHaveBeenCalledWith('http://example.com/alerts/rules', expect.any(Object));
  });
});
