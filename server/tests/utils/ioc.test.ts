import { normalizeIoC, fuse } from '@/utils/ioc';

describe('normalizeIoC', () => {
  it('lowercases and converts domains to punycode', () => {
    const normalized = normalizeIoC('domain', 'Bücher.de');
    expect(normalized).toBe('xn--bcher-kva.de');
  });

  it('strips plus tags from emails', () => {
    const normalized = normalizeIoC('email', 'User+test@Example.com');
    expect(normalized).toBe('user@example.com');
  });

  it('normalizes urls', () => {
    const normalized = normalizeIoC('url', 'HTTPS://Example.com/Path');
    expect(normalized).toBe('https://example.com/Path');
  });
});

describe('fuse', () => {
  it('combines confidence scores', () => {
    expect(fuse([80, 50])).toBe(90);
  });

  it('clamps inputs outside range', () => {
    expect(fuse([200, -50])).toBe(50);
  });
});
