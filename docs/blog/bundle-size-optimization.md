# Electron 应用打包体积优化实战：从 180MB 到 80MB

> Muse 是一个基于 Electron 的 AI 桌面编程助手，支持多 AI 供应商（Claude、OpenAI、Gemini 等）。本文记录了一次系统性的打包体积优化过程，DMG 从 180MB 降至 80MB（-55.6%），app.asar 从 416MB 降至 56MB（-86.5%）。

**优化日期**: 2026-02-09

---

## 背景：为什么要优化？

Muse 在快速迭代中积累了不少"体积债务"：

- **DMG 安装包**: 180MB — 用户下载体验差
- **app.asar**: 416MB — 应用启动时需要解压，影响冷启动速度
- **app.asar.unpacked**: 21MB — native 模块目录臃肿

主要原因：
1. `@lobehub/ui` 间接引入了 mermaid(67MB)、antd(66MB)、emoji-mart(27MB) 等重依赖
2. 存在多个未使用的直接依赖（antd、react-markdown 等）
3. 缺少构建优化配置（无 code splitting、未移除 console）
4. electron-builder 使用默认压缩级别
5. 打包产物中包含大量冗余文件（源码、文档、测试、locale）

---

## 优化方法论

核心原则：**每一步优化后都执行完整的 `npm run package:mac` 打包，记录 DMG / app.asar / app.asar.unpacked 三个关键指标**。这样可以精确量化每步的收益，避免"感觉优化了但不知道效果"的问题。

---

## 最终成果

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 180MB | 80MB | **-100MB (-55.6%)** |
| app.asar | 416MB | 56MB | **-360MB (-86.5%)** |
| app.asar.unpacked | 21MB | 2.0MB | **-19MB (-90.5%)** |

---

## 优化过程详解

### Step 1: 安装 Bundle 分析工具

> 工欲善其事，必先利其器。

在动手优化之前，先装上 `rollup-plugin-visualizer`，让我们能"看见"bundle 里到底装了什么。

```typescript
// electron.vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

const isAnalyze = process.env.ANALYZE === 'true'

// renderer.plugins 中条件启用
...(isAnalyze
  ? [visualizer({ filename: 'bundle-stats.html', open: true, gzipSize: true })]
  : [])
```

```json
// package.json
"analyze": "ANALYZE=true electron-vite build"
```

**体积变化**: 无（仅 devDependency）

这步不产生任何体积收益，但它是后续所有优化的基础。运行 `npm run analyze` 后生成的可视化报告，让我们清楚地看到 `@lobehub/ui` 引入的 mermaid、shiki 等重依赖占据了 renderer bundle 的大部分体积。

---

### Step 2: 移除未使用的依赖 ⭐ 最大收益

这是整个优化过程中收益最大的一步。

通过全局搜索 `import` 语句，发现以下依赖在代码中完全没有被直接使用：

- **antd** (66MB) — 仅作为 `@lobehub/ui` 的 peer dep，但 lobehub/ui 自带
- **react-markdown** — Markdown 渲染已由 `@lobehub/ui` 的 Markdown 组件接管
- **react-syntax-highlighter** — 同上
- **remark-gfm** — 同上

```bash
npm uninstall antd react-markdown react-syntax-highlighter remark-gfm @types/react-syntax-highlighter
```

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 180MB | 164MB | **-16MB (-8.9%)** |
| app.asar | 416MB | 329MB | **-87MB (-20.9%)** |

**关键发现**: renderer bundle 体积没变（Vite 的 tree-shaking 已经排除了未使用的代码），但 `node_modules` 大幅缩小。Electron 打包时会将整个 `node_modules` 打入 `app.asar`，所以即使代码没用到，只要装了就会增加体积。

**教训**: Electron 应用的依赖管理比 Web 应用更敏感。Web 应用只打包 import 的代码，但 Electron 会把整个 node_modules 带上。定期审计依赖是必要的。

---

### Step 3: 精确 files 配置（防御性优化）

确保打包产物中不包含 source map、类型声明等开发时文件：

```json
// package.json - build.files
"files": [
  "out/**/*",
  "package.json",
  "!out/**/*.map",
  "!out/**/*.d.ts",
  "!out/**/*.js.map",
  "!out/**/*.css.map"
]
```

同时在 `electron.vite.config.ts` 中关闭 source map：

```typescript
renderer: {
  build: {
    sourcemap: false
  }
}
```

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 164MB | 164MB | 无变化 |
| app.asar | 329MB | 335MB | +6MB (构建波动) |

**体积变化**: 无实际收益。这步属于**防御性配置** — 当前构建恰好没有生成这些文件，但配置好排除规则可以防止未来意外打入。asar 的 +6MB 是构建间的正常波动。

---

### Step 4: Vite 构建优化

两个关键配置：

**1. manualChunks 代码分割**

将 React 和 Zustand 拆分为独立的 vendor chunk，利于浏览器缓存：

```typescript
rollupOptions: {
  output: {
    manualChunks: {
      'vendor-react': ['react', 'react-dom'],
      'vendor-zustand': ['zustand']
    }
  }
}
```

**2. esbuild drop 移除调试代码**

生产环境不需要 `console.log` 和 `debugger`：

```typescript
esbuild: {
  drop: ['console', 'debugger']
}
```

> 注意：原方案考虑过切换到 terser minifier，但 Vite 5 默认的 esbuild minify 性能远优于 terser，体积收益相当，所以保持 esbuild 并用 `drop` 配置即可。

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 164MB | 164MB | 无变化 |
| app.asar | 335MB | 323MB | **-12MB (-3.6%)** |

主 bundle `index.js` 从 5,645KB 降至 5,608KB。asar 减小 12MB 主要来自移除了大量 console 语句后的代码体积缩减。

---

### Step 5: 优化 better-sqlite3 asarUnpack（未达预期）

Electron 应用中使用 native 模块（如 better-sqlite3）时，需要将 `.node` 文件从 asar 中解压出来。我们尝试精确化 `asarUnpack` 模式：

```json
"asarUnpack": [
  "**/node_modules/better-sqlite3/build/Release/*.node",
  "**/node_modules/better-sqlite3/build/Release/*.dylib"
]
```

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 164MB | 164MB | 无变化 |
| app.asar.unpacked | 21MB | 21MB | 无变化 |

**结果**: 未达预期。electron-builder 在处理 native 模块时，无论 glob 模式多精确，都会 unpack 完整的模块目录结构（包括 9MB 的 `sqlite3.c` 源码）。这个问题需要通过其他方式解决（见 Step 7）。

**教训**: `asarUnpack` 的 glob 模式控制的是"哪些模块需要 unpack"，而不是"unpack 模块的哪些文件"。一旦匹配到某个模块，整个模块目录都会被解压。

---

### Step 6: electron-builder 最大压缩 ⭐ DMG 最大收益

一行配置，立竿见影：

```json
// package.json - build
"compression": "maximum"
```

electron-builder 默认使用 `normal` 压缩级别。切换到 `maximum` 后：

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 164MB | 141MB | **-23MB (-14.0%)** |
| app.asar | 335MB | 323MB | **-12MB (-3.6%)** |

**代价**: 构建时间略增（压缩算法更耗时），但对于发布构建完全可以接受。

**教训**: 这是 ROI 最高的优化之一 — 一行配置换来 23MB 的 DMG 缩减。建议所有 Electron 项目都加上这个配置。

---

### Step 7: afterPack 钩子清理 ⭐ unpacked 最大收益

这是整个优化中最"脏活累活"但效果惊人的一步。

electron-builder 提供了 `afterPack` 钩子，在打包完成后、签名之前执行自定义脚本。我们用它做两件事：

**1. 清理 asar.unpacked 中的冗余文件**

better-sqlite3 被 unpack 后，目录中包含大量运行时不需要的文件：

- `sqlite3.c` 源码 (9MB) — 编译产物已在 `.node` 文件中
- `README.md`、`LICENSE`、`CHANGELOG` 等文档
- `.gyp`、`.gypi` 等构建配置
- `Makefile`、`binding.gyp` 等

```javascript
// scripts/afterPack.js
const junkPatterns = [
  '**/README.md', '**/CHANGELOG.md', '**/LICENSE',
  '**/*.c', '**/*.cc', '**/*.cpp', '**/*.h',
  '**/*.gyp', '**/*.gypi', '**/Makefile',
  '**/*.d.ts', '**/*.map',
  '**/test/**', '**/docs/**', '**/examples/**',
  // ... 更多模式
]

const junkFiles = await glob(junkPatterns, { cwd: unpackedDir, absolute: true })
for (const file of junkFiles) {
  fs.unlinkSync(file)
}
```

**2. 清理 Electron locale 文件**

Electron 默认包含 70+ 种语言的 locale 文件，每个 200-400KB。对于大多数应用，只需保留英文：

```javascript
const localesDir = path.join(
  frameworksDir,
  'Electron Framework.framework/Versions/A/Resources'
)

const keepLocales = ['en.lproj']
const entries = fs.readdirSync(localesDir)
for (const entry of entries) {
  if (entry.endsWith('.lproj') && !keepLocales.includes(entry)) {
    fs.rmSync(path.join(localesDir, entry), { recursive: true })
  }
}
```

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 141MB | 129MB | **-12MB (-8.5%)** |
| app.asar | 323MB | 323MB | 无变化 |
| app.asar.unpacked | 21MB | 2.0MB | **-19MB (-90.5%)** |

构建日志输出：
```
• afterPack: cleaned 12 junk files (18.6MB) from asar.unpacked
• afterPack: removed 54 locale directories (kept: en.lproj)
```

**关键发现**: locale 文件不在 `app.asar` 里，而是在 `Electron Framework.framework` 目录下，所以清理 locale 只影响 DMG 体积，不影响 asar。而 unpacked 目录的冗余文件清理则是 Step 5 中 `asarUnpack` 无法解决的问题的正确解法。

---

### Step 8: 静态资源压缩

最后一步，压缩项目中的静态资源：

| 文件 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| `logo.png` | 228KB (389x389) | 26KB (128x128) | **-88.7%** |
| `icon.icns` | 1.2MB | 656KB | **-46.2%** |
| `icon.png` | 656KB (1024x1024) | 656KB | 已最优 |

- `logo.png` 是 provider 列表中的小图标，389x389 远超实际显示尺寸，缩至 128x128 足够
- `icon.icns` 重新从 `icon.png` 生成后体积减半，原文件可能包含了冗余的图标变体

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 129MB | 129MB | 无变化 |
| app.asar | 323MB | 323MB | 无变化 |

总计节省约 778KB 原始文件体积，但经过 asar 打包和 DMG 压缩后，在 MB 级别的测量精度下未体现差异。属于源码卫生层面的最佳实践。

---

### Step 9: 将 renderer-only 依赖移至 devDependencies ⭐⭐ 全程最大收益

这是整个优化过程中**收益最大的单步操作**，效果超过前 8 步优化的总和。

**核心洞察**: Muse 的三层架构中，renderer 进程由 Vite 完整打包为自包含 bundle（`out/renderer/`，20MB），运行时**不需要** `node_modules` 中的任何 renderer 依赖。只有 main 进程的依赖（通过 `externalizeDepsPlugin()` 外部化）才需要在 `node_modules` 中存在。

因此，只在 renderer 中使用的依赖应该移到 `devDependencies`，这样 electron-builder 不会将它们打入 asar。

**迁移的依赖**:

| 依赖 | node_modules 大小 | 说明 |
|------|-------------------|------|
| `@lobehub/ui` | 151MB (+间接 ~260MB) | UI 组件库，间接引入 mermaid、antd、emoji-mart、shiki |
| `react` / `react-dom` | <5MB | 框架核心 |
| `zustand` | <1MB | 状态管理 |
| `lucide-react` | 44MB | 图标库 |
| `class-variance-authority` | <1MB | CSS 变体工具 |
| `clsx` / `tailwind-merge` | <1MB | 样式工具 |

```bash
npm install --save-dev @lobehub/ui react react-dom zustand lucide-react class-variance-authority clsx tailwind-merge
```

> 注意：`react` 和 `react-dom` 移至 devDep 后，需确认 renderer 的 Vite 配置中没有使用 `externalizeDepsPlugin()`（当前只有 main/preload 用了，renderer 没有，所以没问题）。

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| DMG | 129MB | 80MB | **-49MB (-38.0%)** |
| app.asar | 323MB | 56MB | **-267MB (-82.7%)** |

**关键发现**: renderer bundle 体积完全不变（仍然是 20MB），因为 Vite 打包是自包含的，不依赖运行时 node_modules。但 electron-builder 打包 asar 时不再包含这些庞大的依赖树（mermaid 67MB、antd 间接 42MB、emoji-mart 27MB、shiki 12MB 等），asar 从 323MB 骤降至 56MB。

**教训**: 这揭示了 Electron + Vite 架构中一个常被忽视的问题 — **Vite 的 tree-shaking 和 electron-builder 的打包是两个独立的过程**。Vite 确实只打包了用到的代码（renderer bundle 只有 20MB），但 electron-builder 会将 `dependencies` 中的所有包（及其完整依赖树）打入 asar，无论 bundle 是否用到。正确的做法是：**只有 main 进程运行时需要的包才放在 `dependencies` 中，renderer-only 的包全部放 `devDependencies`**。

---

## 各步骤贡献一览

| 步骤 | DMG 变化 | app.asar 变化 | unpacked 变化 |
|------|---------|--------------|--------------|
| Step 1: 分析工具 | — | — | — |
| Step 2: 移除未使用依赖 | -16MB | -87MB | — |
| Step 3: files 配置 | — | +6MB (波动) | — |
| Step 4: Vite 构建优化 | — | -12MB | — |
| Step 5: asarUnpack 优化 | — | +12MB (波动) | — |
| Step 6: 最大压缩配置 | -23MB | -12MB | — |
| Step 7: afterPack 清理 | -12MB | — | **-19MB** |
| Step 8: 静态资源压缩 | — | — | — |
| Step 9: renderer-only 依赖移至 devDep | **-49MB** | **-267MB** | — |
| **累计** | **-100MB** | **-360MB** | **-19MB** |

---

## 经验总结

### 高 ROI 优化（必做）

1. **将 renderer-only 依赖移至 devDependencies** — 这是收益最大的单项优化（asar -267MB，-82.7%）。Electron + Vite 架构中，renderer 已被 Vite 完整打包，运行时不依赖 node_modules，只有 main 进程的依赖才需要留在 `dependencies` 中。
2. **审计并移除未使用依赖** — 不同于 Web 应用，Electron 会将整个 `node_modules` 打入 asar，未使用的包也会占据空间。
3. **`compression: "maximum"`** — 一行配置，零风险，DMG 立减 14%。
4. **afterPack 清理钩子** — 清理 native 模块源码、文档、locale 文件。unpacked 目录从 21MB 降至 2MB。

### 中等 ROI 优化（推荐）

4. **Vite 构建优化** — `esbuild.drop` 移除 console/debugger，`manualChunks` 优化代码分割。对 renderer bundle 有直接收益。
5. **精确 files 配置** — 排除 `.map`、`.d.ts` 等文件。防御性配置，防止未来意外打入。
6. **静态资源压缩** — 对最终产物影响小，但属于良好的工程实践。

### 踩坑记录

- **asarUnpack 的 glob 模式不能精确控制 unpack 的文件** — 它控制的是"哪些模块需要 unpack"，而非"unpack 哪些文件"。要清理 unpacked 中的冗余文件，必须用 afterPack 钩子。
- **构建间存在体积波动** — 相同代码多次构建，asar 体积可能有 ±6-12MB 的波动。这是 npm 依赖解析和 asar 打包算法的正常行为，不要被误导。
- **renderer bundle 体积 ≠ 最终产物体积** — Vite tree-shaking 已经很好地排除了未使用代码，所以 `npm uninstall` 不会改变 bundle 大小。但 Electron 打包会带上整个 node_modules，所以移除未使用依赖对 asar 影响巨大。
- **Vite tree-shaking 和 electron-builder 打包是两个独立过程** — Vite 只打包 import 的代码（renderer bundle 20MB），但 electron-builder 会将 `dependencies` 中所有包的完整依赖树打入 asar。将 renderer-only 依赖移至 `devDependencies` 是解决这个"机制冲突"的正确方式。

### 未来优化方向

app.asar 已从 416MB 降至 56MB，剩余体积主要来自 main 进程的 node_modules（better-sqlite3、drizzle-orm、openai SDK 等）。renderer bundle 仍有 20MB（主要来自 `@lobehub/ui` 间接引入的 mermaid、shiki、emoji-mart 等），但这部分已被 Vite 打包，不影响 asar 体积。

进一步优化方向：
- **Electron 框架裁剪** — 移除 `libvk_swiftshader.dylib`（16MB Vulkan 软件渲染器），Muse 不依赖 WebGL/3D 渲染
- **Markdown 组件懒加载** — mermaid 仅在渲染图表时需要，可按需加载以减小 renderer bundle
- **替换重依赖组件** — 评估是否可以用更轻量的替代方案
- **@lobehub/ui 按需引入** — 仅引入实际使用的组件，避免 side-effect 导入

这些将作为独立专项推进。

---

## 写在最后

Electron 应用的体积优化是一个系统工程，没有银弹。但通过**逐步优化、逐步测量**的方法，我们在不改变任何业务逻辑的前提下，将 DMG 从 180MB 降至 80MB（-55.6%），app.asar 从 416MB 降至 56MB（-86.5%）。

其中收益最大的一步是**将 renderer-only 依赖移至 devDependencies**（asar -267MB），这揭示了 Electron + Vite 架构中一个关键但常被忽视的问题：Vite 的 tree-shaking 和 electron-builder 的打包是两个独立过程，只有正确区分 main 进程依赖和 renderer 依赖，才能真正控制 asar 体积。

最重要的经验是：**量化每一步的效果**。不要一次性做完所有优化再测量，而是每做一步就打包验证。这样不仅能精确归因每步的收益，还能及时发现"看起来应该有效但实际没用"的优化（比如 Step 5 的 asarUnpack）。

希望这篇记录对其他 Electron 开发者有所帮助。
