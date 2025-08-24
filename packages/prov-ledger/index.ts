import { createHash } from 'node:crypto'

export interface ManifestEntry {
  actor: string
  action: string
  ts: string
  checksum: string
}

export function createManifest(data: Buffer, actor: string, action: string): ManifestEntry {
  const checksum = createHash('sha256').update(data).digest('hex')
  return { actor, action, ts: new Date().toISOString(), checksum }
}
