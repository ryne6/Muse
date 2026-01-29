import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'

describe('theme tokens', () => {
  it('should expose orange accent tokens', async () => {
    const css = await fs.readFile('src/renderer/src/index.css', 'utf-8')
    expect(css).toContain('--accent: 24 95% 53%')
  })
})
