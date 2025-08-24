import fs from 'fs';
import { BaseConnector, createEmitter, ConnectorContext } from '@intelgraph/connector-js';

class CsvConnector extends BaseConnector {
  constructor(private file: string) {
    super();
  }

  async run(ctx: ConnectorContext): Promise<void> {
    const lines = fs.readFileSync(this.file, 'utf-8').trim().split('\n');
    const headers = lines[0].split(',');
    for (const line of lines.slice(1)) {
      const cols = line.split(',');
      const record: Record<string, string> = {};
      headers.forEach((h, i) => (record[h] = cols[i]));
      ctx.emit({ type: 'Record', ...record });
    }
  }
}

const connector = new CsvConnector(process.argv[2]);
const emit = createEmitter(process.stdout);
connector.run({ emit });
