# Muse 打包体积优化方案

## Context

当前 Muse 打包产物体积过大：
- **DMG**: 188.8 MB | **app.asar**: 421 MB | **解压后**: 676 MB
- **Renderer 资源**: 20MB（343 个文件），主 bundle 5.4MB
- 主要原因：`@lobehub/ui` 引入了 mermaid(67MB)、antd(66MB)、emoji-mart(27MB)、shiki(12MB) 等重依赖；存在多个未使用的依赖；缺少代码分割和构建优化配置

---

## 优化项总览

| # | 优化项 | 预估收益 | 难度 |
|---|--------|---------|------|
| 1 | 移除未使用的依赖 | ~2MB bundle / ~80MB node_modules | 低 |
| 2 | 添加 bundle 分析工具 | 可视化定位问题 | 低 |
| 3 | Vite 构建优化（manualChunks + esbuild） | 首屏加载提升 | 低 |
| 4 | 优化 better-sqlite3 unpacked 体积 | ~9MB asar.unpacked | 低 |
| 5 | 静态资源压缩 | ~200KB+ | 低 |
| 6 | electron-builder 配置优化 | DMG 体积减少 | 低 |
| 7 | afterPack 清理 node_modules 冗余文件 | ~20-50MB asar | 中 |
| 8 | 清理 Electron locale 文件 | ~10-20MB | 低 |
| 9 | 精确 files 配置排除无用产物 | ~5-10MB | 低 |

> **注意**：`@lobehub/ui` 相关优化（Markdown 懒加载、组件替换等）将作为独立专项单独推进，不在本方案范围内。

---

## 1. 移除未使用的依赖

**确认未使用（代码中无任何 import）：**
- `antd` — 无直接导入，仅作为 @lobehub/ui 的 peer dep（@lobehub/ui 自带）
- `react-markdown` — 无导入，Markdown 渲染用的是 @lobehub/ui 的 Markdown
- `react-syntax-highlighter` — 无导入
- `remark-gfm` — 无导入

**操作：**
```bash
npm uninstall antd react-markdown react-syntax-highlighter remark-gfm
```

同时移除 devDependencies 中的 `@types/react-syntax-highlighter`。

**文件：** `package.json`

---

## 2. 添加 Bundle 分析工具

在 `electron.vite.config.ts` 的 renderer 配置中添加 `rollup-plugin-visualizer`：

```typescript
import { visualizer } from 'rollup-plugin-visualizer'

// renderer.plugins 中添加（仅在分析时启用）
visualizer({
  filename: 'bundle-stats.html',
  open: true,
  gzipSize: true,
})
```

添加 npm script：
```json
"analyze": "ANALYZE=true electron-vite build"
```

**文件：** `electron.vite.config.ts`, `package.json`

---

## 3. Vite 构建优化

在 `electron.vite.config.ts` 的 renderer 配置中添加 `build` 选项：

> **Review 修正**：原方案使用 terser，但 Vite 5 默认 esbuild minify 性能远优于 terser，体积收益相当，不应切换。

```typescript
renderer: {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-zustand': ['zustand'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    drop: ['console', 'debugger'], // 生产环境移除，比 terser 更快
  },
  plugins: [react()]
}
```

**文件：** `electron.vite.config.ts`

---

## 4. 优化 better-sqlite3 unpacked 体积

当前 `app.asar.unpacked` 中 better-sqlite3 包含重复的 SQLite 源码：
- `deps/sqlite3/sqlite3.c` (9MB)
- `build/Release/obj/gen/sqlite3/sqlite3.c` (9MB 重复)
- 还有 `test_extension.node`、`python3` 等构建产物

**方案：** 细化 `asarUnpack` 模式，只 unpack 必要的 `.node` 文件：

```json
"asarUnpack": [
  "**/node_modules/better-sqlite3/build/Release/*.node",
  "**/node_modules/better-sqlite3/build/Release/*.dylib"
]
```

**文件：** `package.json` (build.asarUnpack)

---

## 5. 静态资源压缩

- `src/renderer/src/assets/providers/logo.png` (228KB) → 转为 WebP 或压缩 PNG，预计可降至 ~50KB
- `build/icon.png` (656KB) → 压缩优化
- `build/icon.icns` (1.2MB) → 重新生成，使用更高压缩率

**文件：** `src/renderer/src/assets/providers/logo.png`, `build/icon.png`

---

## 6. electron-builder 配置优化

```json
"build": {
  "compression": "maximum",
  "mac": {
    "icon": "build/icon.png",
    "category": "public.app-category.developer-tools",
    "darkModeSupport": true
  },
  "nsis": {
    "differentialPackage": true
  }
}
```

添加 `compression: "maximum"` 提升 asar 压缩率。

**文件：** `package.json` (build)

---

## 7. afterPack 清理 node_modules 冗余文件

> **Review 新增**：Electron 打包后 node_modules 中包含大量运行时不需要的文件，通过 afterPack 钩子清理可显著减少 asar 体积。

在 `package.json` 的 build 配置中添加 afterPack 钩子脚本：

```javascript
// scripts/afterPack.js
const path = require('path')
const fs = require('fs')
const glob = require('fast-glob')

exports.default = async function (context) {
  const appDir = path.join(context.appOutDir, 'Muse.app/Contents/Resources/app.asar.unpacked')
  // 也清理 asar 打包前的 node_modules（通过 electron-builder 的 afterPack 时机）

  const patterns = [
    '**/README.md', '**/README', '**/readme.md',
    '**/CHANGELOG.md', '**/CHANGELOG',
    '**/LICENSE', '**/LICENSE.md', '**/license',
    '**/.github/**', '**/.eslintrc*', '**/.prettierrc*',
    '**/tsconfig.json', '**/tsconfig.*.json',
    '**/test/**', '**/__tests__/**', '**/tests/**',
    '**/*.d.ts', '**/*.map',
    '**/.npmignore', '**/.gitignore',
    '**/docs/**', '**/doc/**',
    '**/example/**', '**/examples/**',
  ]

  // 在 node_modules 中匹配并删除
  const appResources = path.join(context.appOutDir, 'Muse.app/Contents/Resources')
  // 具体路径根据实际打包产物调整
}
```

```json
"build": {
  "afterPack": "./scripts/afterPack.js"
}
```

**预估收益：** ~20-50MB asar 体积减少

**文件：** `scripts/afterPack.js`, `package.json`

---

## 8. 清理 Electron locale 文件

> **Review 新增**：Electron 默认包含 70+ 种语言的 locale 文件，每个约 200-400KB，仅保留需要的语言可节省大量体积。

在 afterPack 钩子中添加 locale 清理逻辑：

```javascript
// 在 scripts/afterPack.js 中追加
const localesDir = path.join(
  context.appOutDir,
  'Muse.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources'
)

if (fs.existsSync(localesDir)) {
  const keepLocales = ['en.lproj', 'zh_CN.lproj', 'zh_TW.lproj']
  const entries = fs.readdirSync(localesDir)
  for (const entry of entries) {
    if (entry.endsWith('.lproj') && !keepLocales.includes(entry)) {
      fs.rmSync(path.join(localesDir, entry), { recursive: true })
    }
  }
}
```

**预估收益：** ~10-20MB

**文件：** `scripts/afterPack.js`

---

## 9. 精确 files 配置排除无用产物

> **Review 新增**：当前 `files` 配置 `["out/**/*"]` 可能包含 source maps、类型声明等不必要文件。

```json
"files": [
  "out/**/*",
  "package.json",
  "!out/**/*.map",
  "!out/**/*.d.ts",
  "!out/**/*.js.map",
  "!out/**/*.css.map"
]
```

同时确认 electron-vite 生产构建不生成 source map：

```typescript
// electron.vite.config.ts
renderer: {
  build: {
    sourcemap: false
  }
}
```

**预估收益：** ~5-10MB

**文件：** `package.json`, `electron.vite.config.ts`

---

## 执行顺序

1. **Step 1** — 安装 `rollup-plugin-visualizer`，配置分析工具（先看清全貌）
2. **Step 2** — 移除未使用依赖（antd, react-markdown, react-syntax-highlighter, remark-gfm）
3. **Step 3** — 精确 files 配置，排除 .map / .d.ts 等无用产物
4. **Step 4** — 优化 electron.vite.config.ts（manualChunks, esbuild drop）
5. **Step 5** — 优化 better-sqlite3 asarUnpack 范围
6. **Step 6** — 优化 electron-builder 压缩配置
7. **Step 7** — 编写 afterPack 钩子（清理 node_modules 冗余 + locale 文件）
8. **Step 8** — 压缩静态资源
9. **Step 9** — 重新构建，对比前后体积

---

## 验证方式

1. 优化前先记录基线：`npm run build && du -sh out/ dist/`
2. 每步优化后重新构建对比
3. 使用 `rollup-plugin-visualizer` 生成的 `bundle-stats.html` 可视化对比
4. 最终运行 `npm run package:mac` 验证 DMG 体积
5. 启动应用验证功能正常（特别是 Markdown 渲染、对话功能）

---

## 已完成优化总结（2026-02-09）

以上 Step 1-9 已全部执行完毕，实际收益：

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 180MB | 80MB | **-100MB (-55.6%)** |
| app.asar | 416MB | 56MB | **-360MB (-86.5%)** |
| app.asar.unpacked | 21MB | 2.0MB | **-19MB (-90.5%)** |

详细每步数据见 `docs/plans/bundle-optimization-log.md`。

---

## 进一步优化：Electron 框架裁剪

### 当前 Muse.app 体积构成（523MB）

| 组件 | 大小 | 占比 | 说明 |
|------|------|------|------|
| app.asar | 323MB | 61.8% | 业务代码 + node_modules |
| Electron Framework 二进制 | 142MB | 27.2% | Chromium + V8 核心，不可裁剪 |
| Libraries/ | 25MB | 4.8% | 动态库，部分可移除 |
| Resources/ | 17MB | 3.3% | ICU 数据等，部分可裁剪 |
| Helpers + 其他 | 16MB | 2.9% | Helper 进程、签名等 |

### Electron Framework 可裁剪项

#### 1. 移除 Vulkan 软件渲染器（预估 -16MB）

`Libraries/libvk_swiftshader.dylib` (16MB) 是 Vulkan 软件渲染回退，仅在 GPU 不可用时使用。Muse 作为编程助手不依赖 WebGL/3D 渲染，可安全移除。

```javascript
// scripts/afterPack.js 中追加
const swiftshader = path.join(frameworksDir,
  'Electron Framework.framework/Versions/A/Libraries/libvk_swiftshader.dylib')
const swiftshaderJson = path.join(frameworksDir,
  'Electron Framework.framework/Versions/A/Libraries/vk_swiftshader_icd.json')
if (fs.existsSync(swiftshader)) fs.unlinkSync(swiftshader)
if (fs.existsSync(swiftshaderJson)) fs.unlinkSync(swiftshaderJson)
```

**风险**: 低。仅影响无 GPU 环境下的 WebGL 回退渲染，Muse 不使用此功能。

#### 2. 裁剪 ICU 国际化数据（预估 -5~8MB）

`Resources/icudtl.dat` (10MB) 包含完整的 ICU 国际化数据（所有语言的排序、日期格式、数字格式等）。可替换为精简版（仅含英文），或在 afterPack 中用 Electron 提供的 `--icu-data-dir` 方案加载精简数据。

**方案 A**（简单）: 不动 icudtl.dat，收益不大且有风险
**方案 B**（进阶）: 使用 Electron 的 `small-icu` 构建，需自定义 Electron 编译

**风险**: 中。裁剪 ICU 数据可能影响非英文文本的排序和格式化。建议暂不处理。

#### 3. 移除 ffmpeg（视情况，预估 -2MB）

`Libraries/libffmpeg.dylib` (2.1MB) 提供音视频编解码。如果 Muse 不播放音视频，可移除。

**风险**: 中。部分 HTML5 `<video>`/`<audio>` 标签会依赖此库，移除后相关功能静默失败。

### Electron 裁剪预估收益

| 项目 | 预估节省 | 风险 | 建议 |
|------|---------|------|------|
| libvk_swiftshader.dylib | **16MB** | 低 | 立即执行 |
| icudtl.dat 精简 | 5-8MB | 中 | 暂缓 |
| libffmpeg.dylib | 2MB | 中 | 暂缓 |
| **合计（推荐执行）** | **~16MB** | — | — |

---

## 进一步优化：app.asar 体积分析

### 问题根源

app.asar 323MB 中，绝大部分来自 `@lobehub/ui` 的间接依赖链：

| 包 | node_modules 大小 | 来源 |
|----|-------------------|------|
| @lobehub/* | 151MB | 直接依赖 |
| mermaid | 67MB | @lobehub/ui → @lobehub/ui 内部 Markdown 组件 |
| antd | 66MB | @lobehub/ui 间接依赖（非直接安装） |
| lucide-react | 44MB | 直接依赖 + @lobehub/ui 间接（存在两份） |
| @ant-design/* | 42MB | antd 间接依赖 |
| @emoji-mart/* | 27MB | @lobehub/ui 间接依赖 |
| @shikijs/* | 12MB | @lobehub/ui → shiki 代码高亮 |
| **合计** | **~410MB** | 压缩后 ≈ 323MB asar |

### 核心问题：Vite tree-shaking vs electron-builder 打包机制冲突

Vite 的 tree-shaking **确实生效了** — renderer bundle 只有 20MB，未使用的代码已被排除。但 electron-builder 打包 app.asar 时，打入的是 **整个 node_modules 目录树**，而非 Vite 的 bundle 产物：

```
Vite 构建 → out/renderer/ (20MB, tree-shaked) ✅
                ↓
electron-builder 打包 app.asar = out/ (20MB) + node_modules/ (~300MB) ❌
```

只要包在 `package.json` 的 `dependencies` 中，无论 bundle 里是否用到，整个依赖树都会被打入 asar。

### 优化方案

#### 核心方案：将 renderer-only 依赖移至 devDependencies（预估 asar 323MB → 80~100MB）

**原理**：Muse 的三层架构中，renderer 进程由 Vite 完整打包为自包含 bundle（`out/renderer/`），运行时 **不需要** node_modules 中的任何 renderer 依赖。只有 main 进程的依赖（通过 `externalizeDepsPlugin()` 外部化）才需要在 node_modules 中存在。

因此，只在 renderer 中使用的依赖应该移到 `devDependencies`，这样 electron-builder 不会将它们打入 asar。

**依赖分类**：

| 依赖 | node_modules 大小 | 使用位置 | 应归属 |
|------|-------------------|---------|--------|
| **Main Process 依赖（保留在 dependencies）** | | | |
| better-sqlite3 | 26MB | main | dependencies |
| drizzle-orm | 16MB | main | dependencies |
| hono / @hono/node-server | <1MB | main (API server) | dependencies |
| @anthropic-ai/sdk | <1MB | main/api | dependencies |
| openai | 12MB | main/api | dependencies |
| @modelcontextprotocol/sdk | <1MB | main | dependencies |
| axios | <1MB | main | dependencies |
| electron-updater | <1MB | main | dependencies |
| execa | <1MB | main | dependencies |
| fast-glob | <1MB | main | dependencies |
| nanoid | <1MB | main + renderer | dependencies |
| uuid | <1MB | main + renderer | dependencies |
| **Renderer-only 依赖（应移至 devDependencies）** | | | |
| @lobehub/ui | **151MB** (+间接 ~260MB) | renderer only | → devDependencies |
| react / react-dom | <5MB | renderer only | → devDependencies |
| zustand | <1MB | renderer only | → devDependencies |
| lucide-react | **44MB** | renderer only | → devDependencies |
| class-variance-authority | <1MB | renderer only | → devDependencies |
| clsx | <1MB | renderer only | → devDependencies |
| tailwind-merge | <1MB | renderer only | → devDependencies |

**迁移操作**：

```bash
# 将 renderer-only 依赖移至 devDependencies
npm install --save-dev @lobehub/ui react react-dom zustand lucide-react class-variance-authority clsx tailwind-merge

# 从 dependencies 中移除（上面的命令会自动处理）
```

> 注意：`react` 和 `react-dom` 移至 devDep 后，需确认 `electron.vite.config.ts` 中 renderer 的 `externalizeDepsPlugin()` 未将它们外部化（当前 renderer 没有用此插件，只有 main/preload 用了，所以没问题）。

**预估收益**：

| 指标 | 当前 | 预估优化后 | 变化 |
|------|------|-----------|------|
| app.asar | 323MB | ~80-100MB | **-220~240MB (-70%)** |
| DMG | 129MB | ~70-90MB | **-40~60MB (-35~45%)** |
| Muse.app | 523MB | ~280-320MB | **-200~240MB** |

**风险**: 低。renderer 已被 Vite 完整打包，运行时不依赖 node_modules。但需验证：
1. `npm run dev` 开发模式正常（Vite dev server 会从 node_modules resolve）
2. `npm run package:mac` 打包后应用启动正常
3. 所有 UI 组件渲染正常（特别是 @lobehub/ui 的 Markdown 组件）

**优先级**: ⭐⭐⭐ 最高 — 这是当前最大的单项优化机会，预估收益超过前 8 步优化的总和。

**实际执行结果（2026-02-09）：**

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| app.asar | 323MB | 56MB | **-267MB (-82.7%)** |
| DMG | 129MB | 80MB | **-49MB (-38.0%)** |
| app.asar.unpacked | 2.0MB | 2.0MB | 无变化 |

> 实际收益超出预估：asar 降至 56MB（预估 80-100MB），DMG 降至 80MB（预估 70-90MB）。验证通过：开发模式正常、打包后应用启动正常、UI 组件渲染正常。
