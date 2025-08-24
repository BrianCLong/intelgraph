import { RuleEngine } from '../src/rule-engine';

describe('RuleEngine', () => {
  it('triggers actions for matching events', () => {
    const engine = new RuleEngine(() => 0);
    const rule = engine.addRule({
      source: 'alerts.anomaly.v1',
      actions: [{ type: 'email', target: 'a@example.com' }],
      correlationKey: 'id',
      windowMs: 1000
    });
    const result = engine.evaluate({
      source: 'alerts.anomaly.v1',
      correlationKey: '1',
      payload: { message: 'hi' }
    });
    expect(result.processed).toBe(1);
    expect(engine.listRules()).toHaveLength(1);
    const alert = engine.ack(rule.id, 'testing');
    expect(alert?.status).toBe('acknowledged');
  });

  it('deduplicates events within window', () => {
    let now = 0;
    const engine = new RuleEngine(() => now);
    engine.addRule({
      source: 'alerts.anomaly.v1',
      actions: [],
      correlationKey: 'id',
      windowMs: 1000
    });
    const event = { source: 'alerts.anomaly.v1', correlationKey: '1', payload: { message: 'hi' } };
    const first = engine.evaluate(event);
    const second = engine.evaluate(event);
    expect(first.processed).toBe(1);
    expect(second.processed).toBe(0);
    now = 2000;
    const third = engine.evaluate(event);
    expect(third.processed).toBe(1);
  });

  it('property test dedup window', () => {
    let time = 0;
    const engine = new RuleEngine(() => time);
    engine.addRule({
      source: 'alerts.anomaly.v1',
      actions: [],
      correlationKey: 'id',
      windowMs: 50
    });
    const event = { source: 'alerts.anomaly.v1', correlationKey: '1', payload: { message: 'p' } };
    for (let i = 0; i < 20; i++) {
      const step = Math.floor(Math.random() * 40);
      time += step;
      const r = engine.evaluate(event);
      if (step < 50) expect(r.processed).toBe(0);
      else expect(r.processed).toBe(1);
    }
  });
});
