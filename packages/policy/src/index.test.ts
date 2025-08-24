import { isAllowed, PolicyRule } from './index';

describe('isAllowed', () => {
  it('allows matching rule', () => {
    const rules: PolicyRule[] = [{ subject: 'user', action: 'read', resource: 'slo' }];
    expect(isAllowed(rules, 'read', 'slo', 'user')).toBe(true);
  });
  it('denies non matching rule', () => {
    const rules: PolicyRule[] = [];
    expect(isAllowed(rules, 'write', 'slo', 'user')).toBe(false);
  });
});
