import { Settings } from './Settings'
import { ConversationList } from './ConversationList'
import logoImage from '@/assets/providers/logo.png'

export function Sidebar() {
  return (
    <div className="w-[280px] bg-[hsl(var(--bg-sidebar))] border-r border-[hsl(var(--border))] flex flex-col">
      {/* Brand */}
      <div className="h-12 flex items-center px-4 text-[17px] font-semibold text-foreground">
        <img src={logoImage} alt="Muse" className="w-6 h-6 mr-2 rounded" />
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
