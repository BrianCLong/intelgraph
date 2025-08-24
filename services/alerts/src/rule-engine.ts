import { v4 as uuid } from 'uuid';
import { EmailProvider, Provider, SlackProvider, WebhookProvider, sendWithRetry } from './providers/index';
import { renderTemplate } from './templates';

export interface Action {
  type: 'email' | 'slack' | 'webhook';
  target: string;
  locale?: string;
}

export interface Rule {
  id: string;
  source: string;
  threshold?: number;
  actions: Action[];
  correlationKey: string;
  windowMs: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  correlationKey: string;
  status: 'open' | 'acknowledged' | 'resolved';
  reason?: string;
  createdAt: number;
}

export class RuleEngine {
  private rules = new Map<string, Rule>();
  private alerts = new Map<string, Alert>();
  private dedup = new Map<string, number>();
  private dlq: unknown[] = [];
  constructor(private now: () => number = () => Date.now()) {}

  addRule(rule: Omit<Rule, 'id'>): Rule {
    const id = uuid();
    const full: Rule = { ...rule, id };
    this.rules.set(id, full);
    return full;
  }

  listRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  evaluate(event: { source: string; value?: number; correlationKey: string; payload: Record<string, string> }): { processed: number } {
    const now = this.now();
    let processed = 0;
    for (const rule of this.rules.values()) {
      if (rule.source !== event.source) continue;
      if (rule.threshold !== undefined && (event.value ?? 0) < rule.threshold) continue;
      const key = event.correlationKey || rule.correlationKey;
      const last = this.dedup.get(key);
      if (last && now - last < rule.windowMs) continue;
      this.dedup.set(key, now);
      processed++;
      const alert: Alert = {
        id: uuid(),
        ruleId: rule.id,
        correlationKey: key,
        status: 'open',
        createdAt: now
      };
      this.alerts.set(alert.id, alert);
      for (const action of rule.actions) {
        const provider = this.getProvider(action.type);
        const message = renderTemplate(action.locale ?? 'en', 'default', event.payload);
        sendWithRetry(() => provider.send(action.target, message)).catch((err) => {
          this.dlq.push({ action, event, error: (err as Error).message });
        });
      }
    }
    return { processed };
  }

  ack(id: string, reason: string): Alert | undefined {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.status = 'acknowledged';
      alert.reason = reason;
    }
    return alert;
  }

  resolve(id: string, reason: string): Alert | undefined {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.status = 'resolved';
      alert.reason = reason;
    }
    return alert;
  }

  private getProvider(type: Action['type']): Provider {
    switch (type) {
      case 'email':
        return new EmailProvider();
      case 'slack':
        return new SlackProvider();
      case 'webhook':
        return new WebhookProvider('secret');
      default:
        return new EmailProvider();
    }
  }
}
