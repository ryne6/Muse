/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ProviderConfigDialog } from '../ProviderConfigDialog'

const mockDbClient = vi.hoisted(() => ({
  providers: {
    update: vi.fn(async () => ({})),
  },
}))

const mockNotify = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  errorWithRetry: vi.fn(),
}))

const mockSettingsStore = vi.hoisted(() => ({
  triggerRefresh: vi.fn(),
}))

vi.mock('~/services/dbClient', () => ({
  dbClient: mockDbClient,
}))

vi.mock('~/utils/notify', () => ({
  notify: mockNotify,
}))

vi.mock('~/stores/settingsStore', () => ({
  useSettingsStore: () => mockSettingsStore,
}))

vi.mock('@lobehub/ui', () => {
  const React = require('react')
  return {
    Modal: ({ open, children, title }: any) =>
      open ? (
        <div role="dialog" aria-label={title}>
          <h2>{title}</h2>
          {children}
        </div>
      ) : null,
    Button: ({ children, htmlType, type, ...props }: any) => (
      <button type={htmlType ?? type} {...props}>
        {children}
      </button>
    ),
    Input: React.forwardRef(({ ...props }: any, ref: any) => (
      <input ref={ref} {...props} />
    )),
    Select: ({ id, value, onChange, options }: any) => (
      <select
        id={id}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
      >
        {options?.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
    Checkbox: ({ checked, onChange, children }: any) => (
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e: any) => onChange(e.target.checked)}
        />
        {children}
      </label>
    ),
  }
})

const mockProvider = {
  id: 'p1',
  name: 'OpenAI',
  type: 'openai',
  apiKey: 'sk-test',
  baseURL: 'https://api.openai.com/v1',
  apiFormat: 'chat-completions',
  enabled: true,
}

describe('ProviderConfigDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow editing name, apiFormat, enabled', () => {
    render(
      <ProviderConfigDialog
        provider={mockProvider}
        open
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/API Format/i)).toBeInTheDocument()
    // LobeUI Checkbox uses children as label text, not htmlFor
    expect(screen.getByText(/Enabled/i)).toBeInTheDocument()
  })

  it('should submit via form when clicking Save Changes', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    const onClose = vi.fn()
    const onUpdated = vi.fn()

    render(
      <ProviderConfigDialog
        provider={mockProvider}
        open
        onClose={onClose}
        onUpdated={onUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('OpenAI')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /Save Changes/i })
    expect(saveButton).toHaveAttribute('type', 'submit')

    await user.click(saveButton)

    await waitFor(() => {
      expect(mockDbClient.providers.update).toHaveBeenCalled()
    })

    expect(onClose).toHaveBeenCalled()
    expect(onUpdated).toHaveBeenCalled()
  })
})
