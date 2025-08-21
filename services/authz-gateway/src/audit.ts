import { appendFileSync } from 'fs';

export interface AuditEntry {
  subject: string;
  action: string;
  resource: string;
  tenantId: string;
  allowed: boolean;
  reason: string;
}

export function log(entry: AuditEntry) {
  const record = { ...entry, ts: new Date().toISOString() };
  appendFileSync('audit.log', JSON.stringify(record) + '\n');
}
