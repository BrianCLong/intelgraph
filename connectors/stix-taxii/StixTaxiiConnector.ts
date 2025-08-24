import { BaseConnector, ConnectorConfig, IngestRecord } from '../../services/ingest/src/sdk/ConnectorSDK.js';
import { StixTaxiiClient } from '../../services/stix-taxii/src/client.js';

export class StixTaxiiConnector extends BaseConnector {
  private client: StixTaxiiClient;
  private cursor?: string;

  constructor(config: ConnectorConfig, client: StixTaxiiClient) {
    super(config);
    this.client = client;
  }

  async validate(): Promise<{ valid: boolean; errors?: string[] }> {
    return { valid: true };
  }

  async connect(): Promise<void> {
    /* no-op */
  }

  async disconnect(): Promise<void> {
    /* no-op */
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    await this.client.pull(this.cursor);
    return { success: true };
  }

  async *fetchData(): AsyncGenerator<IngestRecord[]> {
    const res = await this.client.pull(this.cursor);
    this.cursor = res.cursor;
    yield res.items.map((obj) => ({ id: obj.id, type: obj.type || 'stix', data: obj }));
  }
}
