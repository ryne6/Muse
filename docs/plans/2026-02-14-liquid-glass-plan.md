# Liquid Glass 全平台视觉管理 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 集成 electron-liquid-glass，建立 WindowThemeManager 统一管理全平台视觉效果

**Architecture:** WindowThemeManager 作为唯一的视觉效果管理者，按平台策略（Tahoe 液态玻璃 / pre-Tahoe vibrancy / Windows 纯色 / Linux CSS fallback）配置窗口。Renderer 通过 `isMacTahoe` 标志条件性移除 CSS 毛玻璃。

**Tech Stack:** Electron 30+, electron-liquid-glass, TypeScript

---

### Task 1: 升级 Electron 并安装 electron-liquid-glass

**Files:**
- Modify: `package.json`

**Step 1: 升级依赖**

```bash
npm install electron@^30.0.0 --save-dev
npm install electron-liquid-glass --save
```

**Step 2: 重新编译 native 模块**

```bash
npm run postinstall
```

**Step 3: 验证 dev server 能启动**

Run: `npm run dev`
Expected: 应用正常启动，无 native 模块加载错误

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade electron to 30 and add electron-liquid-glass"
```

---

### Task 2: 创建平台检测模块

**Files:**
- Create: `src/main/env.ts`

**Step 1: 创建 env.ts**

```typescript
import { release } from 'os'

export const isMac = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'
export const isLinux = process.platform === 'linux'

// macOS Tahoe = Darwin 25+
export const isMacTahoe =
  isMac && parseInt(release().split('.')[0], 10) >= 25
```

**Step 2: Commit**

```bash
git add src/main/env.ts
git commit -m "feat: add platform detection module with macOS Tahoe check"
```

---

### Task 3: 创建 WindowThemeManager

**Files:**
- Create: `src/main/services/windowThemeManager.ts`

**Step 1: 创建 WindowThemeManager**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/main/services/windowThemeManager.ts
git commit -m "feat: add WindowThemeManager for cross-platform visual effects"
```

---

### Task 4: 集成 WindowThemeManager 到 createWindow

**Files:**
- Modify: `src/main/index.ts:90-109`

**Step 1: 添加 import 和实例化**

在文件顶部 import 区域添加：

```typescript
import { WindowThemeManager } from './services/windowThemeManager'
```

在 `createWindow()` 函数前添加：

```typescript
const themeManager = new WindowThemeManager()
```

**Step 2: 修改 createWindow()**

将 `createWindow()` 中的 BrowserWindow 配置改为：

```typescript
function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    center: true,
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 24, y: 22 },
    title: 'Muse',
    ...themeManager.getPlatformConfig(),
  })

  themeManager.attach(mainWindow)
  // ... 其余代码不变
```

关键变化：移除硬编码的 `transparent: true`、`hasShadow: true`，由 `getPlatformConfig()` 按平台提供。

**Step 3: 验证应用启动**

Run: `npm run dev`
Expected: macOS Tahoe 上窗口显示原生液态玻璃效果

**Step 4: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: delegate window visual config to WindowThemeManager"
```

---

### Task 5: Preload 暴露 isMacTahoe

**Files:**
- Modify: `src/preload/index.ts:1-8`

**Step 1: 添加平台检测**

preload 运行在 renderer 进程，不能直接 import main 的 env.ts。需要内联检测逻辑：

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { release } from 'os'
import type { IpcApi } from '../shared/types/ipc'

const isMacTahoe =
  process.platform === 'darwin' &&
  parseInt(release().split('.')[0], 10) >= 25

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  isMacTahoe,
})
```

注意：preload 有 `sandbox: true`，但 `os.release()` 在 sandbox 模式下仍可用。

**Step 2: Commit**

```bash
git add src/preload/index.ts
git commit -m "feat: expose isMacTahoe flag to renderer via preload"
```

---

### Task 6: Renderer 条件性移除 CSS 毛玻璃

**Files:**
- Modify: `src/renderer/src/components/layout/AppLayout.tsx:73-111`

**Step 1: 添加平台检测和条件样式**

在 AppLayout 组件内、return 之前添加：

```typescript
// Tahoe 上原生液态玻璃替代 CSS 毛玻璃
const isTahoe = (window as any).electron?.isMacTahoe ?? false

const sidebarGlassStyle: React.CSSProperties = isTahoe
  ? {
      borderRadius: 28,
      overflow: 'hidden',
    }
  : {
      borderRadius: 28,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--glass-shadow)',
      overflow: 'hidden',
    }
```

**Step 2: 使用条件样式**

将 DraggableSideNav 的 `styles` prop 改为：

```tsx
styles={{
  content: sidebarGlassStyle,
}}
```

Tahoe 上主卡片也移除 border 和 shadow（原生效果覆盖）：

```tsx
<div className={`flex-1 flex flex-col min-w-0 rounded-[28px] overflow-hidden ${
  isTahoe
    ? 'bg-[hsl(var(--bg-main))]'
    : 'bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] shadow-[var(--card-shadow)]'
}`}>
  <ChatView />
</div>
```

**Step 3: 验证两种模式**

- macOS Tahoe：原生液态玻璃，无 CSS backdrop-filter
- 非 Tahoe：保持现有 CSS 毛玻璃效果

**Step 4: Commit**

```bash
git add src/renderer/src/components/layout/AppLayout.tsx
git commit -m "feat: conditionally remove CSS glass on macOS Tahoe"
```

---

### Task 7: 视觉验证和边缘情况

**手动验证清单：**

- [ ] macOS Tahoe：全窗口液态玻璃效果可见
- [ ] macOS Tahoe：暗色模式切换正常
- [ ] macOS Tahoe：traffic lights 位置正确
- [ ] macOS Tahoe：sidebar 拖拽调整大小正常
- [ ] macOS Tahoe：sidebar 折叠/展开动画正常
- [ ] macOS Tahoe：窗口圆角 28px 正确
- [ ] 非 Tahoe fallback：CSS 毛玻璃效果保持不变
- [ ] 应用启动无 native 模块加载错误
- [ ] `npm run lint` 通过
- [ ] `npm run test` 无新增失败

---

## 文件变更总结

| 文件 | 变更 | 行数 |
|------|------|------|
| `package.json` | Electron ^30, +electron-liquid-glass | ~3 |
| `src/main/env.ts` | 新建，平台检测 | ~8 |
| `src/main/services/windowThemeManager.ts` | 新建，核心类 | ~80 |
| `src/main/index.ts` | 委托 ThemeManager | ~10 changed |
| `src/preload/index.ts` | 暴露 isMacTahoe | ~5 changed |
| `src/renderer/src/components/layout/AppLayout.tsx` | 条件性 CSS glass | ~15 changed |
