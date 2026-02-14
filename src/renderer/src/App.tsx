import { useEffect, useState } from 'react'
import { ThemeProvider, ToastHost } from '@lobehub/ui'
import { AppLayout } from './components/layout/AppLayout'
import { MigrationHandler } from './components/MigrationHandler'
import { UpdateNotification } from './components/UpdateNotification'
import { useConversationStore } from './stores/conversationStore'
import { useSettingsStore } from './stores/settingsStore'
import { dbClient } from './services/dbClient'

function App() {
  const loadConversations = useConversationStore(
    state => state.loadConversations
  )
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto')

  useEffect(() => {
    // Load conversations from database on app start
    loadConversations().then(async () => {
      // 加载上次打开的对话消息
      const currentId =
        useConversationStore.getState().currentConversationId
      if (currentId) {
        await useConversationStore.getState().loadConversation(currentId)
      }

      // 启动时清理孤立工作区
      try {
        const result = await window.api.workspace.cleanupOrphans()
        if (result.deletedCount > 0) {
          console.log(`Cleaned up ${result.deletedCount} orphaned workspace(s)`)
        }
        if (result.nonEmpty.length > 0) {
          console.warn('Non-empty orphaned workspaces:', result.nonEmpty)
        }
      } catch (error) {
        console.error('Failed to cleanup orphaned workspaces:', error)
      }
    })

    // Load theme preference
    dbClient.settings.get('theme').then(theme => {
      if (theme) setThemeMode(theme as 'light' | 'dark' | 'auto')
    })
  }, [loadConversations])

  // P1: Trigger memory extraction on window close (best-effort).
  // Note (I2): beforeunload is inherently unreliable — the renderer may be killed before
  // the IPC call completes. This is acceptable because the every-5-rounds trigger and
  // conversation-switch trigger provide the primary extraction coverage.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const memoryEnabled = useSettingsStore.getState().memoryEnabled
      if (!memoryEnabled) return

      const convStore = useConversationStore.getState()
      const conv = convStore.getCurrentConversation()
      if (!conv) return

      const userMsgCount = conv.messages.filter(m => m.role === 'user').length
      if (userMsgCount < 5) return

      const settings = useSettingsStore.getState()
      const pid = settings.currentProviderId
      const mid = settings.currentModelId
      if (!pid || !mid) return

      const recentMessages = conv.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : '',
        }))

      // Fire-and-forget via IPC (main process stays alive briefly after renderer closes)
      window.api.memory.extract({
        messages: recentMessages,
        providerId: pid,
        modelId: mid,
        workspacePath: convStore.getEffectiveWorkspace() || undefined,
        conversationId: conv.id,
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Listen for theme changes from settings
  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<'light' | 'dark' | 'auto'>) => {
      setThemeMode(e.detail)
    }
    window.addEventListener('theme-changed', handleThemeChange as EventListener)
    return () => {
      window.removeEventListener(
        'theme-changed',
        handleThemeChange as EventListener
      )
    }
  }, [])

  return (
    <ThemeProvider appearance={themeMode}>
      <MigrationHandler />
      <AppLayout />
      <ToastHost position="top-right" />
      <UpdateNotification />
    </ThemeProvider>
  )
}

export default App
