# Muse - AI Desktop Coding Assistant

> A comprehensive guide for Claude and AI assistants working with the Muse codebase

## 📋 Quick Navigation

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Core Concepts](#core-concepts)
- [Development Conventions](#development-conventions)
- [Common Tasks](#common-tasks)
- [Development Workflow](#development-workflow)
- [Important Notes](#important-notes)

---

## Project Overview

**Muse** is an Electron-based AI desktop coding assistant that supports multiple AI providers (Claude, OpenAI, Gemini, DeepSeek, Moonshot, OpenRouter, and custom providers).

### Core Features

- **Multi-Provider Support**: Seamlessly switch between 7+ AI providers
- **Local-First**: All data stored locally in SQLite database
- **Tool Calling**: AI can execute file operations and commands
- **Streaming Responses**: Real-time AI response streaming
- **Workspace Integration**: File explorer and workspace management
- **Conversation Management**: Persistent chat history with search
- **API Key Encryption**: Secure storage using AES-256-CBC

### Tech Stack

**Frontend:**
- React 18 + TypeScript 5.3
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- Radix UI (accessible components)
- Lucide React (icons)

**Backend/Desktop:**
- Electron 28 (cross-platform desktop)
- Hono (lightweight API framework)
- Better-SQLite3 (local database)
- Drizzle ORM (type-safe database)

**AI Integration:**
- Anthropic SDK (Claude)
- OpenAI SDK (GPT models)
- Support for 7+ providers

**Development:**
- 100% TypeScript coverage
- Vitest (testing framework)
- ESLint + Prettier (code quality)

---

## Architecture

Muse uses a **three-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron App                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  Main Process   │  │ Renderer Process │  │ API Layer  │ │
│  │   (Node.js)     │  │     (React)      │  │   (Hono)   │ │
│  ├─────────────────┤  ├──────────────────┤  ├────────────┤ │
│  │ • Database      │  │ • UI Components  │  │ • Routes   │ │
│  │ • IPC Handlers  │  │ • State (Zustand)│  │ • AI Mgmt  │ │
│  │ • File System   │  │ • API Clients    │  │ • Tools    │ │
│  │ • Workspace     │  │ • Rendering      │  │ • Streaming│ │
│  └─────────────────┘  └──────────────────┘  └────────────┘ │
│           ↕                    ↕                    ↕        │
│      [SQLite DB]          [IPC Bridge]         [HTTP API]   │
└─────────────────────────────────────────────────────────────┘
```

### Main Process (Node.js)

**Location**: `src/main/`

**Responsibilities:**
- Database operations (SQLite + Drizzle ORM)
- IPC communication handlers
- File system operations
- Workspace management
- Window lifecycle management
- API server initialization

**Key Files:**
- `index.ts` - Entry point, IPC handlers, window management
- `apiServer.ts` - Hono server setup
- `ipcBridge.ts` - IPC API exposure
- `db/` - Database schema and services

### Renderer Process (React)

**Location**: `src/renderer/src/`

**Responsibilities:**
- User interface rendering
- User interactions
- State management (Zustand)
- API communication
- Real-time updates

**Key Files:**
- `App.tsx` - Root component
- `components/` - UI components
- `stores/` - Zustand state stores
- `services/` - API client services

### API Layer (Hono)

**Location**: `src/api/`

**Responsibilities:**
- HTTP API endpoints
- AI provider management
- Streaming response handling
- Tool execution
- Request validation

**Key Files:**
- `index.ts` - Hono app setup
- `routes/chat.ts` - Chat endpoints
- `services/ai/` - AI provider implementations

### IPC Communication

**Preload Script** (`src/preload/index.ts`):
- Exposes safe IPC API to renderer
- Security boundary between main and renderer
- Type-safe communication

**Communication Flow:**
```
Renderer → window.api.* → IPC → Main Process → Response
```

---

## Directory Structure

```
Muse/
├── src/
│   ├── main/                          # Electron Main Process
│   │   ├── index.ts                   # Entry point + IPC handlers
│   │   ├── apiServer.ts               # Hono server setup
│   │   ├── ipcBridge.ts               # IPC API exposure
│   │   ├── db/
│   │   │   ├── schema.ts              # Drizzle schema (7 tables)
│   │   │   ├── index.ts               # DB initialization
│   │   │   ├── migration.ts           # Data migrations
│   │   │   └── services/              # CRUD services
│   │   │       ├── conversationService.ts
│   │   │       ├── messageService.ts
│   │   │       ├── providerService.ts
│   │   │       ├── modelService.ts
│   │   │       └── settingsService.ts
│   │   └── services/                  # File system operations
│   │
│   ├── preload/                       # Preload script (security)
│   │   └── index.ts                   # IPC API exposure
│   │
│   ├── renderer/                      # React Frontend
│   │   └── src/
│   │       ├── App.tsx                # Root component
│   │       ├── components/
│   │       │   ├── chat/              # Chat UI components
│   │       │   ├── settings/          # Provider/model management
│   │       │   ├── layout/            # Main layout components
│   │       │   ├── explorer/          # File browser
│   │       │   └── ui/                # Reusable UI components
│   │       ├── stores/                # Zustand stores (V2 versions)
│   │       ├── services/              # API clients
│   │       ├── types/                 # Frontend types
│   │       └── utils/                 # Utilities
│   │
│   ├── api/                           # Hono API Layer
│   │   ├── index.ts                   # Main app setup
│   │   ├── server.ts                  # Server startup
│   │   ├── routes/                    # API routes
│   │   │   └── chat.ts                # Chat endpoints
│   │   └── services/
│   │       └── ai/
│   │           ├── factory.ts         # Provider factory pattern
│   │           ├── manager.ts         # AI orchestration
│   │           ├── validator.ts       # Config validation
│   │           ├── providers/         # Provider implementations
│   │           │   ├── base.ts        # Abstract base class
│   │           │   ├── claude.ts
│   │           │   ├── openai.ts
│   │           │   ├── gemini.ts
│   │           │   ├── deepseek.ts
│   │           │   └── generic.ts
│   │           └── tools/
│   │               ├── definitions.ts # Tool schemas
│   │               └── executor.ts    # Tool execution
│   │
│   └── shared/                        # Shared types
│       ├── types/
│       │   ├── ai.ts                  # AI interfaces
│       │   ├── conversation.ts        # Chat types
│       │   ├── db.ts                  # Database types
│       │   ├── ipc.ts                 # IPC types
│       │   └── config.ts              # Config types
│       └── constants/
│
├── tests/                             # Test files
│   ├── setup/                         # Test configuration
│   ├── fixtures/                      # Test data
│   └── mocks/                         # Mock implementations
│
├── docs/                              # 40+ design documents
├── drizzle/                           # DB migrations
└── package.json                       # Dependencies
```

### Key File Locations

| Purpose | Location |
|---------|----------|
| Database schema | `src/main/db/schema.ts` |
| Database services | `src/main/db/services/*.ts` |
| IPC handlers | `src/main/index.ts` |
| AI providers | `src/api/services/ai/providers/*.ts` |
| Chat UI | `src/renderer/src/components/chat/*.tsx` |
| State stores | `src/renderer/src/stores/*.ts` |
| Shared types | `src/shared/types/*.ts` |

---

## Core Concepts

### 1. AI Provider System

**Factory Pattern** (`src/api/services/ai/factory.ts`):
```typescript
// Create provider instance based on config
const provider = AIProviderFactory.createProvider(providerConfig)
```

**Base Class** (`src/api/services/ai/providers/base.ts`):
- All providers extend `BaseAIProvider`
- Implements common functionality
- Abstract methods: `chat()`, `validateConfig()`

**Adding a New Provider:**
1. Create file in `src/api/services/ai/providers/`
2. Extend `BaseAIProvider`
3. Implement required methods
4. Register in factory

**Example:**
```typescript
export class MyProvider extends BaseAIProvider {
  async chat(messages, options) {
    // Implementation
  }

  async validateConfig(config) {
    // Validation
  }
}
```

### 2. Database Architecture

**Schema** (`src/main/db/schema.ts`):

7 tables with relationships:
- `providers` - AI provider configurations (API keys encrypted)
- `models` - Available models per provider
- `conversations` - Chat conversations
- `messages` - Chat messages
- `toolCalls` - Tool invocations
- `toolResults` - Tool execution results
- `settings` - App settings

**Cascade Deletes:**
- Provider → Models
- Conversation → Messages → Tool Calls → Tool Results

**Encryption:**
- API keys encrypted with AES-256-CBC
- Format: `iv:encrypted`
- Handled in `providerService.ts`

**Services Pattern:**
```typescript
// CRUD operations abstracted
await ConversationService.create({ title: 'New Chat' })
await MessageService.getByConversationId(convId)
```

### 3. State Management (Zustand)

**V2 Pattern:**
- Newer stores use "V2" suffix
- Example: `conversationStoreV2.ts`, `settingsStoreV2.ts`
- Indicates refactored/improved version

**Store Structure:**
```typescript
export const useStore = create<State>()(
  persist(
    (set, get) => ({
      // State
      data: [],

      // Actions
      loadData: async () => {
        const data = await fetchData()
        set({ data })
      }
    }),
    { name: 'store-name' }
  )
)
```

**Key Stores:**
- `chatStore.ts` - Chat state and message sending
- `conversationStoreV2.ts` - Conversation management
- `settingsStoreV2.ts` - Provider/model settings

### 4. IPC Communication

**Preload Script** (`src/preload/index.ts`):
```typescript
// Exposes safe API to renderer
contextBridge.exposeInMainWorld('api', {
  workspace: {
    get: () => ipcRenderer.invoke('workspace:get'),
    select: () => ipcRenderer.invoke('workspace:select')
  },
  fs: {
    listFiles: (path) => ipcRenderer.invoke('fs:list-files', path)
  }
})
```

**Main Process Handlers** (`src/main/index.ts`):
```typescript
ipcMain.handle('workspace:get', async () => {
  return workspaceService.getCurrentWorkspace()
})
```

**Renderer Usage:**
```typescript
const workspace = await window.api.workspace.get()
```

**Security:**
- Preload script is the only bridge
- No direct Node.js access in renderer
- Type-safe communication via `src/shared/types/ipc.ts`

### 5. Tool Calling System

**Tool Definitions** (`src/api/services/ai/tools/definitions.ts`):
```typescript
export const tools = [
  {
    name: 'read_file',
    description: 'Read file contents',
    input_schema: { /* JSON schema */ }
  }
]
```

**Tool Executor** (`src/api/services/ai/tools/executor.ts`):
- Executes tool calls from AI
- Handles file operations
- Executes commands
- Returns results to AI

**Flow:**
```
AI Request → Tool Call → Executor → IPC → Main Process → Result → AI
```

---

## Development Conventions

### Naming Conventions

**Files:**
- Components: PascalCase (`ChatView.tsx`, `ModelSelector.tsx`)
- Utilities: camelCase (`formatDate.ts`, `validateConfig.ts`)
- Types: PascalCase (`types/Conversation.ts`)

**Code:**
- Functions: camelCase (`handleSubmit`, `fetchData`)
- Classes: PascalCase (`BaseAIProvider`, `ConversationService`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)
- Interfaces/Types: PascalCase (`AIProvider`, `ChatMessage`)

### Code Organization

**V2 Pattern:**
- Newer implementations use "V2" suffix
- Indicates refactored/improved version
- Examples: `conversationStoreV2.ts`, `settingsStoreV2.ts`
- Use V2 versions for new features

**Service Layer:**
- Database operations in service classes
- Pattern: `{Entity}Service.{operation}()`
- Example: `ConversationService.create()`, `MessageService.getById()`

**Factory Pattern:**
- AI providers managed via `AIProviderFactory`
- Centralized provider instantiation
- Easy to add new providers

### TypeScript

**Type Safety:**
- 100% TypeScript coverage
- Strict mode enabled
- No `any` types (use `unknown` if needed)

**Shared Types:**
- Common types in `src/shared/types/`
- Separate files per domain (ai, conversation, db, ipc)
- Import from shared types, not duplicating

**Type Imports:**
```typescript
import type { Conversation } from '@shared/types/conversation'
```

### Testing

**Test Location:**
- Colocated with source in `__tests__/` directories
- Example: `src/main/db/services/__tests__/conversationService.test.ts`

**Test Naming:**
- Files: `*.test.ts` or `*.test.tsx`
- Describe blocks: Entity or feature name
- Test cases: "should [expected behavior]"

**Test Pattern:**
```typescript
describe('ConversationService', () => {
  beforeEach(() => {
    // Setup
  })

  it('should create a new conversation', async () => {
    // Test
  })
})
```

---

## Common Tasks

### Adding a New AI Provider

1. **Create provider file** in `src/api/services/ai/providers/`:
```typescript
// src/api/services/ai/providers/myprovider.ts
import { BaseAIProvider } from './base'

export class MyProvider extends BaseAIProvider {
  async chat(messages, options) {
    // Implement streaming chat
  }

  async validateConfig(config) {
    // Validate API key and settings
  }
}
```

2. **Register in factory** (`src/api/services/ai/factory.ts`):
```typescript
case 'myprovider':
  return new MyProvider(config)
```

3. **Add to provider types** (`src/shared/types/ai.ts`):
```typescript
export type ProviderType = 'claude' | 'openai' | 'myprovider'
```

### Adding a UI Component

1. **Create component file** in appropriate directory:
```typescript
// src/renderer/src/components/chat/MyComponent.tsx
export function MyComponent() {
  return <div>My Component</div>
}
```

2. **Use Tailwind for styling**:
```typescript
<div className="flex items-center gap-2 p-4">
```

3. **Import and use** in parent component:
```typescript
import { MyComponent } from './MyComponent'
```

### Adding a Database Table

1. **Define schema** in `src/main/db/schema.ts`:
```typescript
export const myTable = sqliteTable('my_table', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull()
})
```

2. **Create service** in `src/main/db/services/`:
```typescript
export class MyTableService {
  static async create(data) {
    return db.insert(myTable).values(data)
  }
}
```

3. **Run migration** (if needed):
```bash
npm run db:generate
npm run db:migrate
```

### Adding an IPC Handler

1. **Add handler** in `src/main/index.ts`:
```typescript
ipcMain.handle('my-action', async (event, arg) => {
  return await performAction(arg)
})
```

2. **Expose in preload** (`src/preload/index.ts`):
```typescript
myAction: (arg) => ipcRenderer.invoke('my-action', arg)
```

3. **Use in renderer**:
```typescript
const result = await window.api.myAction(arg)
```

---

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Start development mode (hot reload)
npm run dev

# Run tests
npm run test

# Run specific test suite
npm run test:main      # Main process tests
npm run test:renderer  # Renderer tests
npm run test:api       # API tests
```

### Building

```bash
# Build for production
npm run build

# Build specific platform
npm run build:mac
npm run build:win
npm run build:linux
```

### Debugging

**Main Process:**
- Use VS Code debugger
- Attach to Electron main process
- Breakpoints work in `src/main/`

**Renderer Process:**
- Open DevTools: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
- React DevTools available
- Console logs visible

**Database:**
- SQLite file: `~/.muse/muse.db`
- Use DB Browser for SQLite to inspect

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build for production |
| `npm run test` | Run all tests |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

---

## Important Notes

### V2 Pattern Usage

**When to use V2:**
- Always use V2 versions for new features
- V2 indicates refactored/improved implementation
- Examples: `conversationStoreV2.ts`, `settingsStoreV2.ts`

**Migration:**
- Old versions kept for backward compatibility
- Gradually migrate features to V2
- Don't mix V1 and V2 in same feature

### API Key Encryption

**How it works:**
- API keys encrypted with AES-256-CBC
- Encryption key derived from machine ID
- Format: `iv:encrypted` (16-byte IV + encrypted content)

**Implementation:**
- Handled in `providerService.ts`
- Automatic encryption on create/update
- Automatic decryption on read

**Security:**
- Keys never stored in plain text
- Encryption key unique per machine
- No keys transmitted over network

### Database Migrations

**When needed:**
- Schema changes (new tables, columns)
- Data transformations
- Index additions

**Process:**
```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

**Important:**
- Always backup database before migration
- Test migrations on development data first
- Migrations are one-way (no automatic rollback)

### IPC Security

**Best Practices:**
- Never expose Node.js APIs directly to renderer
- Always validate input in main process
- Use type-safe IPC definitions
- Limit exposed APIs to minimum needed

**Example:**
```typescript
// ❌ Bad: Direct Node.js access
contextBridge.exposeInMainWorld('fs', require('fs'))

// ✅ Good: Controlled API
contextBridge.exposeInMainWorld('api', {
  readFile: (path) => ipcRenderer.invoke('fs:read', path)
})
```

### Common Gotchas

1. **Async State Updates:**
   - Zustand updates are synchronous
   - Wrap async operations properly
   - Use `await` before accessing updated state

2. **IPC Type Safety:**
   - Define types in `src/shared/types/ipc.ts`
   - Use same types in main and renderer
   - TypeScript will catch mismatches

3. **Database Timestamps:**
   - Stored as Unix epoch integers
   - Convert to Date objects when needed
   - Use `Date.now()` for current timestamp

4. **Tool Execution:**
   - Tools run in main process context
   - Have full file system access
   - Validate all tool inputs

5. **Provider Configuration:**
   - Validate configs before saving
   - Test API keys with validation endpoint
   - Handle network errors gracefully

### Performance Tips

- Use React.memo for expensive components
- Lazy load large components
- Debounce user input handlers
- Use virtual scrolling for long lists
- Cache API responses when appropriate

---

## Quick Reference

**Start Development:**
```bash
npm run dev
```

**Run Tests:**
```bash
npm run test
```

**Add AI Provider:**
1. Create in `src/api/services/ai/providers/`
2. Extend `BaseAIProvider`
3. Register in factory

**Add UI Component:**
1. Create in `src/renderer/src/components/`
2. Use Tailwind CSS
3. Import and use

**Add Database Table:**
1. Define in `src/main/db/schema.ts`
2. Create service in `src/main/db/services/`
3. Run migration

**Debug:**
- Main: VS Code debugger
- Renderer: DevTools (Cmd+Option+I)
- Database: `~/.muse/muse.db`

---

**Last Updated:** 2026-01-27
**Version:** 0.1.0-beta
