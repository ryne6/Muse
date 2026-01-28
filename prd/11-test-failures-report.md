# 测试失败报告

**生成时间**: 2026-01-28
**测试框架**: Vitest v4.0.18

---

## 概览

| 指标 | 数值 |
|------|------|
| 测试文件 | 10 失败 / 26 通过 |
| 测试用例 | 120 失败 / 407 通过 |
| 通过率 | 77.2% |

---

## 失败分类

### 类别 1: 数据库服务测试 (48 failures)

**根因**: 测试环境未正确初始化数据库连接

| 文件 | 失败数 |
|------|--------|
| `conversationService.test.ts` | 14 |
| `providerService.test.ts` | 19 |
| `searchService.test.ts` | 15 |

**修复方向**:
- 检查测试 setup 中的数据库初始化
- 确保使用内存数据库或测试数据库
- 添加 beforeAll/afterAll 钩子

---

### 类别 2: ChatInput 组件测试 (18 failures)

**文件**: `src/renderer/src/components/chat/__tests__/ChatInput.test.tsx`

**失败用例**:
- should render input textarea
- should render send button
- should update input value when typing
- should clear input after sending message
- should disable send button when input is empty
- should disable send button when input contains only whitespace
- should enable send button when input has content
- should disable send button and textarea when loading
- should show error when provider is not selected
- should show error when model is not selected
- should show error when API key is missing
- should send message when pressing Enter
- should insert newline when pressing Shift+Enter
- should not send message when input is empty and Enter is pressed
- should create conversation if none exists when sending message
- should not create conversation if one already exists
- should call sendMessage with correct parameters
- should trim whitespace from message before sending

**根因**:
- 组件结构变更 (pill 结构重构)
- aria-label 变更导致选择器失效
- Mock 配置与实际组件不匹配

**修复方向**:
- 更新测试选择器以匹配新的 DOM 结构
- 使用 `aria-label` 选择器
- 更新 Mock 配置

---

### 类别 3: FileExplorer 组件测试 (3 failures)

**文件**: `src/renderer/src/components/explorer/__tests__/FileExplorer.test.tsx`

**失败用例**:
- should show loading state initially
- should reload file tree when refresh button is clicked
- should disable refresh button while loading

**根因**:
- React 状态更新未包裹在 `act()` 中
- 按钮选择器 `getByRole('button')` 匹配多个元素
- 异步状态更新时序问题

**修复方向**:
- 使用更精确的选择器 (如 `getByRole('button', { name: 'Refresh' })`)
- 包裹异步操作在 `act()` 中
- 使用 `waitFor` 等待状态更新

---

### 类别 4: React act() 警告

**影响文件**:
- `ProviderList.test.tsx`
- `FileExplorer.test.tsx`

**警告内容**:
```
Warning: An update to [Component] inside a test was not wrapped in act(...)
```

**修复方向**:
- 使用 `@testing-library/react` 的 `waitFor`
- 确保所有状态更新在 `act()` 中完成

---

### 类别 5: DOM 嵌套警告

**文件**: `MarkdownRenderer.test.tsx`

**警告内容**:
```
Warning: validateDOMNesting(...): <div> cannot appear as a descendant of <p>
Warning: validateDOMNesting(...): <pre> cannot appear as a descendant of <p>
```

**根因**: CodeBlock 组件在 inline 模式下返回了块级元素

**修复方向**:
- 检查 CodeBlock 的 inline 判断逻辑
- 确保 inline code 返回 `<code>` 而非 `<div>`

---

## 优先级排序

| 优先级 | 类别 | 影响 | 工作量 |
|--------|------|------|--------|
| P0 | 数据库服务测试 | 48 用例 | 中 |
| P1 | ChatInput 测试 | 18 用例 | 中 |
| P2 | FileExplorer 测试 | 3 用例 | 小 |
| P3 | act() 警告 | 代码质量 | 小 |
| P4 | DOM 嵌套警告 | 代码质量 | 小 |

---

## 修复计划

### Phase 1: 数据库测试环境 (P0)

1. 检查 `tests/setup/` 目录的配置
2. 确保测试使用独立的内存数据库
3. 添加正确的 setup/teardown 钩子

### Phase 2: 组件测试更新 (P1-P2)

1. 更新 ChatInput 测试选择器
2. 修复 FileExplorer 异步测试
3. 添加 `act()` 包裹

### Phase 3: 代码质量 (P3-P4)

1. 修复 React act() 警告
2. 修复 DOM 嵌套问题

---

## 附录: 通过的测试文件

- `ProviderList.test.tsx` (12 tests)
- `ConversationList.test.tsx` (13 tests)
- `SettingsV2.test.tsx` (9 tests)
- 其他 23 个测试文件
