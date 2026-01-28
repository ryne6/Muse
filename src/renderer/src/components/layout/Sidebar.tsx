import { SettingsV2 } from './SettingsV2'
import { WorkspaceSelector } from './WorkspaceSelector'
import { ConversationList } from './ConversationList'

export function Sidebar() {
  return (
    <div className="w-60 bg-background border-r flex flex-col">
      {/* Logo - 为 macOS 红绿灯按钮预留顶部空间 */}
      <div
        className="h-14 flex items-center px-4 border-b pt-7"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <h1 className="font-semibold text-lg">Muse</h1>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-hidden">
        <ConversationList />
      </div>

      {/* Workspace Selector */}
      <WorkspaceSelector />

      {/* Settings */}
      <SettingsV2 />
    </div>
  )
}
