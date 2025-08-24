import { WebhookProvider } from '../src/providers';

describe('WebhookProvider', () => {
  it('verifies signatures', () => {
    const provider = new WebhookProvider('secret');
    const payload = JSON.stringify({ a: 1 });
    const sig = provider.sign(payload);
    expect(provider.verify(payload, sig)).toBe(true);
    expect(provider.verify(payload, 'bad')).toBe(false);
  });
});
