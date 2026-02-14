import { BrowserWindow, nativeTheme } from 'electron'
import { isMac, isMacTahoe, isWindows } from '../env'

type LiquidGlassModule = typeof import('electron-liquid-glass').default

export class WindowThemeManager {
  private win: BrowserWindow | null = null
  private liquidGlassViewId: number | null = null
  private liquidGlass: LiquidGlassModule | null = null

  /** 返回平台特定的 BrowserWindow 创建选项 */
  getPlatformConfig(): Partial<Electron.BrowserWindowConstructorOptions> {
    if (isMacTahoe) {
      return { transparent: true, hasShadow: true }
    }
    if (isMac) {
      return {
        vibrancy: 'sidebar',
        visualEffectState: 'active',
      }
    }
    if (isWindows) {
      return {
        backgroundColor: nativeTheme.shouldUseDarkColors
          ? '#1a1a1a'
          : '#f2f2f2',
      }
    }
    return {}
  }

  /** 绑定窗口，注册生命周期 hooks */
  attach(win: BrowserWindow): void {
    // 重置旧窗口状态（窗口关闭后重新打开时 liquidGlassViewId 还残留）
    this.liquidGlassViewId = null
    this.win = win
    win.webContents.once('did-finish-load', () => {
      this.applyLiquidGlass()
    })
    nativeTheme.on('updated', () => this.applyVisualEffects())
  }

  /** 主题变化时统一处理各平台视觉效果 */
  applyVisualEffects(): void {
    if (!this.win) return
    if (isMacTahoe) {
      // 液态玻璃自动跟随系统主题，无需额外操作
      return
    }
    if (isWindows) {
      this.win.setBackgroundColor(
        nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#f2f2f2'
      )
    }
    // pre-Tahoe macOS: vibrancy 自动跟随系统主题
    // Linux: CSS fallback，由 Renderer 处理
  }

  /** 幂等应用原生液态玻璃效果 */
  private async applyLiquidGlass(): Promise<void> {
    if (!this.win || !isMacTahoe) return
    if (this.liquidGlassViewId != null) return

    if (!this.liquidGlass) {
      try {
        const mod = await import('electron-liquid-glass')
        this.liquidGlass = mod.default
      } catch (err) {
        console.error('Failed to load electron-liquid-glass:', err)
        return
      }
    }

    try {
      this.liquidGlassViewId = this.liquidGlass.addView(
        this.win.getNativeWindowHandle(),
        { cornerRadius: 28 }
      )
    } catch (err) {
      console.error('Failed to apply liquid glass:', err)
    }
  }

  /** 窗口重建前清理状态 */
  cleanup(): void {
    this.liquidGlassViewId = null
    this.win = null
  }
}
