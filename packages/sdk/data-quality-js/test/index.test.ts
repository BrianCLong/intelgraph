import { createRule } from '../src/index';

test('createRule posts to endpoint', async () => {
  const calls: any[] = [];
  // @ts-ignore
  global.fetch = async (url: string, opts: any) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => ({ ok: true }) } as any;
  };
  await createRule('http://test', { id: '1', field: 'f', type: 'required' });
  expect(calls[0].url).toBe('http://test/dq/rules');
  expect(JSON.parse(calls[0].opts.body).id).toBe('1');
});
