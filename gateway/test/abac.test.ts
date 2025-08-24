import { makeAbacPlugin } from '../src/plugins/abac';

jest.mock('../src/services/opa', () => ({
  evaluate: jest.fn().mockResolvedValue({ allow: false, obligations: ['need-consent'] }),
}));

test('attaches obligations when policy denies', async () => {
  const plugin = makeAbacPlugin();
  const ctx: Record<string, unknown> = {};
  await expect(
    plugin.requestDidStart!({ request: { operationName: 'Op' }, contextValue: ctx } as any),
  ).rejects.toMatchObject({ obligations: ['need-consent'] });
  expect(ctx.obligations).toEqual(['need-consent']);
});
