/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingOverlay } from '../loading'
import { useLoadingStore } from '@/stores/loadingStore'

describe('LoadingOverlay', () => {
  it('should render LoadingOverlay when loadingStore.global is true', () => {
    useLoadingStore.setState({ global: true })
    render(<LoadingOverlay />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })
})
