import { useState } from 'react'
import { MoreVertical, Power, Settings, Trash2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProviderLogo } from '@/components/ui/ProviderLogo'
import { dbClient } from '@/services/dbClient'
import { notify } from '@/utils/notify'

interface Provider {
  id: string
  name: string
  type: string
  apiKey: string
  enabled: boolean
  baseURL?: string
}

interface ProviderCardProps {
  provider: Provider
  onUpdate: () => void
  onConfigure: (provider: Provider) => void
  onManageModels: (provider: Provider) => void
}

export function ProviderCard({ provider, onUpdate, onConfigure, onManageModels }: ProviderCardProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleToggleEnabled = async () => {
    setIsToggling(true)
    try {
      await dbClient.providers.toggleEnabled(provider.id)
      notify.success(`${provider.name} ${provider.enabled ? 'disabled' : 'enabled'}`)
      onUpdate()
    } catch (error) {
      console.error('Failed to toggle provider:', error)
      notify.error('Failed to update provider')
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${provider.name}?`)) return

    try {
      await dbClient.providers.delete(provider.id)
      notify.success(`${provider.name} deleted`)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete provider:', error)
      notify.error('Failed to delete provider')
    }
  }

  return (
    <div
      className={`relative rounded-lg border p-4 transition-all ${
        provider.enabled
          ? 'bg-background border-border hover:border-foreground/20'
          : 'bg-muted/50 text-muted-foreground border-muted'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <ProviderLogo type={provider.type} size="md" />
          <div>
            <h3 className="font-semibold text-base capitalize">{provider.name}</h3>
            <p className="text-xs opacity-70">{provider.type}</p>
          </div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Provider actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onConfigure(provider)}>
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageModels(provider)}>
              <Layers className="h-4 w-4 mr-2" />
              Manage Models
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleEnabled} disabled={isToggling}>
              <Power className="h-4 w-4 mr-2" />
              {provider.enabled ? 'Disable' : 'Enable'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Base URL (if custom) */}
      {provider.baseURL && (
        <div className="text-xs opacity-60">
          <span className="font-mono">{provider.baseURL}</span>
        </div>
      )}

      {/* Toggle - Bottom Right */}
      <div className="absolute bottom-4 right-4">
        <button
          onClick={handleToggleEnabled}
          disabled={isToggling}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            provider.enabled ? 'bg-[hsl(var(--accent))]' : 'bg-gray-300'
          }`}
          aria-label={provider.enabled ? 'Disable provider' : 'Enable provider'}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              provider.enabled ? 'left-5' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
