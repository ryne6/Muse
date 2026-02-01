# Muse

<div align="center">

**AI-Powered Desktop Coding Assistant**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white)](https://www.electronjs.org/)

A modern desktop application that brings the power of AI to your coding workflow.

</div>

---

## Features

### Multi-Provider AI Support
- **Claude** (Sonnet, Opus, Haiku)
- **OpenAI** (GPT-4, GPT-3.5)
- **Gemini**, **DeepSeek**, **Moonshot**, **OpenRouter**
- Custom provider support for any API-compatible service

### Tool Calling
- File system operations (read/write/search)
- Git operations (status, diff, log, commit, push)
- Web fetch and search
- Real-time tool execution visualization

### Conversation Management
- Unlimited conversations with date grouping
- Real-time streaming responses
- Markdown rendering with code highlighting
- Persistent local storage

### Privacy-First
- All data stored locally in SQLite
- API keys encrypted with AES-256
- No telemetry or tracking

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- API Key from your preferred provider

### Installation

```bash
# Clone the repository
git clone https://github.com/ryne6/Muse.git
cd Muse

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
npm run package:mac     # macOS
npm run package:win     # Windows
npm run package:linux   # Linux
```

### macOS Installation Note

If you see "Muse is damaged and can't be opened", run:

```bash
sudo xattr -rd com.apple.quarantine /Applications/Muse.app
```

---

## Tech Stack

- **Electron 28** - Desktop framework
- **React 18** + **TypeScript** - Frontend
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Hono** - API framework
- **Better-SQLite3** + **Drizzle ORM** - Database
- **Anthropic SDK** / **OpenAI SDK** - AI providers

---

## License

MIT License
