import { randomUUID, createHash, generateKeyPairSync, sign, verify } from 'crypto';

export interface Evidence {
  id: string;
  contentHash: string;
  licenseId: string;
  source: string;
  transforms: string[];
}

export interface Claim {
  id: string;
  evidenceIds: string[];
  text: string;
  confidence: number;
  links: string[];
  hash: string;
  signature: string;
  publicKey: string;
}

const evidenceStore = new Map<string, Evidence>();
const claimStore = new Map<string, Claim>();

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

export function registerEvidence(input: Omit<Evidence, 'id'>): Evidence {
  const id = randomUUID();
  const evid: Evidence = { id, ...input };
  evidenceStore.set(id, evid);
  return evid;
}

export function createClaim(input: Omit<Claim, 'id' | 'hash' | 'signature' | 'publicKey'>): Claim {
  const id = randomUUID();
  const hash = createHash('sha256').update(input.text).digest('hex');
  const sig = sign(null, Buffer.from(hash, 'hex'), privateKey).toString('base64');
  const claim: Claim = {
    id,
    ...input,
    hash,
    signature: sig,
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
  };
  claimStore.set(id, claim);
  return claim;
}

export function getClaim(id: string): Claim | undefined {
  return claimStore.get(id);
}

export function getEvidence(id: string): Evidence | undefined {
  return evidenceStore.get(id);
}

export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  let nodes: Buffer[] = hashes.map((h) => Buffer.from(h, 'hex')) as Buffer[];
  while (nodes.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 < nodes.length) {
        next.push(createHash('sha256').update(Buffer.concat([nodes[i], nodes[i + 1]])).digest());
      } else {
        next.push(nodes[i]);
      }
    }
    nodes = next;
  }
  return nodes[0].toString('hex');
}

export interface ManifestClaim {
  id: string;
  text: string;
  hash: string;
  signature: string;
  publicKey: string;
}

export interface Manifest {
  merkleRoot: string;
  licenses: string[];
  claims: ManifestClaim[];
}

export function buildManifest(claimIds: string[]): Manifest {
  const claims: ManifestClaim[] = [];
  const licenses = new Set<string>();
  const hashes: string[] = [];
  for (const cid of claimIds) {
    const claim = claimStore.get(cid);
    if (!claim) continue;
    hashes.push(claim.hash);
    claims.push({
      id: claim.id,
      text: claim.text,
      hash: claim.hash,
      signature: claim.signature,
      publicKey: claim.publicKey,
    });
    for (const evidId of claim.evidenceIds) {
      const evid = evidenceStore.get(evidId);
      if (evid) licenses.add(evid.licenseId);
    }
  }
  return { merkleRoot: merkleRoot(hashes), licenses: Array.from(licenses), claims };
}

export interface LicenseCheck {
  valid: boolean;
  reason?: string;
  appealCode?: string;
}

const incompatibleLicenses = new Map<string, { reason: string; appealCode: string }>([
  ['GPL-3.0', { reason: 'GPL-3.0 license is incompatible with export policy', appealCode: 'LIC001' }],
]);

export function checkLicenses(licenses: string[]): LicenseCheck {
  for (const lic of licenses) {
    const info = incompatibleLicenses.get(lic);
    if (info) {
      return { valid: false, ...info };
    }
  }
  return { valid: true };
}

export function verifyClaim(manifestClaim: ManifestClaim): boolean {
  const hash = createHash('sha256').update(manifestClaim.text).digest('hex');
  if (hash !== manifestClaim.hash) return false;
  return verify(
    null,
    Buffer.from(hash, 'hex'),
    {
      key: Buffer.from(manifestClaim.publicKey, 'base64'),
      format: 'der',
      type: 'spki',
    },
    Buffer.from(manifestClaim.signature, 'base64')
  );
}
