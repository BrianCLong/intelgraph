import { BaseConnector, createEmitter, ConnectorContext } from '@intelgraph/connector-js';

class RestConnector extends BaseConnector {
  constructor(private url: string) { super(); }

  async run(ctx: ConnectorContext): Promise<void> {
    const res = await fetch(this.url);
    const data = await res.json();
    for (const item of data) {
      ctx.emit(item);
    }
  }
}

const connector = new RestConnector(process.argv[2]);
const emit = createEmitter(process.stdout);
connector.run({ emit });
