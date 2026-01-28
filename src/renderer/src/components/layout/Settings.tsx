import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { Button } from '../ui/button'
import { Settings as SettingsIcon, X, Plus } from 'lucide-react'
import type { ModelConfig } from '@shared/types/config'

export function Settings() {
  const [isOpen, setIsOpen] = useState(false)
  const {
    currentProvider,
    providers,
    updateProvider,
    setCurrentProvider,
    addCustomModel,
    removeCustomModel,
    getAvailableModels,
  } = useSettingsStore()

  const [selectedProvider, setSelectedProvider] = useState(currentProvider)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [isCustomInput, setIsCustomInput] = useState(false)
  const [customModelId, setCustomModelId] = useState('')
  const [temperature, setTemperature] = useState(1)
  const [baseURL, setBaseURL] = useState('')
  const [showAddModelDialog, setShowAddModelDialog] = useState(false)

  // Load current provider config
  useEffect(() => {
    if (isOpen && providers[selectedProvider]) {
      const config = providers[selectedProvider]
      setApiKey(config.apiKey || '')
      setModel(config.model || '')
      setCustomModelId(config.model || '')
      setTemperature(config.temperature || 1)
      setBaseURL(config.baseURL || '')
    }
  }, [isOpen, selectedProvider, providers])

  const handleSave = () => {
    const modelToSave = isCustomInput ? customModelId : model
    updateProvider(selectedProvider, {
      type: selectedProvider as any,
      apiKey,
      model: modelToSave,
      models: providers[selectedProvider]?.models,
      temperature,
      baseURL: baseURL || undefined,
      maxTokens: 4096,
    })
    setCurrentProvider(selectedProvider)
    setIsOpen(false)
  }

  const handleAddModel = (newModel: ModelConfig) => {
    addCustomModel(selectedProvider, newModel)
    setModel(newModel.id)
    setCustomModelId(newModel.id)
  }

  const handleRemoveModel = (modelId: string) => {
    removeCustomModel(selectedProvider, modelId)
    if (model === modelId) {
      const availableModels = getAvailableModels(selectedProvider)
      const firstModel = availableModels.find((m) => !m.isCustom)
      if (firstModel) {
        setModel(firstModel.id)
        setCustomModelId(firstModel.id)
      }
    }
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

  const availableModels = getAvailableModels(selectedProvider)
  const presetModels = availableModels.filter((m) => !m.isCustom)
  const customModels = availableModels.filter((m) => m.isCustom)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Provider Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">AI Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="openai">OpenAI (GPT)</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${selectedProvider === 'claude' ? 'Anthropic' : 'OpenAI'} API key`}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {selectedProvider === 'claude'
                ? 'Get your key from console.anthropic.com'
                : 'Get your key from platform.openai.com'}
            </p>
          </div>

          {/* Model Selector */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <div className="flex gap-2">
                {isCustomInput ? (
                  <input
                    type="text"
                    value={customModelId}
                    onChange={(e) => {
                      setCustomModelId(e.target.value)
                    }}
                    placeholder="Enter custom model ID"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.contextLength && ` (${m.contextLength / 1000}K)`}
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomInput(!isCustomInput)}
                  className="shrink-0"
                >
                  {isCustomInput ? 'Select' : 'Custom'}
                </Button>
              </div>
            </div>

            {/* Quick Select Preset Models */}
            {presetModels.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Quick Select:</div>
                <div className="flex flex-wrap gap-2">
                  {presetModels.slice(0, 4).map((m) => (
                    <Button
                      key={m.id}
                      variant={(isCustomInput ? customModelId : model) === m.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setModel(m.id)
                        setCustomModelId(m.id)
                        setIsCustomInput(false)
                      }}
                      className="text-xs"
                    >
                      {m.name.replace(/^(Claude|GPT) /, '')}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Models List */}
            {customModels.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Custom Models:</div>
                <div className="space-y-1">
                  {customModels.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded bg-secondary text-sm"
                    >
                      <button
                        onClick={() => {
                          setModel(m.id)
                          setCustomModelId(m.id)
                          setIsCustomInput(false)
                        }}
                        className="flex-1 text-left"
                      >
                        {m.name}
                        {m.contextLength && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({m.contextLength / 1000}K)
                          </span>
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleRemoveModel(m.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Model Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModelDialog(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Custom Model
            </Button>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium mb-2">Base URL (Optional)</label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder={
                selectedProvider === 'claude'
                  ? 'https://api.anthropic.com'
                  : 'https://api.openai.com/v1'
              }
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">For custom endpoints or proxy servers</p>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium mb-2">Temperature: {temperature}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Precise (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>

      {/* Add Custom Model Dialog */}
      {showAddModelDialog && (
        <CustomModelDialog
          onAdd={handleAddModel}
          onCancel={() => setShowAddModelDialog(false)}
        />
      )}
    </div>
  )
}

interface CustomModelDialogProps {
  onAdd: (model: ModelConfig) => void
  onCancel: () => void
}

function CustomModelDialog({ onAdd, onCancel }: CustomModelDialogProps) {
  const [modelId, setModelId] = useState('')
  const [modelName, setModelName] = useState('')
  const [contextLength, setContextLength] = useState('')

  const handleAdd = () => {
    if (!modelId.trim()) return

    onAdd({
      id: modelId.trim(),
      name: modelName.trim() || modelId.trim(),
      contextLength: contextLength ? parseInt(contextLength) : undefined,
      isCustom: true,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-sm mx-4 p-4">
        <h3 className="text-lg font-semibold mb-4">Add Custom Model</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Model ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="e.g., gpt-4-1106-preview"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., GPT-4 Turbo (Nov 2023)"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Context Length</label>
            <input
              type="number"
              value={contextLength}
              onChange={(e) => setContextLength(e.target.value)}
              placeholder="e.g., 128000"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!modelId.trim()}>
            Add Model
          </Button>
        </div>
      </div>
    </div>
  )
}
