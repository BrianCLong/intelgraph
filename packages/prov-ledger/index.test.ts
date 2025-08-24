import { describe, expect, it } from 'vitest'
import { createManifest } from './index'

describe('manifest', () => {
  it('creates a checksum', () => {
    const entry = createManifest(Buffer.from('hello'), 'tester', 'ingest')
    expect(entry.actor).toBe('tester')
    expect(entry.checksum).toHaveLength(64)
  })
})
