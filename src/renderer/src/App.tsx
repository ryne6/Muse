import { useEffect, useState } from 'react'
import { ThemeProvider } from '@lobehub/ui'
import { AppLayout } from './components/layout/AppLayout'
import { Toaster } from 'sonner'
import { MigrationHandler } from './components/MigrationHandler'
import { useConversationStore } from './stores/conversationStore'
import { dbClient } from './services/dbClient'

function App() {
  const loadConversations = useConversationStore((state) => state.loadConversations)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto')

  useEffect(() => {
    // Load conversations from database on app start
    loadConversations()

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
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  )
}

export default App
