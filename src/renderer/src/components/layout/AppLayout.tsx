import { Sidebar } from './Sidebar'
import { ChatView } from '../chat/ChatView'
import { FileExplorer } from '../explorer/FileExplorer'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { LoadingOverlay } from '@/components/ui/loading'

export function AppLayout() {
  const { workspacePath } = useWorkspaceStore()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Draggable title bar for macOS */}
      <div
        className="h-8 flex-shrink-0 bg-background"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ChatView />
        {workspacePath ? <FileExplorer /> : null}
      </div>
      <LoadingOverlay />
    </div>
  )
}
