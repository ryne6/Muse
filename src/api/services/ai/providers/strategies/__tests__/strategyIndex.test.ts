import { describe, it, expect } from 'vitest'
import { getStrategy } from '../index'
import { openAIStrategy } from '../openai'
import { anthropicStrategy } from '../anthropic'

describe('getStrategy', () => {
  it('should return anthropic strategy for anthropic-messages format', () => {
    expect(getStrategy('anthropic-messages')).toBe(anthropicStrategy)
  })

  it('should return openai strategy for responses format', () => {
    expect(getStrategy('responses')).toBe(openAIStrategy)
  })

  it('should return openai strategy for undefined format', () => {
    expect(getStrategy(undefined)).toBe(openAIStrategy)
  })

  it('should return openai strategy for unknown format', () => {
    expect(getStrategy('any-custom-format')).toBe(openAIStrategy)
  })
})
