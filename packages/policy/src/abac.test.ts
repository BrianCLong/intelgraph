import { evaluate, Rule } from './abac';

describe('ABAC evaluate', () => {
  test('grants when subject and resource match', () => {
    const rules: Rule[] = [
      {
        subject: { role: 'admin' },
        resource: { tenantId: 't1' },
        action: 'read',
      },
    ];
    const allowed = evaluate(rules, {
      subject: { role: 'admin' },
      resource: { tenantId: 't1' },
      action: 'read',
    });
    expect(allowed).toBe(true);
  });
});
