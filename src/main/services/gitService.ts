import { exec } from 'child_process'
import { promisify } from 'util'
import type { CommandResult } from '../../shared/types/ipc'

const execAsync = promisify(exec)
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Git command failed'

export class GitService {
  private getCwd(path?: string): string {
    return path || process.cwd()
  }

  private async run(command: string, cwd: string): Promise<CommandResult> {
    try {
      const result = await execAsync(command, {
        cwd,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      })
      const stdout = typeof result === 'string' ? result : result.stdout
      const stderr = typeof result === 'string' ? '' : result.stderr
      return {
        output: stdout,
        error: stderr || undefined,
      }
    } catch (error: unknown) {
      return {
        output: '',
        error: getErrorMessage(error),
      }
    }
  }

  private quote(value: string): string {
    return `"${value.replace(/"/g, '\\"')}"`
  }

  async status(path?: string): Promise<CommandResult> {
    return this.run('git status', this.getCwd(path))
  }

  async diff(
    path?: string,
    staged?: boolean,
    file?: string
  ): Promise<CommandResult> {
    let command = 'git diff'
    if (staged) command += ' --staged'
    if (file) command += ` -- ${this.quote(file)}`
    return this.run(command, this.getCwd(path))
  }

  async log(path?: string, maxCount?: number): Promise<CommandResult> {
    let command = 'git log'
    if (maxCount) command += ` -n ${maxCount}`
    return this.run(command, this.getCwd(path))
  }

  async commit(
    path: string | undefined,
    message: string,
    files?: string[]
  ): Promise<CommandResult> {
    const cwd = this.getCwd(path)

    if (files && files.length > 0) {
      const quotedFiles = files.map(file => this.quote(file)).join(' ')
      const addResult = await this.run(`git add -- ${quotedFiles}`, cwd)
      if (addResult.error) {
        return addResult
      }
    }

    return this.run(`git commit -m ${this.quote(message)}`, cwd)
  }

  async push(
    path?: string,
    remote = 'origin',
    branch?: string
  ): Promise<CommandResult> {
    let command = `git push ${remote}`
    if (branch) command += ` ${branch}`
    return this.run(command, this.getCwd(path))
  }

  async checkout(
    path: string | undefined,
    branch: string,
    create?: boolean
  ): Promise<CommandResult> {
    const command = create
      ? `git checkout -b ${branch}`
      : `git checkout ${branch}`
    return this.run(command, this.getCwd(path))
  }
}
