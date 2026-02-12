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
    mockWindowApi.workspace.select.mockResolvedValue({
      path: '/test/workspace',
    })
    mockWindowApi.workspace.set.mockResolvedValue({ success: true })

    useWorkspaceStore.setState({ workspacePath: null })
  })

  it('should update workspacePath when selectWorkspace resolves', async () => {
    const store = useWorkspaceStore.getState()
    await store.selectWorkspace()
    expect(useWorkspaceStore.getState().workspacePath).toBe('/test/workspace')
  })

  it('should load workspace path', async () => {
    await useWorkspaceStore.getState().loadWorkspace()
    expect(useWorkspaceStore.getState().workspacePath).toBe('/test/workspace')
  })

  it('should clear workspace path', async () => {
    useWorkspaceStore.setState({ workspacePath: '/some/path' })
    await useWorkspaceStore.getState().clearWorkspace()
    expect(useWorkspaceStore.getState().workspacePath).toBeNull()
    expect(mockWindowApi.workspace.set).toHaveBeenCalledWith('')
  })

  it('should set isSelecting during selectWorkspace', async () => {
    let selectingDuringCall = false
    mockWindowApi.workspace.select.mockImplementation(async () => {
      selectingDuringCall = useWorkspaceStore.getState().isSelecting
      return { path: '/test' }
    })

    await useWorkspaceStore.getState().selectWorkspace()
    expect(selectingDuringCall).toBe(true)
    expect(useWorkspaceStore.getState().isSelecting).toBe(false)
  })

  describe('when window.api is not available', () => {
    beforeEach(() => {
      global.window.api = undefined as any
    })

    it('should not throw on loadWorkspace', async () => {
      await expect(
        useWorkspaceStore.getState().loadWorkspace()
      ).resolves.not.toThrow()
    })

    it('should not throw on selectWorkspace', async () => {
      await expect(
        useWorkspaceStore.getState().selectWorkspace()
      ).resolves.not.toThrow()
    })

    it('should not throw on clearWorkspace', async () => {
      await expect(
        useWorkspaceStore.getState().clearWorkspace()
      ).resolves.not.toThrow()
    })
  })
})
