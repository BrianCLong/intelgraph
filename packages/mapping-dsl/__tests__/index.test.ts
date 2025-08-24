import { validateMapping } from '../src/index';

describe('validateMapping', () => {
  it('validates a correct mapping', () => {
    const result = validateMapping({
      version: '1.0.0',
      entities: [{ type: 'Person', fields: { id: 'id' } }],
      relationships: [{ type: 'KNOWS', from: 'Person', to: 'Person' }]
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns errors for invalid mapping', () => {
    const result = validateMapping({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
