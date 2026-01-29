import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ProviderCard } from './ProviderCard'
import { AddProviderDialog } from './AddProviderDialog'
import { ManageModelsDialog } from './ManageModelsDialog'
import { dbClient } from '@/services/dbClient'
import { fadeInUpClass } from '@/utils/animations'

interface Provider {
  id: string
  name: string
  type: string
  apiKey: string
  enabled: boolean
  baseURL?: string
}

interface ProviderListProps {
  onConfigureProvider?: (provider: Provider) => void
}

export function ProviderList({ onConfigureProvider }: ProviderListProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false)

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setIsLoading(true)
    try {
      const data = await dbClient.providers.getAll()
      setProviders(data)
    } catch (error) {
      console.error('Failed to load providers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigure = (provider: Provider) => {
    onConfigureProvider?.(provider)
  }

  const handleManageModels = (provider: Provider) => {
    setSelectedProvider(provider)
    setIsManageModelsOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">AI Providers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your AI provider configurations
          </p>
        </div>
        <AddProviderDialog onProviderAdded={loadProviders} />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">{providers.length}</div>
          <div className="text-sm text-muted-foreground">Total Providers</div>
        </div>
        <div className="flex-1 rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">
            {providers.filter((p) => p.enabled).length}
          </div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
      </div>

      {/* Provider Cards */}
      {providers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No providers configured</p>
          <AddProviderDialog onProviderAdded={loadProviders} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider, index) => (
            <div
              key={provider.id}
              className={fadeInUpClass}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <ProviderCard
                provider={provider}
                onUpdate={loadProviders}
                onConfigure={handleConfigure}
                onManageModels={handleManageModels}
              />
            </div>
          ))}
        </div>
      )}

      {/* Manage Models Dialog */}
      {selectedProvider && (
        <ManageModelsDialog
          open={isManageModelsOpen}
          onOpenChange={setIsManageModelsOpen}
          providerId={selectedProvider.id}
          providerName={selectedProvider.name}
          onUpdate={loadProviders}
        />
      )}
    </div>
  )
}
