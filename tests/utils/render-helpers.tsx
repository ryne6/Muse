import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

/**
 * 自定义渲染函数，包含常用的 providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // 可以在这里添加常用的 providers，如 Router, Theme, Store 等
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * 重新导出 testing-library 的所有工具
 */
export * from '@testing-library/react'
export { renderWithProviders as render }
