import crypto from 'node:crypto';

export async function sendWithRetry(fn: () => Promise<void>, retries = 3, delay = 100): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((res) => setTimeout(res, delay));
    return sendWithRetry(fn, retries - 1, delay * 2);
  }
}

export interface Provider {
  send(target: string, payload: unknown): Promise<void>;
}

export class EmailProvider implements Provider {
  async send(_target: string, _payload: unknown): Promise<void> {
    return;
  }
}

export class SlackProvider implements Provider {
  async send(_target: string, _payload: unknown): Promise<void> {
    return;
  }
}

export class WebhookProvider implements Provider {
  constructor(private secret: string) {}

  sign(payload: string): string {
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  verify(payload: string, signature: string): boolean {
    return this.sign(payload) === signature;
  }

  async send(target: string, payload: unknown): Promise<void> {
    const body = JSON.stringify(payload);
    const signature = this.sign(body);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _msg = { target, body, signature };
    return;
  }
}
