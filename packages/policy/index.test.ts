import { describe, expect, it } from 'vitest'
import { canViewExif } from './index'

describe('policy', () => {
  it('allows admin', () => {
    expect(canViewExif({ role: 'admin' })).toBe(true)
  })
  it('denies user', () => {
    expect(canViewExif({ role: 'user' })).toBe(false)
  })
})
