import crypto from 'crypto';

export interface Artifact {
  id: string;
  sha256: string;
  url?: string;
}
export interface Manifest {
  version: string;
  createdAt: string;
  artifacts: Artifact[];
  merkleRoot: string;
  nodes: string[];
}

export function buildManifest(artifacts: Artifact[]): Manifest {
  if (!artifacts.length) throw new Error('no_artifacts');
  const leaves = artifacts.map(a => Buffer.from(a.sha256, 'hex'));
  const nodes: string[] = [];
  let level = leaves;
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      const h = crypto
        .createHash('sha256')
        .update(Buffer.concat([left, right]))
        .digest();
      nodes.push(h.toString('hex'));
      next.push(h);
    }
    level = next;
  }
  const merkleRoot = (level[0] || leaves[0]).toString('hex');
  return {
    version: '1.0',
    createdAt: new Date().toISOString(),
    artifacts,
    merkleRoot,
    nodes,
  };
}
