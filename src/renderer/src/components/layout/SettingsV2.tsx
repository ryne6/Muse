import { useState } from 'react'
import { Button } from '../ui/button'
import { Settings as SettingsIcon, X } from 'lucide-react'
import { ProviderList } from '../settings/ProviderList'
import { ProviderConfigDialog } from '../settings/ProviderConfigDialog'

interface Provider {
  id: string
  name: string
  type: string
  apiKey: string
  baseURL?: string
  enabled: boolean
}

type Tab = 'providers' | 'general'

export function SettingsV2() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('providers')
  const [configProvider, setConfigProvider] = useState<Provider | null>(null)
  const [showConfigDialog, setShowConfigDialog] = useState(false)

  const handleConfigureProvider = (provider: Provider) => {
    setConfigProvider(provider)
    setShowConfigDialog(true)
  }

  const handleCloseConfigDialog = () => {
    setShowConfigDialog(false)
    setConfigProvider(null)
  }

  if (!isOpen) {
    return (
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={() => setIsOpen(true)}>
          <SettingsIcon className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-lg w-full max-w-5xl mx-4 h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold">Settings</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r p-4 space-y-1">
              <button
                onClick={() => setActiveTab('providers')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'providers'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="font-medium">Providers</div>
                <div className="text-xs opacity-70">AI provider configurations</div>
              </button>

              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'general' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
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

              {activeTab === 'general' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">General Settings</h2>
                  <p className="text-muted-foreground">Coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
