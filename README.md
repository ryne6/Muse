# Muse

<div align="center">

**AI-Powered Desktop Coding Assistant**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Claude](https://img.shields.io/badge/Claude-5A67D8?style=flat&logoColor=white)](https://anthropic.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)](https://openai.com)

A modern desktop application that brings the power of AI to your coding workflow.

[Features](#features) • [Getting Started](#getting-started) • [Documentation](#documentation) • [Tech Stack](#tech-stack)

</div>

---

## ✨ Features

### 🤖 **Dual AI Engine**
- **Claude Integration** (Sonnet 4.5, Opus, Haiku)
- **OpenAI Integration** (GPT-4, GPT-3.5)
- Custom model support for any API-compatible service

### 💬 **Conversation Management**
- Unlimited conversations with date grouping
- Real-time streaming responses
- Markdown rendering with code highlighting
- Persistent storage across sessions

### 🛠️ **Tool Calls Visualization**
- See what AI is doing in real-time
- File system operations (read/write/search)
- Beautiful UI cards showing tool execution
- Success/error status indicators

### 📁 **File Explorer**
- Built-in file browser
- Lazy-loading for large projects
- File type icons and syntax highlighting
- Quick navigation and selection

### 🎨 **Modern UI/UX**
- Clean three-column layout
- Dark mode support
- Toast notifications
- Responsive design
- Keyboard shortcuts (coming soon)

### 🔒 **Privacy-First**
- All data stored locally
- No telemetry or tracking
- You control your API keys
- Open source

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **API Key** from [Anthropic](https://console.anthropic.com) or [OpenAI](https://platform.openai.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/muse.git
cd muse

# Install dependencies
npm install

# Start development server
npm run dev
```

### First Time Setup

1. **Launch Muse** - The application will open automatically
2. **Select Workspace** - Choose your project folder
3. **Configure API** - Open Settings and add your API key
4. **Start Chatting** - Create a new conversation and start coding!

---

## 📖 Documentation

### Quick Start Guide

#### 1. Creating Conversations
Click the **"+ New Chat"** button to start a new conversation. Each conversation is automatically saved and grouped by date.

#### 2. Sending Messages
Simply type your message and press **Enter** (or **Shift+Enter** for new lines). The AI will respond with streaming output.

#### 3. Using Tools
Ask the AI to interact with your files:
- "Read the package.json file"
- "Search for all TODO comments"
- "List files in the src directory"

You'll see tool execution cards showing what's happening in real-time.

#### 4. Browsing Files
Use the right sidebar to browse your project files. Click folders to expand them, and files to select them.

### Settings

**AI Provider**
- Choose between Claude or OpenAI
- Configure API key and model
- Set temperature (0-2)
- Optional custom base URL

**Custom Models**
- Add custom model IDs
- Support for fine-tuned models
- Quick select presets

**Workspace**
- Select project directory
- Automatically indexed for file operations

---

## 🏗️ Tech Stack

### Desktop
- **Electron 28** - Cross-platform desktop framework
- **TypeScript** - Type-safe development

### Frontend
- **React 18** - UI library
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - State management
- **Sonner** - Toast notifications

### Backend
- **Hono** - Fast API framework
- **Anthropic SDK** - Claude AI
- **OpenAI SDK** - GPT models
- **Better-SQLite3** - Local database

### UI Components
- **Lucide React** - Icon library
- **React Markdown** - Markdown rendering
- **React Syntax Highlighter** - Code highlighting

---

## 📁 Project Structure

```
muse/
├── src/
│   ├── main/                   # Electron Main Process
│   │   ├── index.ts           # Entry point + IPC handlers
│   │   ├── apiServer.ts       # Hono API server
│   │   └── services/          # File system services
│   ├── preload/               # Preload Script
│   │   └── index.ts           # IPC API exposure
│   ├── renderer/              # React Frontend
│   │   └── src/
│   │       ├── components/    # UI Components
│   │       │   ├── chat/     # Chat interface
│   │       │   ├── explorer/ # File browser
│   │       │   ├── layout/   # Layout components
│   │       │   └── ui/       # Reusable UI
│   │       ├── stores/       # Zustand stores
│   │       ├── services/     # API clients
│   │       └── utils/        # Utilities
│   ├── api/                   # API Layer
│   │   ├── routes/           # API routes
│   │   └── services/         # AI services
│   │       └── ai/
│   │           ├── providers/ # AI provider implementations
│   │           └── tools/     # Tool system
│   └── shared/                # Shared Types
│       ├── types/
│       └── constants/
├── docs/                      # Documentation
└── package.json
```

---

## 🛠️ Development

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server (opens Electron app)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

### Building

```bash
# Build for all platforms
npm run build

# Platform-specific builds
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

---

## 🎯 Roadmap

### ✅ Completed (v0.1.0 - Alpha)
- [x] Multi-conversation management
- [x] Dual AI provider (Claude + OpenAI)
- [x] Tool calls visualization
- [x] File explorer
- [x] Custom model support
- [x] Toast notifications
- [x] Markdown rendering
- [x] Code syntax highlighting

### 🔄 In Progress (v0.2.0 - Beta)
- [ ] File search
- [ ] Keyboard shortcuts
- [ ] Loading states
- [ ] File preview
- [ ] Error boundaries

### 📋 Planned (v0.3.0)
- [ ] Code editor integration
- [ ] Monaco Editor
- [ ] Git integration
- [ ] Terminal integration
- [ ] Multi-modal support (images)

### 🌟 Future
- [ ] Plugin system
- [ ] Theme customization
- [ ] Cloud sync
- [ ] Team collaboration

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [Cursor](https://cursor.sh), [Claude.ai](https://claude.ai), and [LobeChat](https://lobechat.com)
- Built with [Anthropic API](https://anthropic.com) and [OpenAI API](https://openai.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

## 📞 Support

- 📧 Email: support@muse-ai.dev
- 💬 Discord: [Join our community](https://discord.gg/muse)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/muse/issues)

---

<div align="center">

**Built with ❤️ using Claude AI**

[⬆ back to top](#muse)

</div>
