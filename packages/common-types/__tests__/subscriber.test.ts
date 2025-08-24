import { subscriberSchema } from '../src/index';

describe('subscriberSchema', () => {
  it('includes required fields', () => {
    expect(subscriberSchema.required).toEqual(['id', 'msisdn']);
  });
});
