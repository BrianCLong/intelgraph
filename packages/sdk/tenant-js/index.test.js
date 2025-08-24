import * as sdk from './index.js';

describe('tenant-js sdk', () => {
  it('exports helpers', () => {
    expect(typeof sdk.createOrg).toBe('function');
    expect(typeof sdk.billingEvent).toBe('function');
  });
});
