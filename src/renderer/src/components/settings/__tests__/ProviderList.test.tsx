/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ProviderList } from '../ProviderList'

/**
 * ProviderList 组件测试
 *
 * 测试目标：
 * - 提供商列表加载和渲染
 * - 空状态显示
 * - 统计信息显示
 * - 加载状态显示
 * - dbClient 调用验证
 */

// Mock dbClient
const mockDbClient = vi.hoisted(() => {
  return {
    providers: {
      getAll: vi.fn(async () => [
        {
          id: 'provider-1',
          name: 'Claude',
          type: 'claude',
          apiKey: 'test-key-1',
          enabled: true,
          baseURL: 'https://api.anthropic.com'
        },
        {
          id: 'provider-2',
          name: 'OpenAI',
          type: 'openai',
          apiKey: 'test-key-2',
          enabled: false
        }
      ])
    }
  }
})

vi.mock('@/services/dbClient', () => ({
  dbClient: mockDbClient
}))

// Mock child components
vi.mock('../ProviderCard', () => ({
  ProviderCard: ({ provider, onUpdate, onConfigure, onManageModels }: any) => (
    <div data-testid={`provider-card-${provider.id}`}>
      <div>{provider.name}</div>
      <button onClick={() => onConfigure(provider)}>Configure</button>
      <button onClick={() => onManageModels(provider)}>Manage Models</button>
      <button onClick={onUpdate}>Update</button>
    </div>
  )
}))

vi.mock('../AddProviderDialog', () => ({
  AddProviderDialog: ({ onProviderAdded }: any) => (
    <button data-testid="add-provider-dialog" onClick={onProviderAdded}>
      Add Provider
    </button>
  )
}))

vi.mock('../ManageModelsDialog', () => ({
  ManageModelsDialog: ({ open, providerId, providerName }: any) =>
    open ? (
      <div data-testid="manage-models-dialog">
        <div>Managing models for {providerName}</div>
        <div>Provider ID: {providerId}</div>
      </div>
    ) : null
}))

describe('ProviderList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染测试', () => {
    it('should render header and description', async () => {
      render(<ProviderList />)

      await waitFor(() => {
        expect(screen.getByText('AI Providers')).toBeInTheDocument()
        expect(screen.getByText('Manage your AI provider configurations')).toBeInTheDocument()
      })
    })

    it('should render AddProviderDialog button', async () => {
      render(<ProviderList />)

      await waitFor(() => {
        expect(screen.getByTestId('add-provider-dialog')).toBeInTheDocument()
      })
    })
  })

  describe('提供商列表加载测试', () => {
    it('should call dbClient.providers.getAll on mount', async () => {
      render(<ProviderList />)

      await waitFor(() => {
        expect(mockDbClient.providers.getAll).toHaveBeenCalled()
      })
    })

    it('should render provider cards', async () => {
      render(<ProviderList />)

      await waitFor(() => {
        expect(screen.getByTestId('provider-card-provider-1')).toBeInTheDocument()
        expect(screen.getByTestId('provider-card-provider-2')).toBeInTheDocument()
        expect(screen.getByText('Claude')).toBeInTheDocument()
        expect(screen.getByText('OpenAI')).toBeInTheDocument()
      })
    })
  })

  describe('统计信息测试', () => {
    it('should display total providers count', async () => {
      render(<ProviderList />)

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Total Providers')).toBeInTheDocument()
      })
    })

    it('should display active providers count', async () => {
      render(<ProviderList />)

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })
  })

  describe('空状态测试', () => {
    it('should show empty state when no providers exist', async () => {
      // Mock: no providers
      mockDbClient.providers.getAll.mockResolvedValueOnce([])

      render(<ProviderList />)

      await waitFor(() => {
        expect(screen.getByText('No providers configured')).toBeInTheDocument()
      })
    })
  })

  describe('加载状态测试', () => {
    it('should show loading spinner initially', () => {
      render(<ProviderList />)

      // Should show loading spinner (Loader2 renders as SVG with animate-spin class)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should hide loading spinner after data loads', async () => {
      render(<ProviderList />)

      await waitFor(() => {
        expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
      })
    })
  })

  describe('管理模型对话框测试', () => {
    it('should open ManageModelsDialog when clicking Manage Models button', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      render(<ProviderList />)

      // Wait for providers to load
      await waitFor(() => {
        expect(screen.getByText('Claude')).toBeInTheDocument()
      })

      // Click Manage Models button
      const manageButtons = screen.getAllByText('Manage Models')
      await user.click(manageButtons[0])

      // Should show ManageModelsDialog
      await waitFor(() => {
        expect(screen.getByTestId('manage-models-dialog')).toBeInTheDocument()
        expect(screen.getByText('Managing models for Claude')).toBeInTheDocument()
      })
    })
  })

  describe('回调函数测试', () => {
    it('should call onConfigureProvider when Configure button is clicked', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      const onConfigureProvider = vi.fn()

      render(<ProviderList onConfigureProvider={onConfigureProvider} />)

      // Wait for providers to load
      await waitFor(() => {
        expect(screen.getByText('Claude')).toBeInTheDocument()
      })

      // Click Configure button
      const configureButtons = screen.getAllByText('Configure')
      await user.click(configureButtons[0])

      // Should call callback with provider
      expect(onConfigureProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'provider-1',
          name: 'Claude'
        })
      )
    })

    it('should reload providers when Update button is clicked', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      render(<ProviderList />)

      // Wait for initial load
      await waitFor(() => {
        expect(mockDbClient.providers.getAll).toHaveBeenCalledTimes(1)
      })

      // Click Update button
      const updateButtons = screen.getAllByText('Update')
      await user.click(updateButtons[0])

      // Should call getAll again
      await waitFor(() => {
        expect(mockDbClient.providers.getAll).toHaveBeenCalledTimes(2)
      })
    })
  })
})
