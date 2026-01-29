# shadcn → Lobe UI 迁移计划

> **状态**: 待实施
> **创建日期**: 2026-01-29
> **目标**: 全量替换 shadcn 组件为 Lobe UI，并实现暗色模式

---

## 一、迁移概述

### 1.1 当前状态

**shadcn 组件（4个）：**
- `Button` - @radix-ui/react-slot + CVA
- `Input` - 纯 Tailwind
- `Dialog` - @radix-ui/react-dialog
- `DropdownMenu` - @radix-ui/react-dropdown-menu

**自定义组件（可增强）：**
- `MarkdownRenderer` - react-markdown + react-syntax-highlighter
- `Loading` - lucide-react Loader2
- 复制功能 - react-copy-to-clipboard

### 1.2 迁移目标

| 类别 | 内容 |
|------|------|
| 基础组件替换 | Button, Input, Modal, Dropdown |
| 增强组件引入 | Markdown, Highlighter, CopyButton, Avatar |
| 主题系统 | ThemeProvider + 暗色模式支持 |
| 清理工作 | 移除 Radix 依赖和 shadcn 文件 |

---

## 二、依赖变更

### 2.1 新增依赖

```bash
npm install @lobehub/ui antd antd-style
```

### 2.2 移除依赖

```bash
npm uninstall @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slot class-variance-authority
```

### 2.3 可移除依赖（被 Lobe UI 替代）

```bash
npm uninstall react-syntax-highlighter @types/react-syntax-highlighter react-copy-to-clipboard @types/react-copy-to-clipboard
```

---

## 三、组件映射

### 3.1 基础组件

| shadcn | Lobe UI | API 变化 |
|--------|---------|----------|
| `Button` | `Button` | variant: `default`→`filled`, `outline`→`outlined` |
| `Input` | `Input` | 兼容，支持 `className` |
| `Dialog` | `Modal` | `open`→`open`, 需要 `onCancel` |
| `DropdownMenu` | `Dropdown` | 使用 `menu` prop 配置项 |

### 3.2 组件使用位置清单

#### Button (17 处)

| 文件 | 模块 |
|------|------|
| `components/chat/ChatInput.tsx` | Chat |
| `components/chat/ImagePreview.tsx` | Chat |
| `components/chat/ImageUploadButton.tsx` | Chat |
| `components/chat/ModelSelector.tsx` | Chat |
| `components/chat/TemperatureControl.tsx` | Chat |
| `components/explorer/FileExplorer.tsx` | Explorer |
| `components/layout/ConversationItem.tsx` | Layout |
| `components/layout/ConversationList.tsx` | Layout |
| `components/layout/SearchBar.tsx` | Layout |
| `components/layout/Settings.tsx` | Layout |
| `components/layout/SettingsV2.tsx` | Layout |
| `components/layout/WorkspaceSelector.tsx` | Layout |
| `components/settings/AddProviderDialog.tsx` | Settings |
| `components/settings/ManageModelsDialog.tsx` | Settings |
| `components/settings/ProviderCard.tsx` | Settings |
| `components/settings/ProviderCardV2.tsx` | Settings |
| `components/settings/ProviderConfigDialog.tsx` | Settings |

#### Input (1 处)

| 文件 | 模块 |
|------|------|
| `components/layout/SearchBar.tsx` | Layout |

#### Dialog (3 处)

| 文件 | 模块 |
|------|------|
| `components/settings/AddProviderDialog.tsx` | Settings |
| `components/settings/ManageModelsDialog.tsx` | Settings |
| `components/settings/ProviderConfigDialog.tsx` | Settings |

#### DropdownMenu (4 处)

| 文件 | 模块 |
|------|------|
| `components/chat/ModelSelector.tsx` | Chat |
| `components/chat/TemperatureControl.tsx` | Chat |
| `components/layout/ConversationItem.tsx` | Layout |
| `components/settings/ProviderCard.tsx` | Settings |

### 3.2 增强组件

| 当前实现 | Lobe UI | 收益 |
|----------|---------|------|
| `MarkdownRenderer` | `Markdown` | 内置代码高亮、LaTeX、Mermaid |
| `react-syntax-highlighter` | `Highlighter` | 更好的主题支持 |
| `react-copy-to-clipboard` | `CopyButton` | 统一设计语言 |
| 自定义 Avatar | `Avatar` | 支持多种形状和状态 |

---

## 四、实施任务

### Phase 1: 环境配置

**Task 1.1: 安装依赖**
- 安装 @lobehub/ui, antd, antd-style
- 验证安装成功

**Task 1.2: 配置 Provider**
- 在 App.tsx 添加 ThemeProvider
- 配置 ConfigProvider
- 设置默认主题 token

**Task 1.3: Tailwind 兼容配置**
- 确保 Tailwind 与 antd-style 共存
- 调整 CSS 优先级（如需要）

---

### Phase 2: 基础组件替换

**Task 2.1: Button 替换**
- 文件: `src/renderer/src/components/ui/button.tsx`
- 创建 Lobe Button 包装器
- 更新所有 Button 引用

**Task 2.2: Input 替换**
- 文件: `src/renderer/src/components/ui/input.tsx`
- 替换为 Lobe Input
- 保持 className 兼容

**Task 2.3: Dialog → Modal 替换**
- 文件: `src/renderer/src/components/ui/dialog.tsx`
- 创建 Modal 包装器（保持 API 兼容）
- 更新所有 Dialog 使用处

**Task 2.4: DropdownMenu → Dropdown 替换**
- 文件: `src/renderer/src/components/ui/dropdown-menu.tsx`
- 适配 Lobe Dropdown API
- 更新所有 DropdownMenu 使用处

---

### Phase 3: 增强组件迁移

**Task 3.1: MarkdownRenderer → Markdown**
- 文件: `src/renderer/src/components/chat/MarkdownRenderer.tsx`
- 替换为 Lobe Markdown 组件
- 配置代码高亮主题
- 保持自定义渲染逻辑

**Task 3.2: 代码高亮迁移**
- 移除 react-syntax-highlighter
- 使用 Lobe Highlighter
- 配置浅色/深色主题

**Task 3.3: CopyButton 集成**
- 替换 react-copy-to-clipboard
- 使用 Lobe CopyButton
- 更新代码块复制功能

**Task 3.4: Avatar 组件**
- 评估是否需要替换现有头像实现
- 如需要，使用 Lobe Avatar

---

### Phase 4: 主题系统

**Task 4.1: 暗色模式实现**
- 配置 ThemeProvider 的 appearance
- 添加主题切换控件（ThemeSwitch）
- 在 Settings 中添加主题选项

**Task 4.2: 主题 Token 统一**
- 将现有 CSS 变量映射到 Lobe 主题 token
- 确保 Tailwind 类使用正确的颜色变量
- 测试浅色/深色模式切换

**Task 4.3: 持久化主题设置**
- 保存用户主题偏好到数据库
- 启动时恢复主题设置

---

### Phase 5: 清理工作

**Task 5.1: 移除 shadcn 文件**
- 删除 `src/renderer/src/components/ui/button.tsx`（如已替换）
- 删除 `src/renderer/src/components/ui/input.tsx`
- 删除 `src/renderer/src/components/ui/dialog.tsx`
- 删除 `src/renderer/src/components/ui/dropdown-menu.tsx`

**Task 5.2: 移除未使用依赖**
- 卸载 Radix UI 包
- 卸载 class-variance-authority
- 卸载被替代的包

**Task 5.3: 更新测试**
- 修复因组件变更导致的测试失败
- 添加新组件的测试覆盖

---

## 五、文件变更清单

### 5.1 新建文件

| 文件 | 用途 |
|------|------|
| `src/renderer/src/providers/ThemeProvider.tsx` | 主题 Provider 配置 |

### 5.2 修改文件

| 文件 | 变更 |
|------|------|
| `src/renderer/src/App.tsx` | 添加 ThemeProvider |
| `src/renderer/src/components/ui/*.tsx` | 替换为 Lobe UI |
| `src/renderer/src/components/chat/MarkdownRenderer.tsx` | 使用 Lobe Markdown |
| `src/renderer/src/components/layout/SettingsV2.tsx` | 添加主题切换 |
| `src/renderer/src/index.css` | 调整 CSS 变量 |
| `package.json` | 依赖变更 |
| `tailwind.config.js` | 可能需要调整 |

### 5.3 删除文件

| 文件 | 原因 |
|------|------|
| `src/renderer/src/components/ui/button.tsx` | 被 Lobe Button 替代 |
| `src/renderer/src/components/ui/input.tsx` | 被 Lobe Input 替代 |
| `src/renderer/src/components/ui/dialog.tsx` | 被 Lobe Modal 替代 |
| `src/renderer/src/components/ui/dropdown-menu.tsx` | 被 Lobe Dropdown 替代 |

---

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| API 不兼容 | 中 | 创建包装器保持接口一致 |
| 样式冲突 | 低 | 调整 CSS 优先级 |
| 包体积增加 | 低 | Tree-shaking + 按需引入 |
| 测试失败 | 中 | 逐步迁移，每步验证 |

---

## 七、验证清单

- [ ] 所有页面正常渲染
- [ ] Button 各 variant 正常显示
- [ ] Modal 打开/关闭正常
- [ ] Dropdown 菜单正常工作
- [ ] Markdown 渲染正确（含代码高亮）
- [ ] 暗色模式切换正常
- [ ] 主题设置持久化
- [ ] 所有测试通过
- [ ] 无控制台错误

---

## 八、实施顺序

```
1. 安装依赖 + 配置 Provider
   ↓
2. Button 替换（影响最广，先验证）
   ↓
3. Input 替换
   ↓
4. Dialog → Modal 替换
   ↓
5. DropdownMenu → Dropdown 替换
   ↓
6. MarkdownRenderer 迁移
   ↓
7. 暗色模式实现
   ↓
8. 清理 + 测试修复
```

---

*计划待确认后开始实施*
