/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProviderConfigDialog } from '../ProviderConfigDialog'

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
    expect(screen.getByLabelText(/Enabled/i)).toBeInTheDocument()
  })
})
