import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { dbClient } from '@/services/dbClient'
import { notify } from '@/utils/notify'
import { useSettingsStoreV2 } from '@/stores/settingsStoreV2'

interface Model {
  id: string
  providerId: string
  modelId: string
  name: string
  enabled: boolean
  isCustom: boolean
}

interface ManageModelsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  providerName: string
  onUpdate: () => void
}

export function ManageModelsDialog({
  open,
  onOpenChange,
  providerId,
  providerName,
  onUpdate,
}: ManageModelsDialogProps) {
  const { triggerRefresh } = useSettingsStoreV2()
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newModel, setNewModel] = useState({ modelId: '', name: '' })

  useEffect(() => {
    if (open) {
      loadModels()
    }
  }, [open, providerId])

  const loadModels = async () => {
    setIsLoading(true)
    try {
      const providerModels = await dbClient.models.getByProviderId(providerId)
      setModels(providerModels)
    } catch (error) {
      console.error('Failed to load models:', error)
      notify.error('Failed to load models')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddModel = async () => {
    if (!newModel.modelId.trim() || !newModel.name.trim()) {
      notify.error('Please fill in all fields')
      return
    }

    setIsAdding(true)
    try {
      await dbClient.models.create({
        providerId,
        modelId: newModel.modelId,
        name: newModel.name,
        enabled: true,
        isCustom: true,
      })
      notify.success('Model added successfully')
      setNewModel({ modelId: '', name: '' })
      await loadModels()
      triggerRefresh()
      onUpdate()
    } catch (error) {
      console.error('Failed to add model:', error)
      notify.error('Failed to add model')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleModel = async (modelId: string) => {
    try {
      await dbClient.models.toggleEnabled(modelId)
      await loadModels()
      triggerRefresh()
      onUpdate()
    } catch (error) {
      console.error('Failed to toggle model:', error)
      notify.error('Failed to update model')
    }
  }

  const handleDeleteModel = async (modelId: string, modelName: string) => {
    if (!confirm(`Are you sure you want to delete model "${modelName}"?`)) return

    try {
      await dbClient.models.delete(modelId)
      notify.success('Model deleted')
      await loadModels()
      triggerRefresh()
      onUpdate()
    } catch (error) {
      console.error('Failed to delete model:', error)
      notify.error('Failed to delete model')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Models - {providerName}</DialogTitle>
          <DialogDescription>
            Add, enable/disable, or remove models for this provider
          </DialogDescription>
        </DialogHeader>

        {/* Add New Model */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-semibold text-sm mb-3">Add New Model</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Model ID</label>
              <input
                type="text"
                placeholder="e.g., gpt-4-turbo, gemini-pro"
                value={newModel.modelId}
                onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Display Name</label>
              <input
                type="text"
                placeholder="e.g., GPT-4 Turbo, Gemini Pro"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              />
            </div>
            <Button
              onClick={handleAddModel}
              disabled={isAdding || !newModel.modelId || !newModel.name}
              size="sm"
              className="w-full whitespace-nowrap"
            >
              {isAdding ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                  Adding...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Add Model
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Models List */}
        <div className="space-y-2 mt-4">
          <h3 className="font-semibold text-sm">Available Models</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No models yet. Add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{model.name}</span>
                      {model.isCustom && (
                        <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {model.modelId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleToggleModel(model.id)}
                      variant={model.enabled ? 'default' : 'outline'}
                      size="sm"
                    >
                      {model.enabled ? '✓ Enabled' : 'Disabled'}
                    </Button>
                    {model.isCustom && (
                      <Button
                        onClick={() => handleDeleteModel(model.id, model.name)}
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
