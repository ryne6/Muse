import { Sidebar } from './Sidebar'
import { ChatView } from '../chat/ChatView'
import { LoadingOverlay } from '@/components/ui/loading'

export function AppLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[hsl(var(--bg-main))]">
      {/* Draggable title bar for macOS */}
      <div
        className="h-8 flex-shrink-0 bg-[hsl(var(--bg-main))]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ChatView />
      </div>
      <LoadingOverlay />
    </div>
  )
}
