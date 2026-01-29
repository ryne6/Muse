import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore } from '../workspaceStore'

const mockWindowApi = vi.hoisted(() => ({
  workspace: {
    get: vi.fn(),
    select: vi.fn(),
    set: vi.fn(),
  },
}))

describe('workspaceStore', () => {
  beforeEach(() => {
    global.window = global.window || ({} as any)
    global.window.api = mockWindowApi as any

    mockWindowApi.workspace.get.mockResolvedValue({ path: '/test/workspace' })
    mockWindowApi.workspace.select.mockResolvedValue({ path: '/test/workspace' })
    mockWindowApi.workspace.set.mockResolvedValue({ success: true })

    useWorkspaceStore.setState({ workspacePath: null })
  })

  it('should update workspacePath when selectWorkspace resolves', async () => {
    const store = useWorkspaceStore.getState()
    await store.selectWorkspace()
    expect(useWorkspaceStore.getState().workspacePath).toBe('/test/workspace')
  })
})
