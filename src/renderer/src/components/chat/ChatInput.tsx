import { useState, KeyboardEvent, useEffect, useCallback } from 'react'
import { Send, Square, Maximize2, Brain, Globe, ChevronDown } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../ui/button'
import { useChatStore } from '@/stores/chatStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { notify } from '@/utils/notify'
import { ImageUploadButton } from './ImageUploadButton'
import { ImagePreview } from './ImagePreview'
import { ImageDropZone } from './ImageDropZone'
import { FullscreenEditor } from './FullscreenEditor'
import type { AIConfig } from '@shared/types/ai'
import type { PendingAttachment } from '@shared/types/attachment'

export function ChatInput() {
  const [input, setInput] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { sendMessage, isLoading, abortMessage } = useChatStore()
  const { getCurrentConversation, createConversation } = useConversationStore()
  const {
    getCurrentProvider,
    getCurrentModel,
    temperature,
    thinkingEnabled,
    setThinkingEnabled,
    loadData,
  } = useSettingsStore()

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
        thinkingEnabled,
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

  const model = getCurrentModel()
  const modelLabel = model?.displayName || model?.name || model?.modelId || '选择模型'

  return (
    <>
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
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
              {/* Text Input Area with Fullscreen Button */}
              <div className="relative p-3 pb-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="从任何想法开始…"
                  aria-label="Message input"
                  className="w-full resize-none bg-transparent text-[15px] min-h-[60px] max-h-[200px] focus:outline-none"
                  rows={3}
                />
                {/* Fullscreen Button */}
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="absolute top-3 right-3 p-1.5 rounded hover:bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] transition-colors"
                  aria-label="Fullscreen edit"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-[hsl(var(--border))]">
                <div className="flex items-center gap-3">
                  {/* Image Upload */}
                  <ImageUploadButton
                    onImagesSelected={handleImagesSelected}
                    disabled={isLoading}
                  />

                  {/* Model Selector */}
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[hsl(var(--surface-2))] text-sm text-[hsl(var(--text-muted))] transition-colors">
                    <span>{modelLabel}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Thinking Toggle */}
                  <button
                    onClick={() => setThinkingEnabled(!thinkingEnabled)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
                      thinkingEnabled
                        ? 'bg-blue-100 text-blue-600'
                        : 'hover:bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))]'
                    }`}
                  >
                    <Brain className="w-4 h-4" />
                    <span>Thinking</span>
                  </button>

                  {/* Web Search Toggle */}
                  <button
                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
                      webSearchEnabled
                        ? 'bg-green-100 text-green-600'
                        : 'hover:bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))]'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>联网</span>
                  </button>
                </div>

                {/* Send / Stop Button */}
                {isLoading ? (
                  <Button
                    onClick={abortMessage}
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-md shrink-0"
                    aria-label="Stop generation"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() && pendingAttachments.length === 0}
                    size="icon"
                    className="h-8 w-8 rounded-md shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ImageDropZone>
      </div>

      {/* Fullscreen Editor */}
      {isFullscreen && (
        <FullscreenEditor
          value={input}
          onChange={setInput}
          onClose={() => setIsFullscreen(false)}
          onSend={handleSend}
          isLoading={isLoading}
        />
      )}
    </>
  )
}
