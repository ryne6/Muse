import { useState, useEffect } from 'react'
import { Checkbox, Modal, Select } from '@lobehub/ui'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { dbClient, type ProviderRecord as Provider } from '~/services/dbClient'
import { notify } from '~/utils/notify'
import { useSettingsStore } from '~/stores/settingsStore'

interface ProviderConfigDialogProps {
  provider: Provider | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function ProviderConfigDialog({
  provider,
  open,
  onClose,
  onUpdated,
}: ProviderConfigDialogProps) {
  const { triggerRefresh } = useSettingsStore()
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    baseURL: '',
    apiFormat: 'chat-completions',
    enabled: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        apiKey: provider.apiKey,
        baseURL: provider.baseURL || '',
        apiFormat: provider.apiFormat || 'chat-completions',
        enabled: provider.enabled,
      })
    }
  }, [provider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!provider || !formData.name.trim() || !formData.apiKey) {
      notify.error('Name and API Key are required')
      return
    }

    setIsSubmitting(true)
    try {
      await dbClient.providers.update(provider.id, {
        name: formData.name.trim(),
        apiKey: formData.apiKey,
        baseURL: formData.baseURL || null,
        apiFormat: formData.apiFormat,
        enabled: formData.enabled,
      })

      notify.success(`${provider.name} updated successfully`)
      triggerRefresh()
      onClose()
      onUpdated()
    } catch (error) {
      console.error('Failed to update provider:', error)
      notify.error('Failed to update provider')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!provider) return null

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`Configure ${provider.name}`}
      footer={null}
      width={500}
    >
      <p className="text-sm text-muted-foreground mb-4">
        Update your provider settings
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="text-sm font-medium mb-2 block"
            htmlFor="provider-name"
          >
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="provider-name"
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="my-provider"
            required
          />
        </div>

        <div>
          <label
            className="text-sm font-medium mb-2 block"
            htmlFor="provider-api-key"
          >
            API Key <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Input
              id="provider-api-key"
              type={showApiKey ? 'text' : 'password'}
              value={formData.apiKey}
              onChange={e =>
                setFormData({ ...formData, apiKey: e.target.value })
              }
              placeholder="sk-..."
              className="pr-20 font-mono"
              required
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your API key is encrypted and stored securely
          </p>
        </div>

        <div>
          <label
            className="text-sm font-medium mb-2 block"
            htmlFor="provider-base-url"
          >
            Base URL
          </label>
          <Input
            id="provider-base-url"
            type="text"
            value={formData.baseURL}
            onChange={e =>
              setFormData({ ...formData, baseURL: e.target.value })
            }
            placeholder="https://api.example.com/v1"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Optional: Custom API endpoint
          </p>
        </div>

        <div>
          <label
            className="text-sm font-medium mb-2 block"
            htmlFor="provider-api-format"
          >
            API Format
          </label>
          <Select
            id="provider-api-format"
            value={formData.apiFormat}
            onChange={value => setFormData({ ...formData, apiFormat: value })}
            style={{ width: '100%' }}
            options={[
              {
                value: 'chat-completions',
                label: 'Chat Completions (/chat/completions)',
              },
              { value: 'responses', label: 'Responses (/responses)' },
              {
                value: 'anthropic-messages',
                label: 'Anthropic Messages (/v1/messages)',
              },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.enabled}
            onChange={checked => setFormData({ ...formData, enabled: checked })}
          >
            Enabled
          </Checkbox>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button htmlType="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button htmlType="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
