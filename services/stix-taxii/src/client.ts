import axios from 'axios';

export interface PullResult {
  collections: string[];
  itemsIngested: number;
  cursor?: string;
  items: any[];
}

export class StixTaxiiClient {
  private baseUrl: string;
  private collection: string;
  private token?: string;

  constructor(opts: { baseUrl: string; collection: string; token?: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.collection = opts.collection;
    this.token = opts.token;
  }

  /**
   * Pull STIX objects from TAXII collection, honoring cursor for incremental sync.
   */
  async pull(cursor?: string): Promise<PullResult> {
    const url = `${this.baseUrl}/taxii2/${this.collection}/objects`;
    const headers: Record<string, string> = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const params: Record<string, string> = {};
    if (cursor) params.added_after = cursor;
    const response = await axios.get(url, { headers, params });
    const items = response.data.objects || [];
    const next = response.headers['x-taxii-date-added-last'] || cursor;
    return {
      collections: [this.collection],
      itemsIngested: items.length,
      cursor: next,
      items
    };
  }
}
