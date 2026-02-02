/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSystemFonts, applyUIFont } from '../fontService'

/**
 * fontService 单元测试
 *
 * 测试目标：
 * - 获取系统字体
 * - 应用 UI 字体
 */

describe('fontService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window mock
    ;(global as any).window = {}
  })

  describe('getSystemFonts', () => {
    it('should return fallback fonts when queryLocalFonts is not available', async () => {
      const fonts = await getSystemFonts()

      expect(fonts).toContain('System UI')
      expect(fonts).toContain('Arial')
      expect(fonts).toContain('Roboto')
    })

    it('should return system fonts when queryLocalFonts is available', async () => {
      const mockFonts = [
        { family: 'Custom Font' },
        { family: 'Another Font' },
      ]
      ;(global as any).window = {
        queryLocalFonts: vi.fn().mockResolvedValue(mockFonts)
      }

      const fonts = await getSystemFonts()

      expect(fonts).toContain('Custom Font')
      expect(fonts).toContain('Another Font')
      expect(fonts).toContain('System UI')
    })

    it('should return fallback fonts on error', async () => {
      ;(global as any).window = {
        queryLocalFonts: vi.fn().mockRejectedValue(new Error('Permission denied'))
      }

      const fonts = await getSystemFonts()

      expect(fonts).toContain('System UI')
      expect(fonts).toContain('Arial')
    })

    it('should deduplicate and sort fonts', async () => {
      const mockFonts = [
        { family: 'Zebra Font' },
        { family: 'Arial' },
        { family: 'Alpha Font' },
      ]
      ;(global as any).window = {
        queryLocalFonts: vi.fn().mockResolvedValue(mockFonts)
      }

      const fonts = await getSystemFonts()

      const arialIndex = fonts.indexOf('Arial')
      const zebraIndex = fonts.indexOf('Zebra Font')
      expect(arialIndex).toBeLessThan(zebraIndex)
    })

    it('should filter out empty font families', async () => {
      const mockFonts = [
        { family: 'Valid Font' },
        { family: '' },
        { family: null },
      ]
      ;(global as any).window = {
        queryLocalFonts: vi.fn().mockResolvedValue(mockFonts)
      }

      const fonts = await getSystemFonts()

      expect(fonts).toContain('Valid Font')
      expect(fonts).not.toContain('')
    })
  })

  describe('applyUIFont', () => {
    it('should set font CSS variable', () => {
      const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')

      applyUIFont('Custom Font')

      expect(setPropertySpy).toHaveBeenCalledWith('--font-ui', 'Custom Font')
    })

    it('should remove font CSS variable when font is null', () => {
      const removePropertySpy = vi.spyOn(document.documentElement.style, 'removeProperty')

      applyUIFont(null)

      expect(removePropertySpy).toHaveBeenCalledWith('--font-ui')
    })

    it('should remove font CSS variable when font is undefined', () => {
      const removePropertySpy = vi.spyOn(document.documentElement.style, 'removeProperty')

      applyUIFont(undefined)

      expect(removePropertySpy).toHaveBeenCalledWith('--font-ui')
    })
  })
})
