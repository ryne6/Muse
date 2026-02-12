import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [
      './tests/setup/vitest.setup.ts',
      './tests/setup/renderer.setup.ts'
    ],
    environmentMatchGlobs: [['src/renderer/**', 'happy-dom']],
    server: {
      deps: {
        inline: [/^@lobehub\/ui/]
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'out/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'tests/',
        '**/__tests__/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'out', 'dist']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
      '@main': path.resolve(__dirname, './src/main'),
      '@renderer': path.resolve(__dirname, './src/renderer/src'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  }
})
