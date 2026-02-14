# Liquid Glass 全平台视觉管理 — 设计文档

**Created:** 2026-02-14
**Status:** Approved
**Reference:** [LobeHub PR #12277](https://github.com/lobehub/lobehub/pull/12277)

---

## 目标

集成 `electron-liquid-glass`，在 macOS Tahoe 上实现原生液态玻璃效果，同时建立 `WindowThemeManager` 统一管理全平台视觉效果。

## 约束

- Electron 需从 ^28.0.0 升级到 ^30.0.0
- electron-liquid-glass 仅 macOS Tahoe (Darwin ≥ 25) 可用
- 非 Tahoe 平台需要 fallback（pre-Tahoe: vibrancy, Windows: 纯色, Linux: CSS glass）
- 保持现有卡片布局、拖拽侧边栏、暗色模式功能不变

---

## 架构

### 平台检测 — `src/main/env.ts`

单一来源，避免重复检测逻辑：

```typescript
export const isMac = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'
export const isLinux = process.platform === 'linux'
export const isMacTahoe = isMac && parseInt(release().split('.')[0], 10) >= 25
```

### WindowThemeManager — `src/main/services/windowThemeManager.ts`

4 个生命周期方法：

| 方法 | 职责 | 调用时机 |
|------|------|----------|
| `getPlatformConfig()` | 返回平台特定的 BrowserWindow 选项 | createWindow() 时 |
| `attach(win)` | 绑定窗口 + 注册 did-finish-load hook + 监听主题变化 | 窗口创建后 |
| `applyVisualEffects()` | 统一处理主题切换 | nativeTheme.updated 事件 |
| `applyLiquidGlass()` | 幂等应用原生液态玻璃 | did-finish-load + 主题切换 |
| `cleanup()` | 重置 liquidGlassViewId | 窗口重建前 |

平台策略：

| 平台 | 创建时配置 | 运行时效果 |
|------|-----------|-----------|
| macOS Tahoe | `transparent: true, hasShadow: true` | `liquidGlass.addView()` 全窗口 |
| macOS pre-Tahoe | `vibrancy: 'sidebar', visualEffectState: 'active'` | 系统自动管理 |
| Windows | `backgroundColor` 跟随主题 | `setBackgroundColor()` 切换 |
| Linux | 默认 | CSS backdrop-filter fallback |

### Renderer 适配

- Preload 暴露 `isMacTahoe` 标志
- AppLayout 根据 `isMacTahoe` 条件性移除 CSS `backdrop-filter`（Tahoe 上原生效果替代）
- `html/body` 背景保持透明（Tahoe 需要，非 Tahoe 由外层 div 提供背景色）

---

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `package.json` | Electron ^30.0.0, +electron-liquid-glass |
| `src/main/env.ts` | 新建，平台检测常量 |
| `src/main/services/windowThemeManager.ts` | 新建，核心类 |
| `src/main/index.ts` | createWindow() 委托 ThemeManager |
| `src/preload/index.ts` | 暴露 isMacTahoe |
| `src/renderer/src/components/layout/AppLayout.tsx` | 条件性 CSS glass |
| `src/shared/types/ipc.ts` | electron 类型扩展 |

## 风险

- Electron 30 升级可能引入 breaking changes，需要检查 better-sqlite3 兼容性
- `electron-liquid-glass` 是 native 模块，需要 electron-rebuild
- `unstable_setVariant` API 可能变化
- 全窗口液态玻璃在深色模式下的可读性需要视觉验证
