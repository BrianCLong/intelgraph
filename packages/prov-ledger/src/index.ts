import { pki, util } from 'node-forge';

export interface Manifest {
  subject: string;
  issuedAt: string;
  payloadHash: string;
}

export function signManifest(manifest: Manifest, privateKeyPem: string): string {
  const privateKey = pki.privateKeyFromPem(privateKeyPem);
  const md = util.createMessageDigest('sha256');
  md.update(JSON.stringify(manifest), 'utf8');
  const signature = privateKey.sign(md);
  return util.encode64(signature);
}
