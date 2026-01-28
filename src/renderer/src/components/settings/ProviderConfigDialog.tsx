import { useState, useEffect } from 'react'
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

interface Provider {
  id: string
  name: string
  type: string
  apiKey: string
  baseURL?: string
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
  const [formData, setFormData] = useState({
    apiKey: '',
    baseURL: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    if (provider) {
      setFormData({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL || '',
      })
    }
  }, [provider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!provider || !formData.apiKey) {
      notify.error('API Key is required')
      return
    }

    setIsSubmitting(true)
    try {
      await dbClient.providers.update(provider.id, {
        apiKey: formData.apiKey,
        baseURL: formData.baseURL || null,
      })

      notify.success(`${provider.name} updated successfully`)
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
            <label className="text-sm font-medium mb-2 block">
              API Key <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
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
            <label className="text-sm font-medium mb-2 block">Base URL</label>
            <input
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
