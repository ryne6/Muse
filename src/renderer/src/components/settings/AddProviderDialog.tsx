import { useState } from 'react'
import { Plus, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Modal } from '@lobehub/ui'
import { Button } from '@/components/ui/button'
import { dbClient } from '@/services/dbClient'
import { apiClient } from '@/services/apiClient'
import { notify } from '@/utils/notify'
import { useSettingsStore } from '@/stores/settingsStore'

interface AddProviderDialogProps {
  onProviderAdded: () => void
}

const PROVIDER_TEMPLATES = [
  {
    name: 'OpenAI',
    type: 'openai',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'],
  },
  {
    name: 'Claude',
    type: 'claude',
    baseURL: 'https://api.anthropic.com',
    models: [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
    ],
    apiFormat: 'anthropic-messages',
  },
  {
    name: 'Gemini',
    type: 'gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    name: 'Custom',
    type: 'custom',
    baseURL: '',
    models: [],
  },
]

export function AddProviderDialog({ onProviderAdded }: AddProviderDialogProps) {
  const { loadData, triggerRefresh } = useSettingsStore()
  const [open, setOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    apiKey: '',
    baseURL: '',
    apiFormat: 'chat-completions',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    error?: string
  } | null>(null)

  const handleTemplateSelect = (templateName: string) => {
    const template = PROVIDER_TEMPLATES.find(t => t.name === templateName)
    if (template) {
      setSelectedTemplate(templateName)
      setFormData({
        name: template.name.toLowerCase().replace(/\s+/g, '-'),
        type: template.type,
        apiKey: '',
        baseURL: template.baseURL,
        apiFormat: 'chat-completions',
      })
      setValidationResult(null)
    }
  }

  const handleTestConnection = async () => {
    if (!formData.apiKey || !formData.type) {
      notify.error('Please enter API key first')
      return
    }

    setIsValidating(true)
    setValidationResult(null)

    try {
      // Get template for default model
      const template = PROVIDER_TEMPLATES.find(t => t.type === formData.type)
      const defaultModel = template?.models[0] || 'test-model'

      const result = await apiClient.validateProvider(formData.type, {
        apiKey: formData.apiKey,
        model: defaultModel,
        baseURL: formData.baseURL || undefined,
        temperature: 1,
        maxTokens: 100,
      })

      setValidationResult(result)

      if (result.valid) {
        notify.success('Connection successful!')
      } else {
        notify.error(result.error || 'Connection failed')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setValidationResult({ valid: false, error: errorMsg })
      notify.error('Failed to test connection')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.type || !formData.apiKey) {
      notify.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      // Create provider
      const provider = await dbClient.providers.create({
        name: formData.name,
        type: formData.type,
        apiKey: formData.apiKey,
        baseURL: formData.baseURL || null,
        apiFormat: formData.apiFormat,
        enabled: true,
      })

      // Create default models
      const template = PROVIDER_TEMPLATES.find(t => t.type === formData.type)
      if (template && template.models.length > 0) {
        await dbClient.models.createMany(
          template.models.map(modelId => ({
            providerId: provider.id,
            modelId,
            name: modelId,
            contextLength: null,
            isCustom: false,
            enabled: true,
          }))
        )
      }

      notify.success(`${formData.name} added successfully`)
      await loadData()
      triggerRefresh()
      setOpen(false)
      setFormData({
        name: '',
        type: '',
        apiKey: '',
        baseURL: '',
        apiFormat: 'chat-completions',
      })
      setSelectedTemplate('')
      onProviderAdded()
    } catch (error) {
      console.error('Failed to add provider:', error)
      notify.error('Failed to add provider')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Provider
      </Button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title="Add AI Provider"
        footer={null}
        width={672}
        styles={{
          body: { maxHeight: '70vh', overflowY: 'auto' },
        }}
      >
        <p className="text-sm text-muted-foreground mb-4">
          Choose a provider template or configure a custom provider
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Templates */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Choose Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDER_TEMPLATES.map(template => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => handleTemplateSelect(template.name)}
                  className={`p-4 rounded-lg border-2 text-left transition-all hover:border-primary ${
                    selectedTemplate === template.name
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {template.type}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          {selectedTemplate && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="my-provider"
                  className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Unique identifier for this provider
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  API Key <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={e => {
                      setFormData({ ...formData, apiKey: e.target.value })
                      setValidationResult(null)
                    }}
                    placeholder="sk-..."
                    className="flex-1 px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isValidating || !formData.apiKey}
                    className="gap-2"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : validationResult?.valid ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Valid
                      </>
                    ) : validationResult?.valid === false ? (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        Invalid
                      </>
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
                {validationResult?.error && (
                  <p className="text-xs text-destructive mt-1">
                    {validationResult.error}
                  </p>
                )}
                {!validationResult?.error && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API key will be encrypted and stored securely
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Base URL
                </label>
                <input
                  type="text"
                  value={formData.baseURL}
                  onChange={e =>
                    setFormData({ ...formData, baseURL: e.target.value })
                  }
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: Custom API endpoint
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  API Format
                </label>
                <select
                  value={formData.apiFormat}
                  onChange={e =>
                    setFormData({ ...formData, apiFormat: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                >
                  <option value="chat-completions">
                    Chat Completions (/chat/completions)
                  </option>
                  <option value="responses">Responses (/responses)</option>
                  <option value="anthropic-messages">
                    Anthropic Messages (/v1/messages)
                  </option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  API endpoint format used by this provider
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  htmlType="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button htmlType="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Provider'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </>
  )
}
