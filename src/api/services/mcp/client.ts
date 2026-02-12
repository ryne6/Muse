import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { shell } from 'electron'
import { exec } from 'child_process'
import type {
  MCPServerConfig,
  MCPTool,
  MCPToolResult,
  MCPServerStatus,
} from './types'

export class MCPClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private _status: MCPServerStatus = 'disconnected'
  private _tools: MCPTool[] = []
  private _error: string | undefined
  private openedUrls: Set<string> = new Set()

  constructor(private config: MCPServerConfig) {}

  get status(): MCPServerStatus {
    return this._status
  }

  get tools(): MCPTool[] {
    return this._tools
  }

  get error(): string | undefined {
    return this._error
  }

  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return
    }

    this._status = 'connecting'
    this._error = undefined

    try {
      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args,
        env: this.config.env,
        stderr: 'pipe',
      })

      // Listen to stderr for OAuth URLs and other output
      if (this.transport.stderr) {
        this.transport.stderr.on('data', (data: Buffer) => {
          const output = data.toString()
          console.log(`[MCP:${this.config.name}] stderr:`, output)
          this.handleStderrOutput(output)
        })
      }

      this.client = new Client(
        { name: 'muse-client', version: '1.0.0' },
        { capabilities: {} }
      )

      this.transport.onerror = error => {
        console.error(`[MCP:${this.config.name}] Transport error:`, error)
        this._error = error.message
        this._status = 'error'
      }

      this.transport.onclose = () => {
        console.log(`[MCP:${this.config.name}] Transport closed`)
        this._status = 'disconnected'
      }

      await this.client.connect(this.transport)
      this._status = 'connected'

      // Discover available tools
      await this.refreshTools()

      console.log(
        `[MCP:${this.config.name}] Connected, ${this._tools.length} tools available`
      )
    } catch (error) {
      this._status = 'error'
      this._error = error instanceof Error ? error.message : String(error)
      console.error(`[MCP:${this.config.name}] Connection failed:`, this._error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this._status === 'disconnected') {
      return
    }

    try {
      await this.transport?.close()
    } catch (error) {
      console.error(`[MCP:${this.config.name}] Disconnect error:`, error)
    } finally {
      this.client = null
      this.transport = null
      this._status = 'disconnected'
      this._tools = []
    }
  }

  async refreshTools(): Promise<MCPTool[]> {
    if (!this.client || this._status !== 'connected') {
      throw new Error('Not connected')
    }

    const result = await this.client.listTools()
    this._tools = result.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object' as const,
        properties: tool.inputSchema.properties as Record<string, unknown>,
        required: tool.inputSchema.required,
      },
      serverName: this.config.name,
    }))

    return this._tools
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    if (!this.client || this._status !== 'connected') {
      throw new Error('Not connected')
    }

    const result = await this.client.callTool({
      name: toolName,
      arguments: args,
    })

    // Convert MCP result to our format
    const content = 'content' in result ? result.content : []
    return {
      content: content.map(item => {
        if (item.type === 'text') {
          return { type: 'text' as const, text: item.text }
        }
        if (item.type === 'image') {
          return {
            type: 'image' as const,
            data: item.data,
            mimeType: item.mimeType,
          }
        }
        return { type: 'resource' as const }
      }),
      isError: 'isError' in result ? result.isError : false,
    }
  }

  private handleStderrOutput(output: string): void {
    // Extract URLs from stderr output
    const urlRegex = /https?:\/\/[^\s"'<>]+/gi
    const matches = output.match(urlRegex)

    if (matches) {
      for (const url of matches) {
        // Clean up URL (remove trailing punctuation)
        const cleanUrl = url.replace(/[.,;:!?)]+$/, '')

        // Skip if already opened
        if (this.openedUrls.has(cleanUrl)) {
          continue
        }

        // Check if it looks like an OAuth/auth URL
        if (this.isAuthUrl(cleanUrl)) {
          console.log(`[MCP:${this.config.name}] Opening auth URL:`, cleanUrl)
          this.openedUrls.add(cleanUrl)
          this.openInBrowser(cleanUrl)
        }
      }
    }
  }

  private isAuthUrl(url: string): boolean {
    const authPatterns = [
      /oauth/i,
      /auth/i,
      /login/i,
      /authorize/i,
      /consent/i,
      /accounts\.google/i,
      /feishu\.cn/i,
      /larksuite\.com/i,
    ]
    return authPatterns.some(pattern => pattern.test(url))
  }

  private openInBrowser(url: string): void {
    try {
      shell.openExternal(url)
    } catch {
      // Fallback: use platform-specific command
      const cmd =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open'
      exec(`${cmd} "${url}"`)
    }
  }
}
