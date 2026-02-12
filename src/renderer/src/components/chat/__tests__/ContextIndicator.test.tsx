/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ContextIndicator } from '../ContextIndicator'

describe('ContextIndicator', () => {
  describe('formatTokenShort (via rendering)', () => {
    it('formats counts below 1000 as plain number', () => {
      render(<ContextIndicator usedTokens={500} contextLength={10000} />)
      expect(screen.getByText(/500/)).toBeInTheDocument()
    })

    it('formats counts >= 1000 with k suffix (rounded)', () => {
      render(<ContextIndicator usedTokens={2500} contextLength={10000} />)
      expect(screen.getByText(/3k/)).toBeInTheDocument()
    })

    it('formats exactly 1000 as "1k"', () => {
      render(<ContextIndicator usedTokens={1000} contextLength={200000} />)
      expect(screen.getByText(/1k/)).toBeInTheDocument()
    })

    it('formats counts >= 1_000_000 with M suffix', () => {
      render(
        <ContextIndicator usedTokens={1500000} contextLength={2000000} />
      )
      expect(screen.getByText(/1\.5M/)).toBeInTheDocument()
    })

    it('formats contextLength with M suffix too', () => {
      render(
        <ContextIndicator usedTokens={500000} contextLength={2000000} />
      )
      expect(screen.getByText(/2\.0M/)).toBeInTheDocument()
    })
  })

  describe('conditional rendering', () => {
    it('returns null when usedTokens is null', () => {
      const { container } = render(
        <ContextIndicator usedTokens={null} contextLength={10000} />
      )
      expect(container.innerHTML).toBe('')
    })

    it('returns null when contextLength is null', () => {
      const { container } = render(
        <ContextIndicator usedTokens={5000} contextLength={null} />
      )
      expect(container.innerHTML).toBe('')
    })

    it('returns null when both are null', () => {
      const { container } = render(
        <ContextIndicator usedTokens={null} contextLength={null} />
      )
      expect(container.innerHTML).toBe('')
    })
  })

  describe('threshold-based styling', () => {
    it('renders muted text when ratio <= 0.7', () => {
      render(<ContextIndicator usedTokens={5000} contextLength={10000} />)
      const el = screen.getByText(/5k/)
      expect(el.className).toContain('text-[hsl(var(--text-muted))]')
    })

    it('renders orange text when ratio > 0.7 and <= 0.9', () => {
      render(<ContextIndicator usedTokens={8000} contextLength={10000} />)
      const el = screen.getByText(/8k/)
      expect(el.className).toContain('text-orange-500')
    })

    it('renders red text and progress bar when ratio > 0.9', () => {
      render(<ContextIndicator usedTokens={9500} contextLength={10000} />)
      const el = screen.getByText(/10k/)
      expect(el.className).toContain('text-red-500')
    })

    it('renders progress bar div for critical ratio', () => {
      const { container } = render(
        <ContextIndicator usedTokens={9500} contextLength={10000} />
      )
      const progressBar = container.querySelector('.bg-red-500')
      expect(progressBar).toBeTruthy()
      expect(progressBar?.getAttribute('style')).toContain('width:')
    })

    it('caps progress bar width at 100%', () => {
      const { container } = render(
        <ContextIndicator usedTokens={11000} contextLength={10000} />
      )
      const progressBar = container.querySelector('.bg-red-500')
      expect(progressBar?.getAttribute('style')).toContain('width: 100%')
    })
  })
})
