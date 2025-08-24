const { diffSchemas, planMigration } = require('./index');

test('diff detects added field', () => {
  const oldSchema = { User: { properties: { name: 'string' } } };
  const newSchema = { User: { properties: { name: 'string', age: 'number' } } };
  const diff = diffSchemas(oldSchema, newSchema);
  expect(diff).toEqual([
    { type: 'add', path: 'User.properties.age', value: 'number' }
  ]);
});

test('planMigration creates steps with risks', () => {
  const oldSchema = { A: {} };
  const newSchema = { A: {}, B: {} };
  const plan = planMigration(oldSchema, newSchema);
  expect(plan).toEqual([
    { action: 'add', target: 'B', risk: 'low' }
  ]);
});
