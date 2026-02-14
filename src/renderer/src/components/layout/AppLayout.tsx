import { useEffect, useState, useCallback, useRef } from 'react'
import { DraggableSideNav } from '@lobehub/ui'
import type { NumberSize } from 're-resizable'
import { SidebarHeader } from './Sidebar'
import { ConversationList } from './ConversationList'
import { Settings } from './Settings'
import { ChatView } from '../chat/ChatView'
import { LoadingOverlay } from '~/components/ui/loading'
import { dbClient } from '~/services/dbClient'
import { applyUIFont } from '~/services/fontService'

/** Width threshold below which text is hidden and icon-only layout is used */
const SIDEBAR_TEXT_THRESHOLD = 140

export function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width')
    return saved ? Number(saved) : 280
  })
  const defaultExpandRef = useRef(
    localStorage.getItem('sidebar-collapsed') !== 'true'
  )

  useEffect(() => {
    localStorage.setItem('sidebar-width', String(sidebarWidth))
  }, [sidebarWidth])

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

  const handleWidthChange = useCallback(
    (_delta: NumberSize, width: number) => {
      setSidebarWidth(width)
    },
    []
  )

  const handleExpandChange = useCallback((expand: boolean) => {
    localStorage.setItem('sidebar-collapsed', String(!expand))
  }, [])

  const renderHeader = useCallback(
    (expand: boolean) => (
      <SidebarHeader
        showText={expand && sidebarWidth >= SIDEBAR_TEXT_THRESHOLD}
      />
    ),
    [sidebarWidth]
  )
  const renderBody = useCallback(
    (expand: boolean) => (
      <ConversationList
        showText={expand && sidebarWidth >= SIDEBAR_TEXT_THRESHOLD}
      />
    ),
    [sidebarWidth]
  )
  const renderFooter = useCallback(
    (expand: boolean) => (
      <Settings showText={expand && sidebarWidth >= SIDEBAR_TEXT_THRESHOLD} />
    ),
    [sidebarWidth]
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[hsl(var(--bg-sidebar))]">
      {/* Draggable title bar for macOS */}
      <div
        className="h-8 flex-shrink-0 bg-[hsl(var(--bg-sidebar))]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <DraggableSideNav
          placement="left"
          defaultExpand={defaultExpandRef.current}
          defaultWidth={sidebarWidth}
          minWidth={64}
          maxWidth={400}
          expandable
          resizable
          onExpandChange={handleExpandChange}
          onWidthChange={handleWidthChange}
          backgroundColor="hsl(var(--bg-sidebar))"
          header={renderHeader}
          body={renderBody}
          footer={renderFooter}
        />
        <ChatView />
      </div>
      <LoadingOverlay />
    </div>
  )
}
