import crypto from 'crypto';

export interface Event {
  id: string;
  action: string;
  subject: Record<string, unknown>;
  prevHash?: string;
}

export function signEvent(event: Event, secret: string): string {
  const h = crypto.createHmac('sha256', secret);
  h.update(JSON.stringify({ ...event, ts: 0 }));
  return h.digest('hex');
}
