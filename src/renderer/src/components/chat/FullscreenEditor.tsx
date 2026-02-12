import { KeyboardEvent } from 'react'
import { X, Send } from 'lucide-react'
import { Button } from '../ui/button'

interface FullscreenEditorProps {
  value: string
  onChange: (value: string) => void
  onClose: () => void
  onSend: () => void
  isLoading: boolean
}

export function FullscreenEditor({
  value,
  onChange,
  onClose,
  onSend,
  isLoading,
}: FullscreenEditorProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSend()
      onClose()
    }
  }

  return (
    <div className="absolute inset-0 z-50 bg-[hsl(var(--bg-main))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
        <span className="text-sm text-[hsl(var(--text-muted))]">
          Press Esc to close, Cmd+Enter to send
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 p-6">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="从任何想法开始…"
          className="w-full h-full resize-none bg-transparent text-lg focus:outline-none"
          autoFocus
          disabled={isLoading}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-6 py-4 border-t border-[hsl(var(--border))]">
        <Button
          onClick={() => {
            onSend()
            onClose()
          }}
          disabled={!value.trim() || isLoading}
        >
          <Send className="w-4 h-4 mr-2" />
          Send
        </Button>
      </div>
    </div>
  )
}
