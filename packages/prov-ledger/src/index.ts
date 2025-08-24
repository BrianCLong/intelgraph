import { createHash } from 'crypto';

export interface LedgerEntry {
  action: string;
  actorId: string;
  ts: string;
  checksum: string;
}

export function createLedger(entries: LedgerEntry[]): string {
  const hash = createHash('sha256');
  for (const e of entries) {
    hash.update(JSON.stringify(e));
  }
  return hash.digest('hex');
}
