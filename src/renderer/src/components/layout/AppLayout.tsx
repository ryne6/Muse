import { useEffect, useState, useCallback, useRef } from 'react'
import { DraggableSideNav } from '@lobehub/ui'
import { SidebarHeader } from './Sidebar'
import { ConversationList } from './ConversationList'
import { Settings } from './Settings'
import { ChatView } from '../chat/ChatView'
import { LoadingOverlay } from '@/components/ui/loading'
import { dbClient } from '@/services/dbClient'
import { applyUIFont } from '@/services/fontService'

/** Width threshold below which text is hidden and icon-only layout is used */
const SIDEBAR_TEXT_THRESHOLD = 140
/** Delay before showing text on expand, so width animation has time to grow */
const EXPAND_TEXT_DELAY = 200

export function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width')
    return saved ? Number(saved) : 280
  })
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })
  // Track the live width during drag resize
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  // Delayed showText state for smooth expand animation
  const [expandShowText, setExpandShowText] = useState(!isCollapsed)
  const expandTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    localStorage.setItem('sidebar-width', String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

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

  // During drag: use live width to determine text visibility
  const dragShowText =
    liveWidth !== null ? liveWidth >= SIDEBAR_TEXT_THRESHOLD : null
  // Final showText: drag takes priority, then delayed expand state
  const showText = dragShowText ?? expandShowText

  const handleWidthDragging = useCallback((_delta: number, width: number) => {
    setLiveWidth(width)
  }, [])

  const handleWidthChange = useCallback((_delta: number, width: number) => {
    setLiveWidth(null)
    setSidebarWidth(width)
  }, [])

  const handleExpandChange = useCallback((expand: boolean) => {
    setLiveWidth(null)
    setIsCollapsed(!expand)
    clearTimeout(expandTimerRef.current)
    if (expand) {
      // Expanding: delay showing text so width animation has time to grow
      expandTimerRef.current = setTimeout(
        () => setExpandShowText(true),
        EXPAND_TEXT_DELAY
      )
    } else {
      // Collapsing: hide text immediately so it disappears before width shrinks
      setExpandShowText(false)
    }
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(expandTimerRef.current), [])

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
          defaultExpand={!isCollapsed}
          defaultWidth={sidebarWidth}
          minWidth={64}
          maxWidth={400}
          expandable
          resizable
          onExpandChange={handleExpandChange}
          onWidthChange={handleWidthChange}
          onWidthDragging={handleWidthDragging}
          backgroundColor="hsl(var(--bg-sidebar))"
          header={() => <SidebarHeader showText={showText} />}
          body={() => <ConversationList showText={showText} />}
          footer={() => <Settings showText={showText} />}
        />
        <ChatView />
      </div>
      <LoadingOverlay />
    </div>
  )
}
