import { describe, it, expect } from 'vitest'
import {
  isMultimodalContent,
  getTextContent,
  type TextContent,
  type ImageContent,
  type MessageContent
} from '../ai'

/**
 * AI Type Helpers 测试
 *
 * 测试目标：
 * - isMultimodalContent 类型守卫
 * - getTextContent 文本提取
 */

describe('AI Type Helpers', () => {
  describe('isMultimodalContent', () => {
    it('should return false for string', () => {
      const content = 'Hello, world!'
      expect(isMultimodalContent(content)).toBe(false)
    })

    it('should return true for array', () => {
      const content: MessageContent[] = [
        { type: 'text', text: 'Hello' }
      ]
      expect(isMultimodalContent(content)).toBe(true)
    })

    it('should return true for empty array', () => {
      const content: MessageContent[] = []
      expect(isMultimodalContent(content)).toBe(true)
    })

    it('should return true for mixed content array', () => {
      const content: MessageContent[] = [
        { type: 'text', text: 'Check this image:' },
        { type: 'image', mimeType: 'image/png', data: 'base64data' }
      ]
      expect(isMultimodalContent(content)).toBe(true)
    })
  })

  describe('getTextContent', () => {
    it('should return string as-is', () => {
      const content = 'Hello, world!'
      expect(getTextContent(content)).toBe('Hello, world!')
    })

    it('should extract text from single text block', () => {
      const content: MessageContent[] = [
        { type: 'text', text: 'Hello from block' }
      ]
      expect(getTextContent(content)).toBe('Hello from block')
    })

    it('should concatenate multiple text blocks', () => {
      const content: MessageContent[] = [
        { type: 'text', text: 'First ' },
        { type: 'text', text: 'Second ' },
        { type: 'text', text: 'Third' }
      ]
      expect(getTextContent(content)).toBe('First Second Third')
    })

    it('should ignore image blocks', () => {
      const content: MessageContent[] = [
        { type: 'text', text: 'Before image' },
        { type: 'image', mimeType: 'image/png', data: 'base64data' },
        { type: 'text', text: ' After image' }
      ]
      expect(getTextContent(content)).toBe('Before image After image')
    })

    it('should return empty string for no text blocks', () => {
      const content: MessageContent[] = [
        { type: 'image', mimeType: 'image/png', data: 'base64data' },
        { type: 'image', mimeType: 'image/jpeg', data: 'moredata' }
      ]
      expect(getTextContent(content)).toBe('')
    })

    it('should return empty string for empty array', () => {
      const content: MessageContent[] = []
      expect(getTextContent(content)).toBe('')
    })

    it('should handle image with note', () => {
      const content: MessageContent[] = [
        { type: 'text', text: 'See: ' },
        { type: 'image', mimeType: 'image/png', data: 'data', note: 'Screenshot' }
      ]
      // Note is not included in text extraction
      expect(getTextContent(content)).toBe('See: ')
    })
  })
})
