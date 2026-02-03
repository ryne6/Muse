/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AddProviderDialog } from '../AddProviderDialog'

const mockDbClient = vi.hoisted(() => {
  return {
    providers: {
      create: vi.fn(async () => ({
        id: 'provider-1',
        name: 'openai',
        type: 'openai',
        apiKey: 'sk-test',
        enabled: true,
      })),
    },
    models: {
      createMany: vi.fn(async () => []),
    },
  }
})

const mockApiClient = vi.hoisted(() => {
  return {
    validateProvider: vi.fn(async () => ({ valid: true })),
  }
})

const mockNotify = vi.hoisted(() => {
  return {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    errorWithRetry: vi.fn(),
  }
})

const mockSettingsStore = vi.hoisted(() => {
  return {
    loadData: vi.fn(async () => {}),
    triggerRefresh: vi.fn(),
  }
})

vi.mock('@/services/dbClient', () => ({
  dbClient: mockDbClient,
}))

vi.mock('@/services/apiClient', () => ({
  apiClient: mockApiClient,
}))

vi.mock('@/utils/notify', () => ({
  notify: mockNotify,
}))

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => mockSettingsStore,
}))

describe('AddProviderDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should submit form when clicking Add Provider button', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    const onProviderAdded = vi.fn()

    render(<AddProviderDialog onProviderAdded={onProviderAdded} />)

    await user.click(screen.getByRole('button', { name: 'Add Provider' }))

    await user.click(screen.getByRole('button', { name: /OpenAI/i }))

    const nameInput = screen.getByPlaceholderText('my-provider')
    await user.clear(nameInput)
    await user.type(nameInput, 'my-openai')

    await user.type(screen.getByPlaceholderText('sk-...'), 'sk-test')

    const addButtons = screen.getAllByRole('button', { name: 'Add Provider' })
    await user.click(addButtons[addButtons.length - 1])

    await waitFor(() => {
      expect(mockDbClient.providers.create).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(onProviderAdded).toHaveBeenCalled()
    })
  })
})
