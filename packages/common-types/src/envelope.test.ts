import schema from '../schemas/envelope.schema.json';

describe('envelope schema', () => {
  test('requires tenantId', () => {
    expect(schema.required).toContain('tenantId');
  });
});
