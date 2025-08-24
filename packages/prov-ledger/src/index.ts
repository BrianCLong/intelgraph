import crypto from 'crypto';

export function signManifest(manifest: object, privateKey: string): string {
  const data = JSON.stringify(manifest);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  return signer.sign(privateKey, 'base64');
}
