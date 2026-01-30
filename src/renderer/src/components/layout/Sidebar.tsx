import { Settings } from './Settings'
import { ConversationList } from './ConversationList'

export function Sidebar() {
  return (
    <div className="w-[280px] bg-[hsl(var(--bg-sidebar))] border-r border-[hsl(var(--border))] flex flex-col">
      {/* Brand */}
      <div className="h-12 flex items-center px-4 text-[17px] font-semibold text-foreground">
        <span className="mr-2 text-lg">🤯</span>
        Muse
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-hidden">
        <ConversationList />
      </div>

      {/* Settings */}
      <Settings />
    </div>
  )
}
