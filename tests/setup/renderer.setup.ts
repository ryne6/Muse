import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { mockWindowApi } from '../mocks/electron'
import { mockDbClient } from '../mocks/db-client'

// 每个测试后清理 React 组件
afterEach(() => {
  cleanup()
})

// Mock window.api (Electron Renderer Process API)
global.window = global.window || ({} as any)
global.window.api = mockWindowApi

// Mock dbClient for UI components
vi.mock('@renderer/services/dbClient', () => ({
  dbClient: mockDbClient
}))
