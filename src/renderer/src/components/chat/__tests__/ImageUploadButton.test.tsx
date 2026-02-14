/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImageUploadButton } from '../ImageUploadButton'

vi.mock('lucide-react', () => {
  const Link = (props: any) => <span data-testid="Link" {...props} />
  Link.displayName = 'Link'
  return { Link }
})

vi.mock('~/utils/notify', () => ({
  notify: {
    error: vi.fn(),
  },
}))

// Import after mock so we get the mocked version
import { notify } from '~/utils/notify'

beforeEach(() => {
  vi.clearAllMocks()
})

function createFile(
  name: string,
  type: string,
  sizeBytes: number
): File {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

function getFileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

function fireFileChange(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    value: files,
    writable: false,
    configurable: true,
  })
  fireEvent.change(input)
}

describe('ImageUploadButton', () => {
  describe('file type validation', () => {
    it('accepts supported image types (jpeg, png, gif, webp)', () => {
      const onImagesSelected = vi.fn()
      render(<ImageUploadButton onImagesSelected={onImagesSelected} />)
      const input = getFileInput()

      const files = [
        createFile('photo.jpg', 'image/jpeg', 1000),
        createFile('icon.png', 'image/png', 1000),
        createFile('anim.gif', 'image/gif', 1000),
        createFile('modern.webp', 'image/webp', 1000),
      ]
      fireFileChange(input, files)

      expect(onImagesSelected).toHaveBeenCalledWith(files)
      expect(notify.error).not.toHaveBeenCalled()
    })

    it('rejects unsupported image types', () => {
      const onImagesSelected = vi.fn()
      render(<ImageUploadButton onImagesSelected={onImagesSelected} />)
      const input = getFileInput()

      const files = [createFile('doc.pdf', 'application/pdf', 1000)]
      fireFileChange(input, files)

      expect(notify.error).toHaveBeenCalledWith(
        'Unsupported image type: application/pdf'
      )
      expect(onImagesSelected).not.toHaveBeenCalled()
    })

    it('rejects SVG files', () => {
      const onImagesSelected = vi.fn()
      render(<ImageUploadButton onImagesSelected={onImagesSelected} />)
      const input = getFileInput()

      const files = [createFile('icon.svg', 'image/svg+xml', 500)]
      fireFileChange(input, files)

      expect(notify.error).toHaveBeenCalledWith(
        'Unsupported image type: image/svg+xml'
      )
      expect(onImagesSelected).not.toHaveBeenCalled()
    })
  })

  describe('file size validation', () => {
    it('rejects files larger than 10MB', () => {
      const onImagesSelected = vi.fn()
      render(<ImageUploadButton onImagesSelected={onImagesSelected} />)
      const input = getFileInput()

      const bigFile = createFile(
        'huge.png',
        'image/png',
        10 * 1024 * 1024 + 1
      )
      fireFileChange(input, [bigFile])

      expect(notify.error).toHaveBeenCalledWith(
        'Image too large: huge.png (max 10MB)'
      )
      expect(onImagesSelected).not.toHaveBeenCalled()
    })

    it('accepts files exactly at 10MB', () => {
      const onImagesSelected = vi.fn()
      render(<ImageUploadButton onImagesSelected={onImagesSelected} />)
      const input = getFileInput()

      const exactFile = createFile(
        'exact.png',
        'image/png',
        10 * 1024 * 1024
      )
      fireFileChange(input, [exactFile])

      expect(onImagesSelected).toHaveBeenCalledWith([exactFile])
      expect(notify.error).not.toHaveBeenCalled()
    })
  })

  describe('mixed valid and invalid files', () => {
    it('passes only valid files and notifies about invalid ones', () => {
      const onImagesSelected = vi.fn()
      render(<ImageUploadButton onImagesSelected={onImagesSelected} />)
      const input = getFileInput()

      const validFile = createFile('ok.png', 'image/png', 1000)
      const badType = createFile('doc.bmp', 'image/bmp', 1000)
      const tooBig = createFile(
        'big.jpg',
        'image/jpeg',
        11 * 1024 * 1024
      )

      fireFileChange(input, [validFile, badType, tooBig])

      expect(onImagesSelected).toHaveBeenCalledWith([validFile])
      expect(notify.error).toHaveBeenCalledTimes(2)
    })

    it('does not call onImagesSelected when all files are invalid', () => {
      const onImagesSelected = vi.fn()
      render(<ImageUploadButton onImagesSelected={onImagesSelected} />)
      const input = getFileInput()

      const badType = createFile('doc.txt', 'text/plain', 100)
      fireFileChange(input, [badType])

      expect(onImagesSelected).not.toHaveBeenCalled()
    })
  })
})
