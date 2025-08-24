export type Kind = 'ENTITY' | 'EDGE';

export interface SourceInfo {
  name: string;
  url?: string;
  license: string;
}

export interface ProvenanceStep {
  actor: string;
  tool: string;
  inputHash: string;
  outputHash: string;
  timestamp: string;
  parameters?: Record<string, unknown>;
}

export interface Envelope<T = unknown> {
  tenantId: string;
  source: SourceInfo;
  kind: Kind;
  type: string;
  payload: T;
  observedAt: string;
  hash: string;
  policyLabels?: Record<string, string>;
  provenance: { chain: ProvenanceStep[] };
  dedupeKey?: string;
}
