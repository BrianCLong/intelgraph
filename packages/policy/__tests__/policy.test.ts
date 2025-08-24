import { evaluate } from '../src/index';

test('evaluate simple rule', () => {
  expect(evaluate([{ attribute: 'level', equals: '1' }], { role: 'user', attributes: { level: '1' } })).toBe(true);
});
