import { createHash, createSign } from 'crypto'

export interface Manifest {
  hash: string
  signature: string
}

export function signManifest(data: object, privateKey: string): Manifest {
  const payload = JSON.stringify(data)
  const hash = createHash('sha256').update(payload).digest('hex')
  const signer = createSign('RSA-SHA256')
  signer.update(hash)
  const signature = signer.sign(privateKey, 'base64')
  return { hash, signature }
}
