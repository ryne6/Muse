import { useEffect, useState } from 'react'
import { Modal } from '@lobehub/ui'
import { Button } from '../ui/button'
import { Settings as SettingsIcon } from 'lucide-react'
import { ProviderList } from '../settings/ProviderList'
import { ProviderConfigDialog } from '../settings/ProviderConfigDialog'
import { dbClient } from '@/services/dbClient'
import { applyUIFont, getSystemFonts } from '@/services/fontService'

interface Provider {
  id: string
  name: string
  type: string
  apiKey: string
  baseURL?: string
  enabled: boolean
}

type Tab = 'providers' | 'general'

export function Settings() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('providers')
  const [configProvider, setConfigProvider] = useState<Provider | null>(null)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [fonts, setFonts] = useState<string[]>([])
  const [uiFont, setUiFont] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')

  useEffect(() => {
    let mounted = true
    getSystemFonts().then((fontList) => {
      if (mounted) {
        setFonts(fontList)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadFont = async () => {
      try {
        const value = await dbClient.settings.get('uiFont')
        if (!mounted) return
        if (typeof value === 'string' && value) {
          setUiFont(value)
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

  useEffect(() => {
    let mounted = true
    const loadTheme = async () => {
      try {
        const value = await dbClient.settings.get('theme')
        if (!mounted) return
        if (value && ['light', 'dark', 'auto'].includes(value as string)) {
          setTheme(value as 'light' | 'dark' | 'auto')
        }
      } catch {
        // Ignore in environments without IPC (tests)
      }
    }
    loadTheme()
    return () => {
      mounted = false
    }
  }, [])

  const handleFontChange = async (value: string) => {
    setUiFont(value)
    applyUIFont(value)
    try {
      await dbClient.settings.set('uiFont', value)
    } catch {
      // Ignore in environments without IPC (tests)
    }
  }

  const handleThemeChange = async (value: 'light' | 'dark' | 'auto') => {
    setTheme(value)
    try {
      await dbClient.settings.set('theme', value)
      // Dispatch custom event to notify App.tsx
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: value }))
    } catch {
      // Ignore in environments without IPC (tests)
    }
  }

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

              {activeTab === 'general' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">General Settings</h2>
                  <div className="space-y-2 max-w-md">
                    <label htmlFor="ui-font" className="text-sm font-medium">
                      UI Font
                    </label>
                    <input
                      id="ui-font"
                      list="system-fonts"
                      value={uiFont}
                      onChange={(e) => handleFontChange(e.target.value)}
                      placeholder="System UI"
                      className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border))]"
                    />
                    <datalist id="system-fonts">
                      {fonts.map((font) => (
                        <option key={font} value={font} />
                      ))}
                    </datalist>
                    <p className="text-xs text-[hsl(var(--text-muted))]">
                      Select any installed system font or type a custom name.
                    </p>
                  </div>

                  {/* Theme Setting */}
                  <div className="space-y-2 max-w-md mt-6">
                    <label className="text-sm font-medium">Theme</label>
                    <div className="flex gap-2">
                      {(['light', 'dark', 'auto'] as const).map((option) => (
                        <button
                          key={option}
                          onClick={() => handleThemeChange(option)}
                          className={`px-4 py-2 rounded-md border text-sm capitalize transition-colors ${
                            theme === option
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-[hsl(var(--border))] hover:bg-accent'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[hsl(var(--text-muted))]">
                      Choose light, dark, or auto (follows system preference).
                    </p>
                  </div>
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
