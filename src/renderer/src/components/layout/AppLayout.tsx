import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatView } from '../chat/ChatView'
import { LoadingOverlay } from '@/components/ui/loading'
import { dbClient } from '@/services/dbClient'
import { applyUIFont } from '@/services/fontService'

export function AppLayout() {
  useEffect(() => {
    const loadUIFont = async () => {
      try {
        const value = await dbClient.settings.get('uiFont')
        if (typeof value === 'string' && value) {
          applyUIFont(value)
        }
      } catch {
        // Ignore in environments without IPC (tests)
      }
    }
    loadUIFont()
  }, [])

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
