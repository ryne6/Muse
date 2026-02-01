import { Folder } from 'lucide-react'
import { useConversationStore } from '@/stores/conversationStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export function WorkspaceDropdown() {
  const { currentConversationId, conversations, setWorkspace } = useConversationStore()
  const globalWorkspace = useWorkspaceStore((s) => s.workspacePath)

  // 计算当前对话的 workspace
  const currentConv = conversations.find((c) => c.id === currentConversationId)
  const effectiveWorkspace = currentConv?.workspace || globalWorkspace

  const handleSelectWorkspace = async () => {
    const path = await window.api.dialog.selectDirectory()
    if (path) {
      if (currentConversationId) {
        await setWorkspace(currentConversationId, path)
      } else {
        // 没有对话时更新全局 workspace
        await window.api.workspace.set(path)
        useWorkspaceStore.getState().loadWorkspace()
      }
    }
  }

  const handleClearWorkspace = async () => {
    if (!currentConversationId) return
    await setWorkspace(currentConversationId, null)
  }

  const displayName = effectiveWorkspace
    ? effectiveWorkspace.split('/').pop() || effectiveWorkspace
    : 'No workspace'

  return (
    <button
      onClick={handleSelectWorkspace}
      onContextMenu={(e) => {
        e.preventDefault()
        handleClearWorkspace()
      }}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-sm hover:bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] transition-colors"
      title={effectiveWorkspace || 'Click to select workspace, right-click to clear'}
    >
      <Folder className="w-4 h-4" />
      <span className="max-w-[120px] truncate">{displayName}</span>
    </button>
  )
}
