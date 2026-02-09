import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'

const isAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-zustand': ['zustand']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    esbuild: {
      drop: ['console', 'debugger']
    },
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [
      react(),
      ...(isAnalyze
        ? [
            visualizer({
              filename: 'bundle-stats.html',
              open: true,
              gzipSize: true
            })
          ]
        : [])
    ]
  }
})
