/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MessageStats } from '../MessageStats'

describe('MessageStats', () => {
  describe('formatTokenCount (via rendering)', () => {
    it('formats counts below 1000 with locale string', () => {
      render(<MessageStats inputTokens={500} />)
      expect(screen.getByText(/500/)).toBeInTheDocument()
    })

    it('formats counts at 1000 as "1.0k"', () => {
      render(<MessageStats inputTokens={1000} />)
      expect(screen.getByText(/1\.0k/)).toBeInTheDocument()
    })

    it('formats counts above 1000 with one decimal', () => {
      render(<MessageStats inputTokens={2500} />)
      expect(screen.getByText(/2\.5k/)).toBeInTheDocument()
    })

    it('formats large counts like 15000 as "15.0k"', () => {
      render(<MessageStats inputTokens={15000} />)
      expect(screen.getByText(/15\.0k/)).toBeInTheDocument()
    })

    it('formats 999 as locale string (no k suffix)', () => {
      render(<MessageStats outputTokens={999} />)
      expect(screen.getByText(/999/)).toBeInTheDocument()
      // "tokens" label contains 'k', so check the formatted value directly
      expect(screen.queryByText(/\dk/)).not.toBeInTheDocument()
    })
  })

  describe('formatDuration (via rendering)', () => {
    it('formats sub-second durations as fractional seconds', () => {
      render(<MessageStats durationMs={500} />)
      expect(screen.getByText('0.5s')).toBeInTheDocument()
    })

    it('formats durations under 60s as seconds with one decimal', () => {
      render(<MessageStats durationMs={3200} />)
      expect(screen.getByText('3.2s')).toBeInTheDocument()
    })

    it('formats exactly 1000ms as "1.0s"', () => {
      render(<MessageStats durationMs={1000} />)
      expect(screen.getByText('1.0s')).toBeInTheDocument()
    })

    it('formats durations >= 60s as "Xm Ys"', () => {
      render(<MessageStats durationMs={90000} />)
      expect(screen.getByText('1m 30s')).toBeInTheDocument()
    })

    it('formats exactly 60s as "1m 0s"', () => {
      render(<MessageStats durationMs={60000} />)
      expect(screen.getByText('1m 0s')).toBeInTheDocument()
    })

    it('formats multi-minute durations', () => {
      render(<MessageStats durationMs={125000} />)
      expect(screen.getByText('2m 5s')).toBeInTheDocument()
    })
  })

  describe('conditional rendering', () => {
    it('returns null when all props are undefined', () => {
      const { container } = render(<MessageStats />)
      expect(container.innerHTML).toBe('')
    })

    it('returns null when all props are explicitly 0', () => {
      const { container } = render(
        <MessageStats inputTokens={0} outputTokens={0} durationMs={0} />
      )
      expect(container.innerHTML).toBe('')
    })

    it('renders when only inputTokens is provided', () => {
      render(<MessageStats inputTokens={100} />)
      expect(screen.getByText(/100/)).toBeInTheDocument()
    })

    it('renders when only outputTokens is provided', () => {
      render(<MessageStats outputTokens={200} />)
      expect(screen.getByText(/200/)).toBeInTheDocument()
    })

    it('renders when only durationMs is provided', () => {
      render(<MessageStats durationMs={1500} />)
      expect(screen.getByText('1.5s')).toBeInTheDocument()
    })

    it('renders all stats together', () => {
      render(
        <MessageStats
          inputTokens={1500}
          outputTokens={3000}
          durationMs={5000}
        />
      )
      expect(screen.getByText(/1\.5k/)).toBeInTheDocument()
      expect(screen.getByText(/3\.0k/)).toBeInTheDocument()
      expect(screen.getByText('5.0s')).toBeInTheDocument()
    })
  })
})
