import { useEffect, useState } from 'react'
import { Modal } from '@lobehub/ui'
import { Button } from '../ui/button'
import { Settings as SettingsIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { ProviderList } from '../settings/ProviderList'
import { ProviderConfigDialog } from '../settings/ProviderConfigDialog'
import { MCPSettings } from '../settings/MCPSettings'
import { SkillsSettings } from '../settings/SkillsSettings'
import { PromptsSettings } from '../settings/PromptsSettings'
import { MemorySettings } from '../settings/MemorySettings'
import { dbClient } from '@/services/dbClient'
import { applyUIFont } from '@/services/fontService'

interface Provider {
  id: string
  name: string
  type: string
  apiKey: string
  baseURL?: string
  enabled: boolean
}

type Tab = 'providers' | 'mcp' | 'skills' | 'prompts' | 'memory' | 'general'

interface SettingsComponentProps {
  showText?: boolean
}

export function Settings({ showText = true }: SettingsComponentProps) {
  const isCollapsed = !showText
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('providers')
  const [configProvider, setConfigProvider] = useState<Provider | null>(null)
  const [showConfigDialog, setShowConfigDialog] = useState(false)

  // Load and apply saved UI font on mount
  useEffect(() => {
    let mounted = true
    const loadFont = async () => {
      try {
        const value = await dbClient.settings.get('uiFont')
        if (!mounted) return
        if (typeof value === 'string' && value) {
          applyUIFont(value)
        }
      } catch {
        // Ignore in environments without IPC (tests)
      }
    }
    loadFont()
    return () => {
      mounted = false
    }
  }, [])

  const handleConfigureProvider = (provider: Provider) => {
    setConfigProvider(provider)
    setShowConfigDialog(true)
  }

  const handleCloseConfigDialog = () => {
    setShowConfigDialog(false)
    setConfigProvider(null)
  }

  return (
    <>
      <div
        className={cn(
          'border-t',
          isCollapsed ? 'p-2 flex justify-center' : 'p-4'
        )}
      >
        <Button
          variant="ghost"
          className={cn(
            isCollapsed ? 'w-9 h-9 p-0 justify-center' : 'w-full justify-start'
          )}
          onClick={() => setIsOpen(true)}
        >
          <SettingsIcon className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="ml-2">Settings</span>}
        </Button>
      </div>

      <Modal
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        title="Settings"
        footer={null}
        width={1200}
        styles={{
          body: {
            padding: 0,
            height: '70vh',
            display: 'flex',
            overflow: 'hidden',
          },
        }}
      >
        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r p-4 space-y-1">
            <button
              onClick={() => setActiveTab('providers')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'providers'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <div className="font-medium">Providers</div>
              <div className="text-xs opacity-70">
                AI provider configurations
              </div>
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'mcp'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <div className="font-medium">MCP Servers</div>
              <div className="text-xs opacity-70">External tool servers</div>
            </button>

            <button
              onClick={() => setActiveTab('skills')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'skills'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <div className="font-medium">Skills</div>
              <div className="text-xs opacity-70">AI skill directories</div>
            </button>

            <button
              onClick={() => setActiveTab('prompts')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'prompts'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <div className="font-medium">Prompts</div>
              <div className="text-xs opacity-70">System prompt presets</div>
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'memory'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <div className="font-medium">Memory</div>
              <div className="text-xs opacity-70">
                Preferences and knowledge
              </div>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'general'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <div className="font-medium">General</div>
              <div className="text-xs opacity-70">App preferences</div>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'providers' && (
              <ProviderList onConfigureProvider={handleConfigureProvider} />
            )}

            {activeTab === 'mcp' && <MCPSettings />}

            {activeTab === 'skills' && <SkillsSettings />}

            {activeTab === 'prompts' && <PromptsSettings />}

            {activeTab === 'memory' && <MemorySettings />}

            {activeTab === 'general' && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  General Settings
                </h2>
                <p className="text-[hsl(var(--text-muted))]">
                  More settings coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Provider Config Dialog */}
      <ProviderConfigDialog
        provider={configProvider}
        open={showConfigDialog}
        onClose={handleCloseConfigDialog}
        onUpdated={() => {
          // Provider list will auto-refresh
        }}
      />
    </>
  )
}
