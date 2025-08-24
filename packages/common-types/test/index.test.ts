import { RawEntity } from '../src';

describe('types', () => {
  it('allows constructing RawEntity', () => {
    const r: RawEntity = {
      id: '1',
      tenantId: 't1',
      type: 'PERSON',
      names: ['Alice'],
      emails_hash: [],
      phones_hash: []
    };
    expect(r.names[0]).toBe('Alice');
  });
});
