import { useState, KeyboardEvent, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../ui/button'
import { useChatStore } from '@/stores/chatStore'
import { useConversationStore } from '@/stores/conversationStoreV2'
import { useSettingsStoreV2 } from '@/stores/settingsStoreV2'
import { notify } from '@/utils/notify'
import { ImageUploadButton } from './ImageUploadButton'
import { ImagePreview } from './ImagePreview'
import { ImageDropZone } from './ImageDropZone'
import type { AIConfig } from '@shared/types/ai'
import type { PendingAttachment } from '@shared/types/attachment'

export function ChatInput() {
  const [input, setInput] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const { sendMessage, isLoading } = useChatStore()
  const { getCurrentConversation, createConversation } = useConversationStore()
  const {
    getCurrentProvider,
    getCurrentModel,
    temperature,
    loadData,
  } = useSettingsStoreV2()

  const conversation = getCurrentConversation()

  // Load provider and model data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Convert File to PendingAttachment
  const fileToAttachment = useCallback(async (file: File): Promise<PendingAttachment> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          resolve({
            id: uuidv4(),
            file,
            filename: file.name,
            mimeType: file.type,
            dataUrl: reader.result as string,
            note: '',
            size: file.size,
            width: img.width,
            height: img.height,
          })
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })
  }, [])

  // Handle image selection
  const handleImagesSelected = useCallback(async (files: File[]) => {
    const attachments = await Promise.all(files.map(fileToAttachment))
    setPendingAttachments(prev => [...prev, ...attachments])
  }, [fileToAttachment])

  // Remove pending attachment
  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  // Update attachment note
  const handleNoteChange = useCallback((id: string, note: string) => {
    setPendingAttachments(prev =>
      prev.map(a => a.id === id ? { ...a, note } : a)
    )
  }, [])

  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return

    const provider = getCurrentProvider()
    const model = getCurrentModel()

    if (!provider || !model) {
      notify.error('Please select a provider and model in Settings')
      return
    }

    if (!provider.apiKey) {
      notify.error(`Please configure API key for ${provider.name} in Settings`)
      return
    }

    // Create conversation if none exists
    let currentConversation = conversation
    if (!currentConversation) {
      currentConversation = await createConversation()
    }

    const message = input.trim()
    const attachments = [...pendingAttachments]
    setInput('')
    setPendingAttachments([])

    try {
      // Construct AI config from database provider/model
      const aiConfig: AIConfig = {
        apiKey: provider.apiKey,
        model: model.modelId,
        baseURL: provider.baseURL || undefined,
        apiFormat: provider.apiFormat || 'chat-completions',
        temperature,
        maxTokens: 4096,
      }

      await sendMessage(currentConversation.id, message, provider.type, aiConfig, attachments)
    } catch (error) {
      console.error('Failed to send message:', error)
      notify.error(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-[hsl(var(--border))]">

      {/* Pending Attachments Preview */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2 border-b flex gap-2 flex-wrap">
          {pendingAttachments.map((attachment) => (
            <ImagePreview
              key={attachment.id}
              attachment={attachment}
              onRemove={() => handleRemoveAttachment(attachment.id)}
              onNoteChange={(note) => handleNoteChange(attachment.id, note)}
            />
          ))}
        </div>
      )}

      {/* Input Area */}
      <ImageDropZone onImagesDropped={handleImagesSelected} disabled={isLoading}>
        <div className="px-6 py-4">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-3">
            {/* Icon Row */}
            <div className="flex items-center gap-3 mb-2 text-[hsl(var(--text-muted))]">
              <ImageUploadButton
                onImagesSelected={handleImagesSelected}
                disabled={isLoading}
              />
            </div>
            {/* Input Row */}
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="从任何想法开始…"
                aria-label="Message input"
                className="flex-1 resize-none bg-transparent px-1 py-1 text-[15px] min-h-[40px] max-h-[200px] focus:outline-none"
                rows={2}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
                size="icon"
                className="h-9 w-9 rounded-md shrink-0 bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-3))]"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </ImageDropZone>
    </div>
  )
}
