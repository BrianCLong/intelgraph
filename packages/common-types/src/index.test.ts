import { Investigation } from './index';

describe('types', () => {
  it('should allow creating an investigation object', () => {
    const inv: Investigation = {
      id: '1',
      title: 'Test',
      sensitivity: 'LOW',
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    expect(inv.title).toBe('Test');
  });
});
