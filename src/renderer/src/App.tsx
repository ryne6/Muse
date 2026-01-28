import { useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { Toaster } from 'sonner'
import { MigrationHandler } from './components/MigrationHandler'
import { useConversationStore } from './stores/conversationStoreV2'

function App() {
  const loadConversations = useConversationStore((state) => state.loadConversations)

  useEffect(() => {
    // Load conversations from database on app start
    loadConversations()
  }, [loadConversations])

  return (
    <>
      <MigrationHandler />
      <AppLayout />
      <Toaster position="top-right" richColors />
    </>
  )
}

export default App
