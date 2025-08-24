import { createHash } from 'node:crypto'

export interface ManifestEntry {
  path: string
  sha256: string
}

export function generate(entries: { path: string; content: string }[]): ManifestEntry[] {
  return entries.map(e => ({ path: e.path, sha256: hash(e.content) }))
}

export function verify(entries: ManifestEntry[], files: { path: string; content: string }[]): boolean {
  return entries.every(e => {
    const file = files.find(f => f.path === e.path)
    return file && hash(file.content) === e.sha256
  })
}

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}
