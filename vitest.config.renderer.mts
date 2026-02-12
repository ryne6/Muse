import { defineConfig, mergeConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import baseConfig from './vitest.config.mjs'

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: {
      name: 'renderer',
      environment: 'happy-dom',
      include: ['src/renderer/**/*.test.ts', 'src/renderer/**/*.test.tsx'],
      setupFiles: ['./tests/setup/vitest.setup.ts', './tests/setup/renderer.setup.ts'],
      server: {
        deps: {
          inline: ['@emoji-mart/data', '@emoji-mart/react', /^@lobehub\/ui/]
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer/src')
      }
    }
  })
)
