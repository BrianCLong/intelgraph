export interface ConnectorContext {
  emit: (record: unknown) => void;
}

export interface Connector {
  run(ctx: ConnectorContext): Promise<void>;
}

export class BaseConnector implements Connector {
  async run(_ctx: ConnectorContext): Promise<void> {
    /* override in subclass */
  }
}

export function createEmitter(stream: NodeJS.WritableStream) {
  return (record: unknown) => {
    stream.write(JSON.stringify(record) + '\n');
  };
}
