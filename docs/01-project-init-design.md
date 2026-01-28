# 功能设计文档：项目初始化

**功能编号**: F001
**创建日期**: 2026-01-24
**状态**: 实现中

---

## 1. 功能概述

初始化 Muse 项目的基础架构，包括：
- Electron + React + TypeScript + Vite 项目结构
- 开发环境配置（ESLint, Prettier, Tailwind CSS）
- 基础目录结构
- 依赖安装

---

## 2. 技术栈

### 2.1 核心依赖
```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0"
}
```

### 2.2 构建工具
```json
{
  "electron-builder": "^24.13.0",
  "electron-vite": "^2.0.0",
  "@vitejs/plugin-react": "^4.2.0"
}
```

### 2.3 开发工具
```json
{
  "eslint": "^8.56.0",
  "prettier": "^3.2.4",
  "tailwindcss": "^3.4.0"
}
```

---

## 3. 项目结构

```
Muse/
├── src/
│   ├── main/                   # Electron Main Process
│   │   └── index.ts
│   │
│   ├── preload/                # Preload Script
│   │   └── index.ts
│   │
│   ├── renderer/               # React UI
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   └── index.css
│   │   └── index.html
│   │
│   └── shared/                 # 共享代码
│       └── types/
│
├── resources/                  # 资源文件
│   └── icon.png
│
├── docs/                       # 设计文档
│   └── 01-project-init-design.md
│
├── prd/                        # PRD 文档
│
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── electron.vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .eslintrc.js
├── .prettierrc
├── .gitignore
└── README.md
```

---

## 4. 配置文件设计

### 4.1 package.json

**脚本命令**:
```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "typecheck": "tsc --noEmit"
  }
}
```

### 4.2 electron.vite.config.ts

使用 `electron-vite` 统一配置 Main、Preload、Renderer 的构建。

### 4.3 tsconfig.json

分为三个配置：
- `tsconfig.json` - 通用配置
- `tsconfig.node.json` - Main 和 Preload
- `tsconfig.web.json` - Renderer

### 4.4 Tailwind CSS 配置

使用 shadcn/ui 兼容的配置。

---

## 5. 开发环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

---

## 6. 实现步骤

### Step 1: 创建 package.json
- 定义项目元信息
- 声明依赖
- 配置脚本命令

### Step 2: 安装依赖
```bash
npm install
```

### Step 3: 配置 TypeScript
- 创建 tsconfig.json
- 配置路径别名（@/ 指向 src/）

### Step 4: 配置 Electron Vite
- 配置 Main、Preload、Renderer 构建

### Step 5: 配置 Tailwind CSS
- 安装 Tailwind
- 配置 PostCSS
- 设置主题变量

### Step 6: 配置 ESLint + Prettier
- 安装插件
- 配置规则

### Step 7: 创建基础文件
- Main Process 入口
- Preload Script
- React UI 入口
- 基础样式

### Step 8: 测试运行
```bash
npm run dev
```

---

## 7. 验收标准

- [x] `npm run dev` 可以启动应用
- [x] 显示一个空白窗口（标题 "Muse"）
- [x] 无 TypeScript 错误
- [x] 无 ESLint 错误
- [x] 热更新正常工作

---

## 8. 风险与注意事项

**风险**:
- Electron + Vite 配置可能有兼容性问题

**缓解**:
- 使用官方推荐的 `electron-vite`
- 参考官方示例配置

---

## 9. 下一步

完成项目初始化后，下一个功能是：
**F002: 搭建 Chat 界面基础布局**

---

**文档结束**
