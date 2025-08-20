import { EntityResolutionService } from '../services/EntityResolutionService';

describe('EntityResolutionService normalization', () => {
  const svc = new EntityResolutionService();
  const normalize = (input: any) => (svc as any).normalizeEntityProperties(input);
  const key = (input: any) => (svc as any).generateCanonicalKey(normalize(input));

  it('normalizes emails and aliases', () => {
    const props = normalize({ email: 'User.Name+spam@Gmail.com ' });
    expect(props.email).toBe('username@gmail.com');
  });

  it('normalizes urls', () => {
    const props = normalize({ url: 'https://Example.com/Path/?utm=1' });
    expect(props.url).toBe('example.com/path');
  });

  it('creates same key for equivalent values', () => {
    const k1 = key({ name: 'José Ángel', email: 'USER@EXAMPLE.com' });
    const k2 = key({ name: 'José  Angel', email: 'user@example.com' });
    expect(k1).toBe(k2);
  });
});
