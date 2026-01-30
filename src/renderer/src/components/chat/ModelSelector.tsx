import { useEffect } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import type { Model } from '@shared/types/db'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function ModelSelector() {
  const {
    getCurrentProvider,
    getCurrentModel,
    getEnabledModels,
    setCurrentModel,
    providers,
    models,
    loadData,
    lastUpdated,
  } = useSettingsStore()

  const currentProvider = getCurrentProvider()
  const currentModel = getCurrentModel()
  const enabledModels = getEnabledModels()

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData, lastUpdated])

  const handleModelSelect = (modelId: string) => {
    setCurrentModel(modelId)
  }

  // Group models by provider
  const modelsByProvider = enabledModels.reduce(
    (acc, model) => {
      const provider = providers.find((p) => p.id === model.providerId)
      if (!provider) return acc

      if (!acc[provider.name]) {
        acc[provider.name] = []
      }
      acc[provider.name].push(model)
      return acc
    },
    {} as Record<string, Model[]>
  )

  const getCurrentModelDisplay = () => {
    if (!currentModel) return 'Select Model'

    // Shorten model name for display
    const shortName = currentModel.name
      .replace('claude-', '')
      .replace('gpt-', '')
      .replace('gemini-', '')
      .replace('deepseek-', '')
      .replace('-preview', '')
      .replace('-turbo', '')

    return shortName
  }

  // Show prompt to add provider if none exist
  if (providers.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <span className="text-xs text-muted-foreground">No providers - Add in Settings</span>
      </Button>
    )
  }

  // Show prompt if no models available
  if (enabledModels.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <span className="text-xs text-muted-foreground">No models available</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="font-mono text-xs">{getCurrentModelDisplay()}</span>
          {currentProvider && (
            <span className="text-xs text-muted-foreground">({currentProvider.name})</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {Object.entries(modelsByProvider).map(([providerName, providerModels], index) => (
          <div key={providerName}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
              {providerName}
            </DropdownMenuLabel>
            {providerModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className="flex items-center justify-between font-mono text-xs cursor-pointer"
              >
                <span className={model.id === currentModel?.id ? 'font-semibold' : ''}>
                  {model.name}
                </span>
                {model.id === currentModel?.id && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        {enabledModels.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No models available. Add a provider in Settings.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
