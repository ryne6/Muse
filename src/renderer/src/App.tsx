import { useEffect, useState } from 'react'
import { ThemeProvider, ToastHost } from '@lobehub/ui'
import { AppLayout } from './components/layout/AppLayout'
import { MigrationHandler } from './components/MigrationHandler'
import { UpdateNotification } from './components/UpdateNotification'
import { useConversationStore } from './stores/conversationStore'
import { dbClient } from './services/dbClient'

function App() {
  const loadConversations = useConversationStore((state) => state.loadConversations)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto')

  useEffect(() => {
    // Load conversations from database on app start
    loadConversations().then(async () => {
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
    dbClient.settings.get('theme').then((theme) => {
      if (theme) setThemeMode(theme as 'light' | 'dark' | 'auto')
    })
  }, [loadConversations])

  // Listen for theme changes from settings
  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<'light' | 'dark' | 'auto'>) => {
      setThemeMode(e.detail)
    }
    window.addEventListener('theme-changed', handleThemeChange as EventListener)
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange as EventListener)
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
