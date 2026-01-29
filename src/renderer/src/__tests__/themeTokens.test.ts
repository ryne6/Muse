import fs from 'node:fs/promises'

it('defines Lobe theme tokens', async () => {
  const css = await fs.readFile('src/renderer/src/index.css', 'utf-8')
  expect(css).toContain('--background: 0 0% 100%')
  expect(css).toContain('--bg-sidebar: 210 17% 98%')
  expect(css).toContain('--border: 0 0% 90%')
  expect(css).toContain('--text-muted: 0 0% 60%')
})
