import { useRef } from 'react'
import { Link } from 'lucide-react'
import { Button } from '../ui/button'
import { SUPPORTED_IMAGE_TYPES, MAX_ATTACHMENT_SIZE } from '@shared/types/attachment'
import { notify } from '@/utils/notify'

interface ImageUploadButtonProps {
  onImagesSelected: (files: File[]) => void
  disabled?: boolean
}

export function ImageUploadButton({ onImagesSelected, disabled }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles: File[] = []

    for (const file of files) {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
        notify.error(`Unsupported image type: ${file.type}`)
        continue
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        notify.error(`Image too large: ${file.name} (max 10MB)`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onImagesSelected(validFiles)
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_IMAGE_TYPES.join(',')}
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        title="Add image"
      >
        <Link className="w-4 h-4" />
      </Button>
    </>
  )
}
