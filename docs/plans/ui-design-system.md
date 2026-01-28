# Muse UI 设计规范

> 状态: **已确定**
> 创建日期: 2026-01-28
> 更新日期: 2026-01-28
> 参考: Lobe Chat

---

## 一、设计理念

### 1.1 目标

- 减少"AI 产品"的刻板印象
- 建立简洁、专业的视觉风格
- 创建可复用的设计规范

### 1.2 设计原则

| 原则 | 说明 | 状态 |
|------|------|------|
| 克制的配色 | 主要黑白灰，减少彩色 | ✅ 深灰主色调 + 蓝色强调 |
| 真实品牌 | 用 Logo 替代 Emoji | ✅ 官方品牌 Logo |
| 简洁消息 | 减少气泡感，更像文档 | ✅ 边框区分样式 |
| 浅色代码块 | 融入整体界面 | ✅ 浅色主题 |
| 清晰层级 | 通过字重和间距区分 | ✅ 统一 8px 圆角 |

---

## 二、配色系统

### 2.1 确定方案

```css
/* 浅色模式 - 新配色 */
--primary: 220 9% 20%;           /* 深灰 #2d3748 - 主色调 */
--primary-foreground: 0 0% 100%; /* 白色 */
--accent: 217 91% 60%;           /* 蓝色 #3b82f6 - 强调色 */
--accent-foreground: 0 0% 100%;  /* 白色 */
--secondary: 240 5% 96%;         /* 浅灰背景 */
--background: 0 0% 100%;         /* 白色背景 */
--foreground: 240 10% 4%;        /* 深色文字 */
--ring: 220 9% 20%;              /* 焦点环 - 深灰 */
```

### 2.2 色彩用途

| 色彩 | 用途 |
|------|------|
| Primary (深灰) | 主要按钮、选中状态、重要元素 |
| Accent (蓝色) | 链接、强调按钮、交互反馈 |
| Secondary (浅灰) | 次要背景、悬停状态 |
| Border | 边框、分隔线 |

---

## 三、消息样式

### 3.1 确定方案: 边框区分

**用户消息:**
- 白色背景 + 细边框
- 右对齐
- `rounded-lg` (8px)

**AI 消息:**
- 无背景色
- 左对齐
- 直接显示内容

### 3.2 CSS 类名

```css
/* 用户消息 */
.user-message {
  @apply rounded-lg px-4 py-3 max-w-[85%]
         border border-border bg-background text-foreground;
}

/* AI 消息 */
.ai-message {
  @apply max-w-[85%] text-foreground;
}
```

---

## 四、圆角规范

### 4.1 确定方案: 统一小圆角

| 组件 | 圆角 | Tailwind |
|------|------|----------|
| 消息气泡 | 8px | `rounded-lg` |
| 卡片 | 8px | `rounded-lg` |
| 按钮 | 6px | `rounded-md` |
| 输入框 | 6px | `rounded-md` |
| 标签/徽章 | 4px | `rounded` |

---

## 五、Provider 图标

### 5.1 确定方案: 官方品牌 Logo

使用各 Provider 的官方 SVG Logo，存放于 `src/renderer/src/assets/providers/`

| Provider | 文件名 | 来源 |
|----------|--------|------|
| Anthropic | `anthropic.svg` | 官网 |
| OpenAI | `openai.svg` | 官网 |
| Google (Gemini) | `google.svg` | 官网 |
| DeepSeek | `deepseek.svg` | 官网 |
| Moonshot | `moonshot.svg` | 官网 |
| OpenRouter | `openrouter.svg` | 官网 |
| 自定义 | `custom.svg` | 通用图标 |

### 5.2 Logo 组件

新建 `src/renderer/src/components/ui/ProviderLogo.tsx`

```tsx
interface ProviderLogoProps {
  provider: string
  size?: number
  className?: string
}
```

---

## 六、代码块样式

### 6.1 确定方案: 浅色主题

- 语法高亮: One Light 或 GitHub Light
- 背景色: `#f6f8fa` (GitHub 风格)
- 边框: `border-border`

### 6.2 代码块容器

```css
.code-block {
  @apply bg-secondary/50 border border-border rounded-lg;
}

.code-block-header {
  @apply flex items-center justify-between px-4 py-2
         border-b border-border text-sm text-muted-foreground;
}
```

### 6.3 功能增强

- 语言标签显示
- 复制按钮
- 可选: 折叠/展开功能

---

## 七、字体规范

### 7.1 字体家族

```css
/* 正文 */
font-family: system-ui, -apple-system, sans-serif;

/* 代码 */
font-family: 'Fira Code', 'SF Mono', monospace;
```

### 7.2 字号层级

| 用途 | 字号 | 字重 |
|------|------|------|
| 标题 H1 | 24px | 600 |
| 标题 H2 | 20px | 600 |
| 标题 H3 | 16px | 600 |
| 正文 | 14px | 400 |
| 辅助文字 | 12px | 400 |
| 代码 | 13px | 400 |

---

## 八、间距规范

### 8.1 基础单位

使用 4px 为基础单位:

| 名称 | 值 | Tailwind |
|------|-----|----------|
| xs | 4px | `p-1` |
| sm | 8px | `p-2` |
| md | 16px | `p-4` |
| lg | 24px | `p-6` |
| xl | 32px | `p-8` |

### 8.2 组件间距

| 场景 | 值 |
|------|-----|
| 消息之间 | 16px |
| 卡片内边距 | 16px |
| 按钮内边距 | 8px 16px |
| 输入框内边距 | 12px |
| 侧边栏项目间距 | 4px |

---

## 九、设计决策总结

| 决策项 | 确定方案 |
|--------|----------|
| 主色调 | 深灰 `#2d3748` |
| Accent 色 | 蓝色 `#3b82f6` |
| 消息样式 | 边框区分 |
| 圆角规范 | 统一 8px |
| Provider 图标 | 官方品牌 Logo |
| 代码块主题 | 浅色 (GitHub Light) |
| 暗色模式 | 暂不实现 |

---

## 十、实施计划

### 10.1 文件修改清单

| 文件 | 改动类型 |
|------|----------|
| `src/renderer/src/index.css` | 修改 CSS 变量 |
| `src/renderer/src/components/chat/MessageItem.tsx` | 重构消息样式 |
| `src/renderer/src/components/chat/MarkdownRenderer.tsx` | 代码块主题 |
| `src/renderer/src/components/chat/ChatInput.tsx` | 简化样式 |
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 简化样式 |
| `src/renderer/src/components/settings/ProviderCard.tsx` | 移除彩色，用 Logo |
| `src/renderer/src/components/layout/Sidebar.tsx` | 背景色调整 |
| `src/renderer/src/components/layout/ConversationItem.tsx` | 选中状态 |
| `src/renderer/src/components/ui/ProviderLogo.tsx` | **新建** |
| `src/renderer/src/assets/providers/*.svg` | **新建** Logo 资源 |

### 10.2 实施顺序

```
Phase 1: 收集品牌 Logo 资源
   ↓
Phase 2: 创建 ProviderLogo 组件
   ↓
Phase 3: 修改 CSS 变量（主题配色）
   ↓
Phase 4: 重构消息气泡样式
   ↓
Phase 5: 重构 Provider 卡片
   ↓
Phase 6: 修改代码块样式
   ↓
Phase 7: 优化输入框和侧边栏
   ↓
Phase 8: 优化 Tool Call 展示
```

### 10.3 验证清单

```bash
npm run dev
```

- [ ] 消息界面简洁，无彩色气泡
- [ ] Provider 卡片显示真实 Logo
- [ ] 代码块使用浅色主题
- [ ] 整体配色克制，以黑白灰为主
- [ ] 侧边栏和输入框样式统一
- [ ] 圆角统一为 8px
- [ ] Accent 色（蓝色）用于链接和强调

---

*设计规范已确定，可开始实施*
