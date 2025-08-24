declare const Buffer: any;

export interface Manifest {
  data: string;
  signature: string;
  publicKey: string;
}

export function createManifest(data: string): Manifest {
  const key = Math.random().toString(36).slice(2);
  const signature = Buffer.from(data + key).toString('base64');
  return { data, signature, publicKey: key };
}

export function verifyManifest(manifest: Manifest): boolean {
  const expected = Buffer.from(manifest.data + manifest.publicKey).toString('base64');
  return expected === manifest.signature;
}
