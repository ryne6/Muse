import { Sidebar } from './Sidebar'
import { ChatView } from '../chat/ChatView'
import { FileExplorer } from '../explorer/FileExplorer'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <ChatView />
      <FileExplorer />
    </div>
  )
}
