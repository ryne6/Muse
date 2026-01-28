# 文件浏览器设计

## 目标
在应用右侧创建一个文件浏览器，显示工作区的文件树结构，支持文件点击预览和搜索。

## UI 布局

### 整体布局
```
┌──────────┬─────────────────┬──────────┐
│          │                 │          │
│  Conv    │   Chat View     │  File    │
│  List    │                 │ Explorer │
│          │                 │          │
│ (240px)  │    (flex-1)     │ (280px)  │
└──────────┴─────────────────┴──────────┘
```

### 文件浏览器结构
```
┌────────────────────────────────┐
│ 📁 project-name          [🔍] │  <- Header
├────────────────────────────────┤
│ 🔍 Search files...             │  <- Search
├────────────────────────────────┤
│ 📁 src                      ▼  │  <- Folder (expandable)
│   📁 components             ▼  │
│     📄 Button.tsx              │
│     📄 Input.tsx               │
│   📁 utils                  ▶  │  <- Collapsed
│   📄 index.ts                  │
│ 📁 docs                     ▶  │
│ 📄 package.json                │
│ 📄 README.md                   │
└────────────────────────────────┘
```

## 功能需求

### 核心功能
1. **文件树显示**
   - 显示目录和文件
   - 支持展开/折叠目录
   - 显示文件图标（根据扩展名）
   - 嵌套缩进显示层级

2. **文件交互**
   - 点击文件 → 触发预览或在 AI 对话中提及
   - 右键菜单 → 复制路径、在系统中打开等

3. **搜索功能**
   - 实时搜索文件名
   - 高亮匹配结果
   - 过滤显示匹配的文件

4. **文件过滤**
   - 尊重 .gitignore 规则
   - 隐藏 node_modules、.git 等
   - 可配置的过滤规则

### 扩展功能
- 文件排序（名称、类型、修改时间）
- 新建文件/文件夹
- 重命名、删除
- 文件拖拽操作

## 技术实现

### 1. 工作区管理

#### IPC 通信
```typescript
// 主进程 API
window.api.workspace.listFiles(path: string): Promise<FileNode[]>
window.api.workspace.watchFiles(callback): void
window.api.workspace.unwatchFiles(): void
```

#### 文件节点类型
```typescript
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  extension?: string
  size?: number
  modifiedAt?: number
}
```

### 2. 组件结构

```
FileExplorer/
├── FileExplorer.tsx          # 主容器
├── FileTree.tsx              # 文件树
├── FileTreeItem.tsx          # 单个文件/文件夹项
├── FileSearch.tsx            # 搜索框
└── FileIcon.tsx              # 文件图标组件
```

### 3. 状态管理

```typescript
interface FileExplorerStore {
  workspacePath: string | null
  fileTree: FileNode[]
  expandedFolders: Set<string>
  searchQuery: string
  selectedFile: string | null

  loadFileTree: () => Promise<void>
  toggleFolder: (path: string) => void
  setSearchQuery: (query: string) => void
  selectFile: (path: string) => void
}
```

### 4. 文件图标映射

```typescript
const FILE_ICONS = {
  // 语言文件
  '.ts': '🔷',
  '.tsx': '⚛️',
  '.js': '📜',
  '.jsx': '⚛️',
  '.json': '📋',
  '.md': '📝',

  // 配置文件
  'package.json': '📦',
  'tsconfig.json': '🔧',
  '.gitignore': '🙈',

  // 其他
  'directory': '📁',
  'default': '📄',
}
```

### 5. 过滤规则

```typescript
const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.DS_Store',
  '*.log',
]
```

## API 实现

### 主进程 IPC Handler

```typescript
// src/main/ipc/workspace.ts
import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { watch } from 'chokidar'

export function setupWorkspaceHandlers() {
  // 列出文件
  ipcMain.handle('workspace:list-files', async (_, dirPath: string) => {
    const files = await fs.readdir(dirPath, { withFileTypes: true })
    return files.map(file => ({
      name: file.name,
      path: path.join(dirPath, file.name),
      type: file.isDirectory() ? 'directory' : 'file',
      extension: file.isFile() ? path.extname(file.name) : undefined,
    }))
  })

  // 监听文件变化
  ipcMain.on('workspace:watch', (event, dirPath: string) => {
    const watcher = watch(dirPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
    })

    watcher.on('change', () => {
      event.sender.send('workspace:files-changed')
    })
  })
}
```

### Preload API

```typescript
// src/preload/index.ts
export const api = {
  workspace: {
    listFiles: (path: string) =>
      ipcRenderer.invoke('workspace:list-files', path),

    watchFiles: (callback: () => void) => {
      ipcRenderer.on('workspace:files-changed', callback)
    },

    unwatchFiles: () => {
      ipcRenderer.removeAllListeners('workspace:files-changed')
    },
  }
}
```

## 实现优先级

### 高优先级（今日完成）
- [x] FileExplorer 主组件
- [x] FileTree 文件树显示
- [x] FileTreeItem 单项显示
- [x] 展开/折叠功能
- [x] 文件图标
- [x] 基本过滤（忽略 node_modules 等）
- [x] 集成到主布局

### 中优先级（后续优化）
- [ ] 文件搜索
- [ ] 右键菜单
- [ ] 文件监听（实时更新）
- [ ] 性能优化（虚拟滚动）

### 低优先级（未来增强）
- [ ] 文件操作（新建、重命名、删除）
- [ ] 拖拽支持
- [ ] 自定义过滤规则
- [ ] 文件排序

## 用户交互流程

### 场景 1：浏览文件
```
1. 用户选择工作区
2. 文件浏览器自动加载文件树
3. 用户点击文件夹展开
4. 点击文件查看路径/预览
```

### 场景 2：搜索文件
```
1. 在搜索框输入文件名
2. 实时过滤显示匹配文件
3. 高亮匹配部分
4. 点击结果跳转
```

### 场景 3：配合 AI 使用
```
1. 用户在文件浏览器中选择文件
2. 文件路径复制到剪贴板
3. 在对话中提及该文件
4. AI 可以读取该文件进行分析
```

## 样式设计

### 颜色方案
```css
/* 文件夹 */
.folder {
  color: hsl(var(--primary));
}

/* 文件 */
.file {
  color: hsl(var(--foreground));
}

/* 悬停 */
.item:hover {
  background: hsl(var(--accent));
}

/* 选中 */
.item-selected {
  background: hsl(var(--primary) / 0.1);
  border-left: 2px solid hsl(var(--primary));
}
```

### 响应式
- 最小宽度：200px
- 默认宽度：280px
- 可调整宽度（拖拽分隔线）

## 性能考虑

1. **大型项目优化**
   - 懒加载子文件夹
   - 虚拟滚动（react-window）
   - 限制初始展开深度

2. **文件监听**
   - 使用 chokidar 高效监听
   - 防抖更新（避免频繁刷新）
   - 仅监听当前工作区

3. **搜索优化**
   - 防抖搜索输入
   - 索引文件路径
   - 限制搜索结果数量

## 测试场景

1. 空工作区处理
2. 大型项目（>1000 文件）
3. 深层嵌套目录
4. 文件名包含特殊字符
5. 文件实时变化

## 技术栈

- React Hooks (useState, useEffect)
- Lucide React (图标)
- Tailwind CSS (样式)
- Chokidar (文件监听)
- 可选：react-window (虚拟滚动)
