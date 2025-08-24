import { describe, expect, it } from 'vitest'
import { Evidence } from './index'

describe('Evidence schema', () => {
  it('parses valid data', () => {
    const data = Evidence.parse({
      id: '1',
      kind: 'IMAGE',
      sha256: 'abc',
      objectKey: 'foo'
    })
    expect(data.id).toBe('1')
  })
})
