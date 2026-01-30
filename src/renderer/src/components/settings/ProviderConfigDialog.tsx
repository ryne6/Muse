import { useState, useEffect } from 'react'
import { Checkbox } from 'antd'
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
import { useSettingsStore } from '@/stores/settingsStore'

interface Provider {
  id: string
  name: string
  type: string
  apiKey: string
  baseURL?: string
  apiFormat?: string
  enabled: boolean
}

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {provider.name}</DialogTitle>
          <DialogDescription>Update your provider settings</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block" htmlFor="provider-name">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="provider-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="my-provider"
              className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" htmlFor="provider-api-key">
              API Key <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                id="provider-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-20 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
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
            <label className="text-sm font-medium mb-2 block" htmlFor="provider-base-url">
              Base URL
            </label>
            <input
              id="provider-base-url"
              type="text"
              value={formData.baseURL}
              onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Custom API endpoint
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" htmlFor="provider-api-format">
              API Format
            </label>
            <select
              id="provider-api-format"
              value={formData.apiFormat}
              onChange={(e) => setFormData({ ...formData, apiFormat: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            >
              <option value="chat-completions">Chat Completions (/chat/completions)</option>
              <option value="responses">Responses (/responses)</option>
              <option value="anthropic-messages">Anthropic Messages (/v1/messages)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="provider-enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            >
              Enabled
            </Checkbox>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
