import { vi } from 'vitest'

/**
 * Mock Electron API
 */

export const mockElectronApp = {
  getPath: vi.fn((name: string) => {
    const paths: Record<string, string> = {
      userData: '/tmp/test-user-data',
      appData: '/tmp/test-app-data',
      temp: '/tmp',
      home: '/tmp/test-home'
    }
    return paths[name] || '/tmp'
  }),
  getVersion: vi.fn(() => '0.1.0-test'),
  getName: vi.fn(() => 'Crow Test'),
  quit: vi.fn(),
  exit: vi.fn()
}

export const mockElectronDialog = {
  showOpenDialog: vi.fn(async () => ({
    canceled: false,
    filePaths: ['/test/selected/path']
  })),
  showSaveDialog: vi.fn(async () => ({
    canceled: false,
    filePath: '/test/save/path'
  })),
  showMessageBox: vi.fn(async () => ({
    response: 0
  }))
}

export const mockElectronIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeHandler: vi.fn(),
  removeAllListeners: vi.fn()
}

export const mockElectronIpcRenderer = {
  invoke: vi.fn(async () => null),
  on: vi.fn(),
  once: vi.fn(),
  send: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn()
}

export const mockElectron = {
  app: mockElectronApp,
  dialog: mockElectronDialog,
  ipcMain: mockElectronIpcMain,
  ipcRenderer: mockElectronIpcRenderer
}

/**
 * Mock window.api (Renderer Process API)
 * 这是渲染进程中实际使用的 API 结构
 */
export const mockWindowApi = {
  workspace: {
    get: vi.fn(async () => ({
      path: '/test/workspace/path'
    })),
    select: vi.fn(async () => ({
      path: '/test/selected/workspace',
      canceled: false
    })),
    set: vi.fn(async () => ({ success: true }))
  },
  fs: {
    listFiles: vi.fn(async (path: string) => ({
      files: [
        { name: 'file1.ts', type: 'file', path: `${path}/file1.ts` },
        { name: 'folder1', type: 'directory', path: `${path}/folder1` },
        { name: 'file2.js', type: 'file', path: `${path}/file2.js` }
      ]
    }))
  },
  mcp: {
    getServerStates: vi.fn(async () => [])
  },
  skills: {
    getDirectories: vi.fn(async () => []),
    addDirectory: vi.fn(async () => ({ success: true })),
    removeDirectory: vi.fn(async () => ({ success: true })),
    toggleDirectory: vi.fn(async () => ({ success: true })),
    getAll: vi.fn(async () => []),
    getContent: vi.fn(async () => ''),
    getCount: vi.fn(async () => 0),
  },
  ipc: {
    invoke: vi.fn(async (channel: string, ...args: any[]) => {
      // 根据 channel 返回不同的 mock 数据
      if (channel === 'health-check') {
        return { status: 'ok', timestamp: Date.now() }
      }
      return null
    })
  }
}
