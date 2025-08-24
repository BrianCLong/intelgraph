import { canAccess } from '../src';

test('policy allows matching license', () => {
  expect(canAccess({ role: 'user', license: 'A' }, { license: 'A' })).toBe(true);
  expect(canAccess({ role: 'user', license: 'A' }, { license: 'B' })).toBe(false);
});
