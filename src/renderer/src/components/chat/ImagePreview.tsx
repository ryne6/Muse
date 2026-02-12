import { X } from 'lucide-react'
import { Button } from '../ui/button'
import type { PendingAttachment } from '@shared/types/attachment'

interface ImagePreviewProps {
  attachment: PendingAttachment
  onRemove: () => void
  onNoteChange: (note: string) => void
}

export function ImagePreview({
  attachment,
  onRemove,
  onNoteChange,
}: ImagePreviewProps) {
  return (
    <div className="relative group">
      <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted">
        <img
          src={attachment.dataUrl}
          alt={attachment.filename}
          className="w-full h-full object-cover"
        />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      <input
        type="text"
        value={attachment.note}
        onChange={e => onNoteChange(e.target.value)}
        placeholder="Add note..."
        className="mt-1 w-20 text-xs px-1 py-0.5 border rounded bg-background"
      />
    </div>
  )
}
