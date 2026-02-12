/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../Settings'

/**
 * Settings 组件测试
 *
 * 测试目标：
 * - 标签切换（提供商、通用设置）
 * - 对话框打开/关闭
 * - 子组件渲染
 * - 提供商配置对话框管理
 */

// Mock child components
vi.mock('../../settings/ProviderList', () => ({
  ProviderList: ({ onConfigureProvider }: any) => (
    <div data-testid="provider-list">
      <div>Provider List Component</div>
      <button
        onClick={() =>
          onConfigureProvider({ id: 'test-provider', name: 'Test Provider' })
        }
      >
        Configure Provider
      </button>
    </div>
  ),
}))

vi.mock('../../settings/ProviderConfigDialog', () => ({
  ProviderConfigDialog: ({ provider, open, onClose }: any) =>
    open ? (
      <div data-testid="provider-config-dialog">
        <div>Configuring: {provider?.name}</div>
        <button onClick={onClose}>Close Dialog</button>
      </div>
    ) : null,
}))

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('关闭状态测试', () => {
    it('should render Settings button when closed', () => {
      render(<Settings />)

      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should not show settings dialog when closed', () => {
      render(<Settings />)

      expect(screen.queryByText('Providers')).not.toBeInTheDocument()
      expect(screen.queryByText('General')).not.toBeInTheDocument()
    })
  })

  describe('打开状态测试', () => {
    it('should open settings dialog when clicking Settings button', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should show Providers tab by default', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      await user.click(screen.getByText('Settings'))

      await waitFor(() => {
        expect(screen.getByText('Providers')).toBeInTheDocument()
        expect(screen.getByTestId('provider-list')).toBeInTheDocument()
      })
    })

    it('should close dialog when clicking close button', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      // Open dialog
      await user.click(screen.getByText('Settings'))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Close dialog
      const closeButton = screen.getByRole('button', { name: 'Close' })
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('标签切换测试', () => {
    it('should switch to General tab when clicking General button', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      // Open dialog
      await user.click(screen.getByText('Settings'))

      // Click General tab
      const generalButton = screen.getByText('General')
      await user.click(generalButton)

      await waitFor(() => {
        expect(screen.getByText('General Settings')).toBeInTheDocument()
        expect(
          screen.getByText('More settings coming soon.')
        ).toBeInTheDocument()
      })
    })

    it('should switch back to Providers tab', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      // Open dialog
      await user.click(screen.getByText('Settings'))

      // Switch to General
      await user.click(screen.getByText('General'))

      // Switch back to Providers
      await user.click(screen.getByText('Providers'))

      await waitFor(() => {
        expect(screen.getByTestId('provider-list')).toBeInTheDocument()
      })
    })
  })

  describe('提供商配置对话框测试', () => {
    it('should open ProviderConfigDialog when configuring provider', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      // Open settings
      await user.click(screen.getByText('Settings'))

      // Click configure provider button
      await user.click(screen.getByText('Configure Provider'))

      await waitFor(() => {
        expect(screen.getByTestId('provider-config-dialog')).toBeInTheDocument()
        expect(
          screen.getByText('Configuring: Test Provider')
        ).toBeInTheDocument()
      })
    })

    it('should close ProviderConfigDialog when clicking close', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      // Open settings and configure provider
      await user.click(screen.getByText('Settings'))
      await user.click(screen.getByText('Configure Provider'))

      await waitFor(() => {
        expect(screen.getByTestId('provider-config-dialog')).toBeInTheDocument()
      })

      // Close dialog
      await user.click(screen.getByText('Close Dialog'))

      await waitFor(() => {
        expect(
          screen.queryByTestId('provider-config-dialog')
        ).not.toBeInTheDocument()
      })
    })
  })
})
