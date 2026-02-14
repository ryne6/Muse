import { useEffect, useState } from 'react'
import { dbClient } from '~/services/dbClient'
import { useConversationStore } from '~/stores/conversationStore'
import { useSettingsStore } from '~/stores/settingsStore'

export function MigrationHandler() {
  const [migrationStatus, setMigrationStatus] = useState<
    'idle' | 'checking' | 'migrating' | 'done'
  >('idle')
  const conversations = useConversationStore(state => state.conversations)
  const currentProviderId = useSettingsStore(state => state.currentProviderId)
  const providers = useSettingsStore(state => state.providers)

  useEffect(() => {
    checkAndMigrate()
  }, [])

  const checkAndMigrate = async () => {
    try {
      setMigrationStatus('checking')

      // Check if database has data
      const stats = await dbClient.migration.verify()

      // If database is empty but localStorage has data, migrate
      const hasLocalStorageData =
        conversations.length > 0 || providers.length > 0

      if (stats.conversations === 0 && hasLocalStorageData) {
        console.log('📦 Detected localStorage data, starting migration...')
        setMigrationStatus('migrating')

        // Prepare data for migration
        const migrationData = {
          conversations: conversations,
          settings: {
            currentProvider: currentProviderId,
            providers,
          },
        }

        // Run migration
        const result = await dbClient.migration.run(migrationData)

        if (result.success) {
          console.log('✅ Migration successful!')

          // Verify migration
          const verification = await dbClient.migration.verify()
          console.log('📊 Migration stats:', verification)

          setMigrationStatus('done')
        } else {
          console.error('❌ Migration failed:', result.error)
          setMigrationStatus('idle')
        }
      } else {
        console.log('ℹ️ No migration needed')
        setMigrationStatus('done')
      }
    } catch (error) {
      console.error('Migration check failed:', error)
      setMigrationStatus('idle')
    }
  }

  // Show migration UI if needed (optional)
  if (migrationStatus === 'migrating') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-semibold mb-4">Migrating Data</h2>
          <p className="text-muted-foreground mb-4">
            Upgrading your data to the new database format. This may take a
            moment...
          </p>
          <div className="flex items-center gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm">Please wait...</span>
          </div>
        </div>
      </div>
    )
  }

  return null
}
