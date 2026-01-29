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
import { cn } from '@/utils/cn'

interface Provider {
  id: string
  name: string
  type: string
  apiKey: string
  enabled: boolean
  baseURL?: string
}

interface ProviderCardV2Props {
  provider: Provider
  onUpdate: () => void
  onConfigure: (provider: Provider) => void
  onManageModels: (provider: Provider) => void
}

export function ProviderCardV2({
  provider,
  onUpdate,
  onConfigure,
  onManageModels,
}: ProviderCardV2Props) {
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
      data-testid="provider-card-v2"
      className={cn(
        'group relative rounded-xl border p-4 transition-all',
        provider.enabled
          ? 'bg-background border-border hover:border-foreground/20'
          : 'bg-muted/40 text-muted-foreground border-muted'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted/40 p-2">
            <ProviderLogo type={provider.type} size="md" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base capitalize">{provider.name}</h3>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full border',
                  provider.enabled
                    ? 'border-primary/30 text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {provider.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs opacity-70 mt-0.5">{provider.type}</p>
          </div>
        </div>

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

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {provider.baseURL ? (
            <span className="font-mono">{provider.baseURL}</span>
          ) : (
            'Default endpoint'
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onConfigure(provider)}>
            Configure
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onManageModels(provider)}>
            Models
          </Button>
          <Button
            size="sm"
            variant={provider.enabled ? 'default' : 'outline'}
            onClick={handleToggleEnabled}
            disabled={isToggling}
          >
            <Power className="h-3 w-3 mr-1" />
            {provider.enabled ? 'On' : 'Off'}
          </Button>
        </div>
      </div>
    </div>
  )
}
