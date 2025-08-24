import { createHash } from 'crypto';

export interface EvidenceItem {
  id: string;
  uri: string;
  content: string;
  license: string;
}

export interface TransformStep {
  id: string;
  description: string;
  inputHash: string;
  outputHash: string;
  timestamp: string; // ISO date
}

export interface ProvenanceManifest {
  items: Array<EvidenceItem & { checksum: string }>;
  transforms: TransformStep[];
}

export interface VerificationReport {
  valid: boolean;
  invalidItems: string[];
  invalidTransforms: string[];
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function createManifest(
  items: EvidenceItem[],
  transforms: TransformStep[]
): ProvenanceManifest {
  const itemsWithChecksums = items.map((i) => ({ ...i, checksum: sha256(i.content) }));
  return { items: itemsWithChecksums, transforms };
}

export function verifyManifest(manifest: ProvenanceManifest): VerificationReport {
  const invalidItems = manifest.items
    .filter((i) => sha256(i.content) !== i.checksum)
    .map((i) => i.id);
  const invalidTransforms = manifest.transforms.filter((t) => !t.outputHash).map((t) => t.id);
  return {
    valid: invalidItems.length === 0 && invalidTransforms.length === 0,
    invalidItems,
    invalidTransforms,
  };
}
