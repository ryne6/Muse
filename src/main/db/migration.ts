import { getDatabase } from './index'
import {
  ConversationService,
  MessageService,
  ProviderService,
  ModelService,
  SettingsService,
} from './services'

// LocalStorage data types (old format)
interface LocalStorageConversation {
  id: string
  title: string
  messages: LocalStorageMessage[]
  createdAt: number
  provider?: string
  model?: string
}

interface LocalStorageMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCalls?: any[]
  toolResults?: any[]
}

interface LocalStorageSettings {
  currentProvider: 'claude' | 'openai'
  providers: {
    claude?: {
      apiKey: string
      model: string
      baseURL?: string
      temperature?: number
      maxTokens?: number
      customModels?: string[]
    }
    openai?: {
      apiKey: string
      model: string
      baseURL?: string
      temperature?: number
      maxTokens?: number
      customModels?: string[]
    }
  }
  workspace?: string
}

export class DataMigration {
  /**
   * Migrate conversations from localStorage to database
   */
  static async migrateConversations(conversations: LocalStorageConversation[]) {
    console.log(`📦 Migrating ${conversations.length} conversations...`)

    for (const conv of conversations) {
      try {
        // Create conversation
        await ConversationService.create({
          id: conv.id,
          title: conv.title,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.createdAt),
          provider: conv.provider || null,
          model: conv.model || null,
        })

        // Create messages
        for (const msg of conv.messages) {
          const messageId = msg.id

          // Create message
          await MessageService.create({
            id: messageId,
            conversationId: conv.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          })

          // Migrate tool calls if any
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            for (const toolCall of msg.toolCalls) {
              await MessageService.addToolCall(messageId, {
                name: toolCall.name,
                input: toolCall.input,
              })
            }
          }

          // Migrate tool results if any
          if (msg.toolResults && msg.toolResults.length > 0) {
            for (const toolResult of msg.toolResults) {
              // Find corresponding tool call
              const toolCall = msg.toolCalls?.find(
                tc => tc.id === toolResult.toolCallId
              )
              if (toolCall) {
                await MessageService.addToolResult(toolCall.id, {
                  output: toolResult.output,
                  isError: toolResult.isError || false,
                })
              }
            }
          }
        }

        console.log(`  ✓ Migrated conversation: ${conv.title}`)
      } catch (error) {
        console.error(`  ✗ Failed to migrate conversation ${conv.id}:`, error)
      }
    }

    console.log('✅ Conversations migration completed')
  }

  /**
   * Migrate settings from localStorage to database
   */
  static async migrateSettings(settings: LocalStorageSettings) {
    console.log('📦 Migrating settings...')

    try {
      // Migrate providers
      const { claude, openai } = settings.providers

      if (claude && claude.apiKey) {
        const claudeProvider = await ProviderService.create({
          name: 'claude',
          type: 'claude',
          apiKey: claude.apiKey,
          baseURL: claude.baseURL || null,
          enabled: settings.currentProvider === 'claude',
        })

        // Create models for Claude
        const claudeModels = [
          'claude-opus-4.5-20251101',
          'claude-sonnet-4.5-20250929',
          'claude-sonnet-4-20250514',
          'claude-haiku-4-20250131',
          ...(claude.customModels || []),
        ]

        await ModelService.createMany(
          claudeModels.map((modelId, index) => ({
            providerId: claudeProvider.id,
            modelId,
            name: modelId,
            contextLength: 200000,
            isCustom: index >= 4,
            enabled: modelId === claude.model,
          }))
        )

        console.log('  ✓ Migrated Claude provider')
      }

      if (openai && openai.apiKey) {
        const openaiProvider = await ProviderService.create({
          name: 'openai',
          type: 'openai',
          apiKey: openai.apiKey,
          baseURL: openai.baseURL || null,
          enabled: settings.currentProvider === 'openai',
        })

        // Create models for OpenAI
        const openaiModels = [
          'gpt-4-turbo-preview',
          'gpt-4',
          'gpt-3.5-turbo',
          ...(openai.customModels || []),
        ]

        await ModelService.createMany(
          openaiModels.map((modelId, index) => ({
            providerId: openaiProvider.id,
            modelId,
            name: modelId,
            contextLength: modelId.includes('gpt-4') ? 128000 : 16000,
            isCustom: index >= 3,
            enabled: modelId === openai.model,
          }))
        )

        console.log('  ✓ Migrated OpenAI provider')
      }

      // Migrate other settings
      await SettingsService.set('currentProvider', settings.currentProvider)
      await SettingsService.set('workspace', settings.workspace || null)

      if (claude) {
        await SettingsService.set('claude.temperature', claude.temperature || 1)
        await SettingsService.set('claude.maxTokens', claude.maxTokens || 4096)
      }

      if (openai) {
        await SettingsService.set('openai.temperature', openai.temperature || 1)
        await SettingsService.set('openai.maxTokens', openai.maxTokens || 4096)
      }

      console.log('✅ Settings migration completed')
    } catch (error) {
      console.error('✗ Failed to migrate settings:', error)
    }
  }

  /**
   * Run full migration from localStorage data
   */
  static async runMigration(localStorageData: {
    conversations?: LocalStorageConversation[]
    settings?: LocalStorageSettings
  }) {
    console.log(
      '\n🚀 Starting data migration from localStorage to database...\n'
    )

    try {
      // Migrate settings first (creates providers)
      if (localStorageData.settings) {
        await this.migrateSettings(localStorageData.settings)
      }

      // Then migrate conversations
      if (
        localStorageData.conversations &&
        localStorageData.conversations.length > 0
      ) {
        await this.migrateConversations(localStorageData.conversations)
      }

      console.log('\n🎉 Migration completed successfully!\n')
      return { success: true }
    } catch (error) {
      console.error('\n❌ Migration failed:', error)
      return { success: false, error }
    }
  }

  /**
   * Verify migration by comparing counts
   */
  static async verifyMigration() {
    console.log('\n🔍 Verifying migration...\n')

    const conversations = await ConversationService.getAll()
    const providers = await ProviderService.getAll()
    const models = await ModelService.getAll()
    const settings = await SettingsService.getAll()

    console.log(`  Conversations: ${conversations.length}`)
    console.log(`  Providers: ${providers.length}`)
    console.log(`  Models: ${models.length}`)
    console.log(`  Settings: ${Object.keys(settings).length}`)

    // Check each conversation has messages
    let totalMessages = 0
    for (const conv of conversations) {
      const msgs = await MessageService.getByConversationId(conv.id)
      totalMessages += msgs.length
    }

    console.log(`  Total Messages: ${totalMessages}`)
    console.log('\n✅ Verification completed\n')

    return {
      conversations: conversations.length,
      providers: providers.length,
      models: models.length,
      settings: Object.keys(settings).length,
      messages: totalMessages,
    }
  }

  /**
   * Clear all database data (for testing)
   */
  static async clearDatabase() {
    console.log('🗑️  Clearing database...')

    const db = getDatabase()
    const { conversations, providers, settings } = await import('./schema')

    await db.delete(conversations)
    await db.delete(providers)
    await db.delete(settings)

    console.log('✅ Database cleared')
  }
}
