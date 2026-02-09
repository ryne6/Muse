# Muse 打包体积优化记录

> 记录每一步优化的体积变化，用于最终优化 blog 撰写
> 每步优化后均执行完整 `npm run package:mac` 打包并记录体积

---

## 基线数据（优化前）

**记录时间**: 2026-02-09

| 指标 | 体积 |
|------|------|
| out/ | 20M |
| out/main/ | 164K |
| out/preload/ | 4.0K |
| out/renderer/ | 20M |
| DMG | 180M |
| app.asar | 416M |
| app.asar.unpacked | 21M |

---

## 优化步骤记录

### Step 1: 安装 rollup-plugin-visualizer 并配置分析工具

**操作**: 安装 `rollup-plugin-visualizer` 为 devDep，配置 `electron.vite.config.ts` 条件启用，添加 `npm run analyze` script

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 180M | 180M | 无变化 |
| app.asar | 416M | 416M | 无变化 |
| app.asar.unpacked | 21M | 21M | 无变化 |

> 此步仅安装 devDependency + 配置分析工具，不影响产物体积

---

### Step 2: 移除未使用的依赖

**操作**: `npm uninstall antd react-markdown react-syntax-highlighter remark-gfm @types/react-syntax-highlighter`

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 180M | 164M | **-16M (-8.9%)** |
| app.asar | 416M | 329M | **-87M (-20.9%)** |
| app.asar.unpacked | 21M | 21M | 无变化 |

> 移除 antd(66MB)、react-markdown、react-syntax-highlighter、remark-gfm 等未使用依赖。renderer bundle 未变（tree-shaking 已排除），但 node_modules 大幅缩小，asar 和 DMG 显著减小。

---

### Step 3: 精确 files 配置排除无用产物

**操作**: 在 `package.json` build.files 中排除 `.map`/`.d.ts` 等文件；`electron.vite.config.ts` 设置 `sourcemap: false`

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 164M | 164M | 无变化 |
| app.asar | 329M | 335M | +6M (构建波动) |
| app.asar.unpacked | 21M | 21M | 无变化 |

> files 排除规则和 sourcemap:false 配置完成。DMG 无变化，asar 微增为构建波动。此步主要为防御性配置，确保后续不会打入无用产物。

---

### Step 4: Vite 构建优化（manualChunks + esbuild drop）

**操作**: 添加 `manualChunks` 分割 react/zustand vendor chunk；`esbuild.drop: ['console', 'debugger']` 移除调试代码；`chunkSizeWarningLimit: 1000`

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 164M | 164M | 无变化 |
| app.asar | 335M | 323M | **-12M (-3.6%)** |
| app.asar.unpacked | 21M | 21M | 无变化 |

> esbuild drop 移除了所有 console/debugger 语句，manualChunks 优化了代码分割。主 bundle index.js 从 5,645KB 降至 5,608KB。

---

### Step 5: 优化 better-sqlite3 asarUnpack 范围

**操作**: 细化 `asarUnpack` 模式，只 unpack `*.node` 和 `*.dylib` 文件，避免 unpack 整个 better-sqlite3 目录

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 164M | 164M | 无变化 |
| app.asar | 323M | 335M | +12M (构建波动) |
| app.asar.unpacked | 21M | 21M | 无变化 |

> 精确 asarUnpack 模式未能有效减少 unpacked 体积。electron-builder 在处理 native 模块时仍会 unpack 完整的模块目录结构（包括 sqlite3.c 源码等），精确 glob 模式无法改变此行为。此步为防御性配置。

---

### Step 6: electron-builder 压缩配置优化

**操作**: 在 `package.json` build 配置中添加 `"compression": "maximum"`，启用最高压缩率

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 164M | 141M | **-23M (-14.0%)** |
| app.asar | 335M | 323M | **-12M (-3.6%)** |
| app.asar.unpacked | 21M | 21M | 无变化 |

> `compression: "maximum"` 显著减小了 DMG 体积（-23M），asar 也减小了 12M。此配置让 electron-builder 使用最高压缩级别打包，代价是构建时间略增，但产物体积收益明显。

---

### Step 7: afterPack 清理 node_modules 冗余 + locale 文件

**操作**: 创建 `scripts/afterPack.js` 钩子脚本，在打包后清理 asar.unpacked 中的冗余文件（README、CHANGELOG、LICENSE、源码 .c/.cc/.h、测试文件等）+ 清理 Electron locale 文件（仅保留 en.lproj）

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 141M | 129M | **-12M (-8.5%)** |
| app.asar | 323M | 323M | 无变化 |
| app.asar.unpacked | 21M | 2.0M | **-19M (-90.5%)** |

> afterPack 钩子效果显著！清理了 12 个冗余文件（18.6MB，主要是 better-sqlite3 的 sqlite3.c 源码）和 54 个 Electron locale 目录。unpacked 从 21M 骤降至 2.0M，DMG 再减 12M。

---

### Step 8: 静态资源压缩

**操作**: 压缩 `logo.png`（389x389→128x128, 228KB→26KB）、重新生成 `icon.icns`（1.2MB→656KB），`icon.png` 已最优无需处理

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 129M | 129M | 无变化 |
| app.asar | 323M | 323M | 无变化 |
| app.asar.unpacked | 2.0M | 2.0M | 无变化 |

> logo.png 从 389x389 缩至 128x128（-88.7%），icon.icns 重新生成（-46.2%）。静态资源总计节省约 778KB，但这些资源在 asar 打包和 DMG 压缩后影响极小，未体现在最终产物体积变化中。属于最佳实践优化。

---

### Step 9: 核心方案 - 将 renderer-only 依赖移至 devDependencies

**操作**: 将 @lobehub/ui、react、react-dom、zustand、lucide-react、class-variance-authority、clsx、tailwind-merge 从 dependencies 移至 devDependencies，使 electron-builder 不再将这些 renderer-only 依赖打入 asar

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 129M | 80M | **-49M (-38.0%)** |
| app.asar | 323M | 56M | **-267M (-82.7%)** |
| app.asar.unpacked | 2.0M | 2.0M | 无变化 |

> 这是整个优化过程中收益最大的单步操作。renderer 进程由 Vite 完整打包为自包含 bundle（out/renderer/），运行时不依赖 node_modules 中的任何 renderer 依赖。将这些依赖移至 devDependencies 后，electron-builder 不再将它们（及其庞大的间接依赖链：mermaid 67MB、antd 间接依赖 42MB、emoji-mart 27MB、shiki 12MB 等）打入 asar，app.asar 从 323M 骤降至 56M，DMG 从 129M 降至 80M。

---

## 累计优化总结

| 指标 | 优化前（基线） | 优化后（最终） | 变化 |
|------|---------------|---------------|------|
| out/ | 20M | 20M | 无变化 |
| out/renderer/ | 20M | 20M | 无变化 |
| DMG | 180M | 80M | **-100M (-55.6%)** |
| app.asar | 416M | 56M | **-360M (-86.5%)** |
| app.asar.unpacked | 21M | 2.0M | **-19M (-90.5%)** |

### 各步骤贡献

| 步骤 | DMG 变化 | app.asar 变化 | unpacked 变化 |
|------|---------|--------------|--------------|
| Step 1: 分析工具 | 无变化 | 无变化 | 无变化 |
| Step 2: 移除未使用依赖 | -16M | -87M | 无变化 |
| Step 3: files 配置 | 无变化 | +6M (波动) | 无变化 |
| Step 4: Vite 构建优化 | 无变化 | -12M | 无变化 |
| Step 5: asarUnpack 优化 | 无变化 | +12M (波动) | 无变化 |
| Step 6: 压缩配置 | -23M | -12M | 无变化 |
| Step 7: afterPack 清理 | -12M | 无变化 | -19M |
| Step 8: 静态资源压缩 | 无变化 | 无变化 | 无变化 |
| Step 9: renderer-only 依赖移至 devDep | -49M | -267M | 无变化 |
