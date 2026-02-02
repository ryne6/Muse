import { useState, useEffect, useCallback } from 'react'
import { Modal, Dropdown } from '@lobehub/ui'
import { Button } from '@/components/ui/button'
import type { Conversation } from '@shared/types/conversation'
import { useConversationStore } from '@/stores/conversationStore'
import { notify } from '@/utils/notify'

interface PromptPreset {
  id: string
  name: string
  content: string
}

interface ConversationSettingsDialogProps {
  conversation: Conversation
  open: boolean
  onClose: () => void
}

export function ConversationSettingsDialog({
  conversation,
  open,
  onClose,
}: ConversationSettingsDialogProps) {
  const [systemPrompt, setSystemPrompt] = useState(conversation.systemPrompt || '')
  const [presets, setPresets] = useState<PromptPreset[]>([])
  const { updateConversationSystemPrompt } = useConversationStore()

  // Load presets
  const loadPresets = useCallback(async () => {
    try {
      const data = await window.api.promptPresets.getAll()
      setPresets(data || [])
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setSystemPrompt(conversation.systemPrompt || '')
      loadPresets()
    }
  }, [open, conversation.systemPrompt, loadPresets])

  const handleSelectPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (preset) {
      setSystemPrompt(preset.content)
    }
  }

  const handleSave = async () => {
    try {
      await updateConversationSystemPrompt(conversation.id, systemPrompt || null)
      notify.success('Conversation settings saved')
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
      notify.error('Failed to save settings')
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Conversation Settings"
      width={500}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">System Prompt</label>
            {presets.length > 0 && (
              <Dropdown
                menu={{
                  items: presets.map((preset) => ({
                    key: preset.id,
                    label: preset.name,
                    onClick: () => handleSelectPreset(preset.id),
                  })),
                }}
              >
                <Button size="sm" variant="outline">
                  Select Preset
                </Button>
              </Dropdown>
            )}
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter custom instructions for this conversation..."
            className="w-full min-h-[120px] p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            This prompt will be appended after the global system prompt for this conversation only.
          </p>
          <p className="text-xs text-amber-500">
            Changes will take effect on subsequent messages.
          </p>
        </div>
      </div>
    </Modal>
  )
}
