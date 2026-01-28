import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config.mjs'

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'api',
      environment: 'node',
      include: ['src/api/**/*.test.ts']
    }
  })
)
