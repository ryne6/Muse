import { useState } from 'react'
import { Power, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { ProviderLogo } from '~/components/ui/ProviderLogo'
import { dbClient } from '~/services/dbClient'
import { notify } from '~/utils/notify'
import { cn } from '~/utils/cn'

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

export function ProviderCard({
  provider,
  onUpdate,
  onConfigure,
  onManageModels,
}: ProviderCardProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleToggleEnabled = async () => {
    setIsToggling(true)
    try {
      await dbClient.providers.toggleEnabled(provider.id)
      notify.success(
        `${provider.name} ${provider.enabled ? 'disabled' : 'enabled'}`
      )
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
      data-testid="provider-card"
      className={cn(
        'group relative rounded-xl border p-4 transition-all',
        provider.enabled
          ? 'bg-background border-border hover:border-foreground/20'
          : 'bg-muted/40 text-muted-foreground border-muted'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 rounded-lg bg-muted/40 p-2">
            <ProviderLogo type={provider.type} size="md" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base capitalize truncate">
              {provider.name}
            </h3>
            <p className="text-xs opacity-70 mt-0.5">{provider.type}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            aria-label="Delete provider"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground font-mono truncate">
            {provider.baseURL || 'Default endpoint'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onConfigure(provider)}
          >
            Configure
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onManageModels(provider)}
          >
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
