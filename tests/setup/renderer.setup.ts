import { afterEach, vi } from 'vitest'
import { mockWindowApi } from '../mocks/electron'
import { mockDbClient } from '../mocks/db-client'

// Mock @lobehub/ui to avoid Node 22 ESM JSON import attribute errors.
// The real barrel re-exports EmojiPicker which transitively imports
// @emoji-mart/data (a .json main entry) without the required `type: "json"`
// attribute. Individual test files can override with their own vi.mock.
vi.mock('@lobehub/ui', async () => await import('../mocks/lobehub-ui'))

if (typeof globalThis.localStorage === 'undefined') {
  const storage = new Map<string, string>()
  const localStorageMock: Storage = {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => {
      storage.set(key, String(value))
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size
    }
  }
  globalThis.localStorage = localStorageMock
}

const hasDom =
  typeof globalThis.window !== 'undefined' && typeof globalThis.document !== 'undefined'

// 每个测试后清理 React 组件
if (hasDom) {
  let cleanupFn: (() => void) | undefined
  afterEach(async () => {
    if (!cleanupFn) {
      const mod = await import('@testing-library/react')
      cleanupFn = mod.cleanup
    }
    cleanupFn()
  })
}

if (hasDom) {
  // Mock window.api (Electron Renderer Process API)
  globalThis.window.api = mockWindowApi
  // jsdom/happy-dom doesn't provide matchMedia by default
  if (!globalThis.window.matchMedia) {
    globalThis.window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
  }

  const originalGetComputedStyle = globalThis.window.getComputedStyle?.bind(globalThis.window)
  globalThis.window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
    if (pseudoElt) {
      return { getPropertyValue: () => '' } as any
    }
    return originalGetComputedStyle
      ? originalGetComputedStyle(elt)
      : ({ getPropertyValue: () => '' } as any)
  }

  // Mock dbClient for UI components
  vi.mock('@renderer/services/dbClient', () => ({
    dbClient: mockDbClient
  }))
  vi.mock('@/services/dbClient', () => ({
    dbClient: mockDbClient
  }))
}
