/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MessageImage } from '../MessageImage'
import type { AttachmentPreview } from '@shared/types/attachment'

vi.mock('lucide-react', () => {
  const Loader2 = (props: any) => <span data-testid="Loader2" {...props} />
  Loader2.displayName = 'Loader2'
  return { Loader2 }
})

describe('MessageImage', () => {
  const attachment: AttachmentPreview = {
    id: 'att-1',
    messageId: 'msg-1',
    filename: 'image.png',
    mimeType: 'image/png',
    note: 'demo note',
    size: 1234,
    width: 100,
    height: 100,
    createdAt: new Date(),
  }

  const getBase64Mock = vi.fn()

  beforeEach(() => {
    getBase64Mock.mockReset()
    ;(window as any).api.attachments = {
      getBase64: getBase64Mock,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state while fetching image data', async () => {
    let resolveFetch: (value: string | null) => void
    const pending = new Promise<string | null>(resolve => {
      resolveFetch = resolve
    })
    getBase64Mock.mockReturnValueOnce(pending)

    render(<MessageImage attachment={attachment} />)

    expect(screen.getByTestId('Loader2')).toBeInTheDocument()

    resolveFetch!('YWJj')
    await waitFor(() => {
      expect(screen.queryByTestId('Loader2')).not.toBeInTheDocument()
    })
  })

  it('returns null when no image data is available', async () => {
    getBase64Mock.mockResolvedValueOnce(null)

    const { container } = render(<MessageImage attachment={attachment} />)

    await waitFor(() => {
      expect(container.querySelector('img')).not.toBeInTheDocument()
    })
  })

  it('renders image and note when base64 data is loaded', async () => {
    getBase64Mock.mockResolvedValueOnce('YWJj')

    render(<MessageImage attachment={attachment} />)

    const img = await screen.findByRole('img', { name: 'image.png' })
    expect(img).toHaveAttribute('src', 'data:image/png;base64,YWJj')
    expect(screen.getByText('demo note')).toBeInTheDocument()
  })

  it('does not render note block when note is absent', async () => {
    getBase64Mock.mockResolvedValueOnce('YWJj')

    render(
      <MessageImage
        attachment={{
          ...attachment,
          note: null,
        }}
      />
    )

    await screen.findByRole('img', { name: 'image.png' })
    expect(screen.queryByText('demo note')).not.toBeInTheDocument()
  })

  it('opens and closes expanded modal on click', async () => {
    getBase64Mock.mockResolvedValueOnce('YWJj')

    const { container } = render(<MessageImage attachment={attachment} />)

    const preview = await screen.findByRole('img', { name: 'image.png' })
    fireEvent.click(preview)

    const overlay = container.querySelector('.fixed.inset-0')
    expect(overlay).toBeInTheDocument()

    fireEvent.click(overlay!)
    await waitFor(() => {
      expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument()
    })
  })

  it('handles load errors gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getBase64Mock.mockRejectedValueOnce(new Error('load failed'))

    const { container } = render(<MessageImage attachment={attachment} />)

    await waitFor(() => {
      expect(container.querySelector('img')).not.toBeInTheDocument()
    })

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to load image:',
      expect.any(Error)
    )
  })
})
