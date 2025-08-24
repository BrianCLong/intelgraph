import { canView } from './index';

describe('policy', () => {
  it('allows owners', () => {
    expect(canView({ role: 'OWNER', sensitivity: 'HIGH' })).toBe(true);
  });
  it('denies viewer of high', () => {
    expect(canView({ role: 'VIEWER', sensitivity: 'HIGH' })).toBe(false);
  });
});
