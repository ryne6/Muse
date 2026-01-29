import { create } from 'zustand'

interface WorkspaceStore {
  workspacePath: string | null
  isSelecting: boolean
  loadWorkspace: () => Promise<void>
  selectWorkspace: () => Promise<void>
  clearWorkspace: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspacePath: null,
  isSelecting: false,
  loadWorkspace: async () => {
    if (!window.api?.workspace) return
    const result = await window.api.workspace.get()
    set({ workspacePath: result.path || null })
  },
  selectWorkspace: async () => {
    if (!window.api?.workspace) return
    set({ isSelecting: true })
    try {
      const result = await window.api.workspace.select()
      set({ workspacePath: result.path || null })
    } finally {
      set({ isSelecting: false })
    }
  },
  clearWorkspace: async () => {
    if (!window.api?.workspace) return
    await window.api.workspace.set('')
    set({ workspacePath: null })
  },
}))
