import { createHash } from 'crypto';

export interface ProvenanceStep {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  inputHash: string;
  outputHash: string;
  timestamp: string;
}

export interface ProvenanceManifest {
  artifactId: string;
  steps: ProvenanceStep[];
}

export function hashContent(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function hashJson(obj: unknown): string {
  return hashContent(JSON.stringify(obj));
}

export interface RecordStepOptions {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  input: string | Buffer;
  output: string | Buffer;
  timestamp?: string;
}

export function recordStep(manifest: ProvenanceManifest, opts: RecordStepOptions): ProvenanceStep {
  const step: ProvenanceStep = {
    id: opts.id,
    tool: opts.tool,
    params: opts.params,
    inputHash: hashContent(opts.input),
    outputHash: hashContent(opts.output),
    timestamp: opts.timestamp ?? new Date().toISOString(),
  };
  manifest.steps.push(step);
  return step;
}

export function verifyManifest(manifest: ProvenanceManifest, artifacts: Record<string, string | Buffer>): boolean {
  return manifest.steps.every((step) => {
    const data = artifacts[step.id];
    if (data === undefined) return false;
    return hashContent(data) === step.outputHash;
  });
}
