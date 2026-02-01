import { useEffect, useState } from 'react'
import { Modal } from '@lobehub/ui'
import { Button } from '../ui/button'
import { Settings as SettingsIcon } from 'lucide-react'
import { ProviderList } from '../settings/ProviderList'
import { ProviderConfigDialog } from '../settings/ProviderConfigDialog'
import { MCPSettings } from '../settings/MCPSettings'
import { SkillsSettings } from '../settings/SkillsSettings'
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

type Tab = 'providers' | 'mcp' | 'skills' | 'general'

export function Settings() {
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
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={() => setIsOpen(true)}>
          <SettingsIcon className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      <Modal
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        title="Settings"
        footer={null}
        width={1200}
        styles={{
          body: { padding: 0, height: '70vh', display: 'flex', overflow: 'hidden' }
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
                <div className="text-xs opacity-70">AI provider configurations</div>
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
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'general' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'
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

              {activeTab === 'mcp' && (
                <MCPSettings />
              )}

              {activeTab === 'skills' && (
                <SkillsSettings />
              )}

              {activeTab === 'general' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">General Settings</h2>
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
