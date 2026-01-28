import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config.mjs'

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'main',
      environment: 'node',
      include: ['src/main/**/*.test.ts']
    }
  })
)
