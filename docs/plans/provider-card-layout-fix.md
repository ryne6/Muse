# Provider Card 布局修复计划

## 问题分析

1. **冗余元素**：
   - 右上角三点菜单（Configure/Models/Enable/Delete）与底部新加的按钮功能重复
   - 头部 Enabled/Disabled 状态标签与底部 On/Off 按钮功能重复
2. **布局问题**：
   - 3 列网格导致卡片太窄，名称换行
   - URL 和按钮挤在一起

## 修复方案

### 1. 移除冗余元素 (`ProviderCardV2.tsx`)

**移除右上角三点菜单** (第 100-125 行)：
- 删除整个 `<DropdownMenu>` 组件
- 删除未使用的 imports: `MoreVertical, Settings, Trash2, Layers`
- 删除 `DropdownMenu*` 相关 imports

**移除头部状态标签** (第 83-95 行)：
- 删除 `<span>Enabled/Disabled</span>` 元素
- 简化头部结构

**保留底部按钮**：
- Configure 按钮
- Models 按钮
- On/Off 按钮

**新增 Delete 功能**：
- 在底部按钮组左侧添加删除图标按钮（因为三点菜单被移除了）

### 2. 调整网格布局 (`ProviderList.tsx`)

改为最多 2 列：
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
```

### 3. 优化卡片布局 (`ProviderCardV2.tsx`)

- 名称加 `truncate` 防止换行
- URL 单独一行，加 `truncate` 截断

---

## 关键文件

| 文件 | 修改 |
|------|------|
| `src/renderer/src/components/settings/ProviderList.tsx` | 网格改为 2 列 |
| `src/renderer/src/components/settings/ProviderCardV2.tsx` | 移除三点菜单和状态标签，优化布局 |

---

## 验证

1. `npm run dev`
2. 打开 Settings → Providers
3. 检查：
   - 三点菜单已移除
   - Enabled/Disabled 标签已移除
   - 名称不换行
   - URL 正常截断
   - Configure/Models/On-Off 按钮正常工作
   - Delete 功能可用
