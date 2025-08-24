export interface QueryRequest {
  query: string;
  filters?: Record<string, any>;
  size?: number;
  seed?: number;
}

export interface SearchHit {
  id: string;
  score: number;
  source: Record<string, any>;
}

export interface QueryResponse {
  hits: SearchHit[];
  tookMs: number;
  explain?: Record<string, any>;
}

export class SearchClient {
  constructor(private baseUrl: string) {}

  async query(req: QueryRequest): Promise<QueryResponse> {
    const res = await fetch(`${this.baseUrl}/search/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`query failed: ${res.status}`);
    return res.json();
  }

  async index(label: string, action: 'start' | 'stop'): Promise<Record<string, string>> {
    const res = await fetch(`${this.baseUrl}/search/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, action }),
    });
    if (!res.ok) throw new Error(`index control failed: ${res.status}`);
    return res.json();
  }

  async schemas(): Promise<
    Array<{ name: string; mapping: Record<string, any>; vector_dims: number }>
  > {
    const res = await fetch(`${this.baseUrl}/search/schemas`);
    if (!res.ok) throw new Error(`schema fetch failed: ${res.status}`);
    return res.json();
  }
}
