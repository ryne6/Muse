import { useState, useCallback, type ReactNode } from 'react'
import { ImagePlus } from 'lucide-react'
import {
  MAX_ATTACHMENT_SIZE,
  isSupportedImageType,
} from '~shared/types/attachment'
import { notify } from '~/utils/notify'

interface ImageDropZoneProps {
  children: ReactNode
  onImagesDropped: (files: File[]) => void
  disabled?: boolean
}

export function ImageDropZone({
  children,
  onImagesDropped,
  disabled,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const validateFiles = useCallback((files: File[]): File[] => {
    const validFiles: File[] = []

    for (const file of files) {
      if (!isSupportedImageType(file.type)) {
        notify.error(`Unsupported image type: ${file.type}`)
        continue
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        notify.error(`Image too large: ${file.name} (max 10MB)`)
        continue
      }
      validFiles.push(file)
    }

    return validFiles
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter(f => f.type.startsWith('image/'))
      const validFiles = validateFiles(imageFiles)

      if (validFiles.length > 0) {
        onImagesDropped(validFiles)
      }
    },
    [disabled, validateFiles, onImagesDropped]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled) return

      const items = Array.from(e.clipboardData.items)
      const imageItems = items.filter(item => item.type.startsWith('image/'))

      if (imageItems.length === 0) return

      const files = imageItems
        .map(item => item.getAsFile())
        .filter((f): f is File => f !== null)

      const validFiles = validateFiles(files)

      if (validFiles.length > 0) {
        onImagesDropped(validFiles)
      }
    },
    [disabled, validateFiles, onImagesDropped]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className="relative"
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 text-primary">
            <ImagePlus className="w-8 h-8" />
            <span className="text-sm font-medium">Drop images here</span>
          </div>
        </div>
      )}
    </div>
  )
}
