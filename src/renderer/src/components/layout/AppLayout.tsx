import type { CSSProperties } from 'react'
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

  const handleWidthChange = useCallback((_delta: NumberSize, width: number) => {
    setSidebarWidth(width)
  }, [])

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

  // Tahoe 上原生液态玻璃替代 CSS 毛玻璃
  const isTahoe = (window as any).electron?.isMacTahoe ?? false

  const sidebarGlassStyle: CSSProperties = isTahoe
    ? {
        borderRadius: 28,
        overflow: 'hidden',
      }
    : {
        borderRadius: 28,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        overflow: 'hidden',
      }

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden rounded-[28px] ${
        isTahoe ? 'bg-[var(--glass-layout)]' : 'bg-[hsl(var(--bg-layout))]'
      }`}
    >
      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden p-2 gap-3">
        <DraggableSideNav
          placement="left"
          defaultExpand={defaultExpandRef.current}
          defaultWidth={sidebarWidth}
          minWidth={64}
          maxWidth={400}
          expandable
          resizable
          showBorder={false}
          onExpandChange={handleExpandChange}
          onWidthChange={handleWidthChange}
          backgroundColor="transparent"
          styles={{
            content: sidebarGlassStyle,
          }}
          header={renderHeader}
          body={renderBody}
          footer={renderFooter}
        />
        <div
          className={`flex-1 flex flex-col min-w-0 rounded-[28px] overflow-hidden ${
            isTahoe
              ? 'bg-[var(--glass-main)]'
              : 'bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] shadow-[var(--card-shadow)]'
          }`}
        >
          <ChatView />
        </div>
      </div>
      <LoadingOverlay />
    </div>
  )
}
