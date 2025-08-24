import { normalizeIOC } from '../src/index.js';

describe('IOC Normalizer', () => {
  test('normalizes domain', () => {
    const res = normalizeIOC('Example.COM');
    expect(res).toEqual({
      type: 'domain',
      value: 'example.com',
      key: 'domain:example.com',
      confidence: 0.5,
      source: undefined
    });
  });

  test('normalizes ip', () => {
    const res = normalizeIOC('8.8.8.8');
    expect(res?.type).toBe('ip');
  });

  test('returns null for invalid', () => {
    expect(normalizeIOC('not-an-ioc')).toBeNull();
  });
});
