import { describe, it, expect } from 'vitest'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<html><body></body></html>')
const { window } = dom
// eslint-disable-next-line @typescript-eslint/no-var-requires
const $ = require('jquery')(window) as typeof import('jquery')

describe('jquery wiring', () => {
  it('binds event', () => {
    let msg = ''
    $(window.document).on('socket:forensics', (_e, m) => (msg = m))
    $(window.document).trigger('socket:forensics', 'done')
    expect(msg).toBe('done')
  })
})
