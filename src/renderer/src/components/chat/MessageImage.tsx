import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import type { AttachmentPreview } from '@shared/types/attachment'

interface MessageImageProps {
  attachment: AttachmentPreview
}

export function MessageImage({ attachment }: MessageImageProps) {
  const [imageData, setImageData] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true)
      try {
        const base64 = await window.api.attachments.getBase64(attachment.id)
        if (base64) {
          setImageData(`data:${attachment.mimeType};base64,${base64}`)
        }
      } catch (error) {
        console.error('Failed to load image:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadImage()
  }, [attachment.id, attachment.mimeType])

  if (isLoading) {
    return (
      <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!imageData) {
    return null
  }

  return (
    <>
      <div className="relative group">
        <img
          src={imageData}
          alt={attachment.filename}
          className="max-w-[200px] max-h-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setIsExpanded(true)}
        />
        {attachment.note && (
          <div className="mt-1 text-xs text-muted-foreground italic">
            {attachment.note}
          </div>
        )}
      </div>

      {/* Expanded view modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <img
            src={imageData}
            alt={attachment.filename}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  )
}
