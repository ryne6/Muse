import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { Modal, Dropdown } from '@lobehub/ui'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useSettingsStore } from '~/stores/settingsStore'
import { notify } from '~/utils/notify'

interface PromptPreset {
  id: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export function PromptsSettings() {
  const [presets, setPresets] = useState<PromptPreset[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<PromptPreset | null>(null)
  const [presetName, setPresetName] = useState('')
  const [presetContent, setPresetContent] = useState('')

  const globalSystemPrompt = useSettingsStore(s => s.globalSystemPrompt)
  const setGlobalSystemPrompt = useSettingsStore(s => s.setGlobalSystemPrompt)

  const loadPresets = useCallback(async () => {
    try {
      const data = await window.api.promptPresets.getAll()
      setPresets(data || [])
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }, [])

  useEffect(() => {
    loadPresets()
  }, [loadPresets])

  const handleSelectPreset = (presetId: string) => {
    if (presetId === '__custom__') return
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      setGlobalSystemPrompt(preset.content)
      notify.success(`Applied preset: ${preset.name}`)
    }
  }

  const handleOpenDialog = (preset?: PromptPreset) => {
    if (preset) {
      setEditingPreset(preset)
      setPresetName(preset.name)
      setPresetContent(preset.content)
    } else {
      setEditingPreset(null)
      setPresetName('')
      setPresetContent('')
    }
    setIsDialogOpen(true)
  }

  const handleSavePreset = async () => {
    if (!presetName.trim() || !presetContent.trim()) {
      notify.error('Name and content are required')
      return
    }

    try {
      if (editingPreset) {
        await window.api.promptPresets.update(editingPreset.id, {
          name: presetName,
          content: presetContent,
        })
        notify.success('Preset updated')
      } else {
        await window.api.promptPresets.create({
          name: presetName,
          content: presetContent,
        })
        notify.success('Preset created')
      }
      setIsDialogOpen(false)
      loadPresets()
    } catch (error) {
      console.error('Failed to save preset:', error)
      notify.error('Failed to save preset')
    }
  }

  const handleDeletePreset = async (preset: PromptPreset) => {
    if (!confirm(`Delete preset "${preset.name}"?`)) return

    try {
      await window.api.promptPresets.delete(preset.id)
      notify.success('Preset deleted')
      loadPresets()
    } catch (error) {
      console.error('Failed to delete preset:', error)
      notify.error('Failed to delete preset')
    }
  }

  return (
    <div className="space-y-6">
      {/* Global System Prompt */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Global System Prompt</h3>
          {presets.length > 0 && (
            <Dropdown
              menu={{
                items: presets.map(preset => ({
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
          value={globalSystemPrompt}
          onChange={e => setGlobalSystemPrompt(e.target.value)}
          placeholder="Enter custom instructions that will be added to all conversations..."
          className="w-full min-h-[120px] p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] resize-y focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          This prompt will be appended to the built-in system prompt for all
          conversations.
        </p>
      </div>

      {/* Preset Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Prompt Presets</h3>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            New Preset
          </Button>
        </div>

        {presets.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-lg">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No presets yet</p>
            <p className="text-sm">Create presets for quick access</p>
          </div>
        ) : (
          <div className="space-y-2">
            {presets.map(preset => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-background"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {preset.content.slice(0, 60)}...
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(preset)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDeletePreset(preset)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preset Dialog */}
      <Modal
        open={isDialogOpen}
        onCancel={() => setIsDialogOpen(false)}
        title={editingPreset ? 'Edit Preset' : 'New Preset'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset}>
              {editingPreset ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="e.g., React Expert"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <textarea
              value={presetContent}
              onChange={e => setPresetContent(e.target.value)}
              placeholder="Enter the system prompt content..."
              className="w-full min-h-[150px] p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] resize-y focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
