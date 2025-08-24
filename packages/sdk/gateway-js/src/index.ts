import fetch from 'cross-fetch';
import { createHash } from 'crypto';

export interface GatewayClientOptions {
  url: string;
  queries: Record<string, string>;
  headers?: Record<string, string>;
}

export class GatewayClient {
  private url: string;
  private queries: Record<string, string>;
  private headers: Record<string, string>;

  constructor(options: GatewayClientOptions) {
    this.url = options.url;
    this.queries = options.queries;
    this.headers = options.headers || {};
  }

  async query<T>(name: string, variables?: Record<string, any>): Promise<T> {
    const query = this.queries[name];
    if (!query) {
      throw new Error(`Unknown query: ${name}`);
    }
    const hash = createHash('sha256').update(query).digest('hex');
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...this.headers },
      body: JSON.stringify({
        query,
        variables,
        extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
      }),
    });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    const json = await res.json();
    if (json.errors) {
      throw new Error(JSON.stringify(json.errors));
    }
    return json.data as T;
  }
}
