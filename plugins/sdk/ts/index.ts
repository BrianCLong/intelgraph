export interface PanelDefinition {
  id: string;
  name: string;
  component: unknown;
}

export interface GraphClient {
  query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

export function createGraphClient(apiUrl: string): GraphClient {
  return {
    async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      return res.json() as Promise<T>;
    },
  };
}

export function registerPanel(panel: PanelDefinition): void {
  // In the real runtime this would register the panel with the host application.
  console.debug(`registering panel ${panel.id}`);
}

export function emitTelemetry(event: string, data: Record<string, unknown>): void {
  console.debug(`telemetry:${event}`, data);
}
