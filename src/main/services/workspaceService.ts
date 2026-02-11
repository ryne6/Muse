import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'

const MUSE_HOME = join(homedir(), '.Muse')
const WORKSPACES_DIR = join(MUSE_HOME, 'workspaces')

export class WorkspaceService {
  /**
   * 确保 workspaces 根目录存在
   */
  static ensureWorkspacesDir(): void {
    if (!existsSync(WORKSPACES_DIR)) {
      mkdirSync(WORKSPACES_DIR, { recursive: true })
    }
  }

  /**
   * 为对话创建默认工作区目录
   */
  static createDefaultWorkspace(conversationId: string): string {
    this.ensureWorkspacesDir()
    const workspacePath = join(WORKSPACES_DIR, conversationId)
    if (!existsSync(workspacePath)) {
      mkdirSync(workspacePath, { recursive: true })
    }
    return workspacePath
  }

  /**
   * 检查路径是否为 Muse 管理的工作区
   */
  static isManagedWorkspace(path: string): boolean {
    return resolve(path).startsWith(WORKSPACES_DIR)
  }

  /**
   * 清理对话关联的工作区目录
   */
  static cleanupWorkspace(
    workspacePath: string
  ): { deleted: boolean; reason: string } {
    if (!this.isManagedWorkspace(workspacePath)) {
      return { deleted: false, reason: 'not_managed' }
    }
    if (!existsSync(workspacePath)) {
      return { deleted: false, reason: 'not_found' }
    }
    const entries = readdirSync(workspacePath)
    if (entries.length === 0) {
      rmdirSync(workspacePath)
      return { deleted: true, reason: 'empty' }
    }
    // 非空目录不自动删除
    return { deleted: false, reason: 'not_empty' }
  }

  /**
   * 扫描孤立工作区目录
   */
  static getOrphanedWorkspaces(
    activeConversationIds: string[]
  ): Array<{ path: string; id: string; isEmpty: boolean }> {
    this.ensureWorkspacesDir()
    const activeSet = new Set(activeConversationIds)
    const entries = readdirSync(WORKSPACES_DIR, { withFileTypes: true })
    const orphans: Array<{ path: string; id: string; isEmpty: boolean }> = []

    for (const entry of entries) {
      if (entry.isDirectory() && !activeSet.has(entry.name)) {
        const fullPath = join(WORKSPACES_DIR, entry.name)
        const contents = readdirSync(fullPath)
        orphans.push({
          path: fullPath,
          id: entry.name,
          isEmpty: contents.length === 0,
        })
      }
    }
    return orphans
  }

  /**
   * 删除指定工作区目录（递归）
   */
  static forceDeleteWorkspace(workspacePath: string): boolean {
    if (!this.isManagedWorkspace(workspacePath)) return false
    if (!existsSync(workspacePath)) return false
    rmSync(workspacePath, { recursive: true, force: true })
    return true
  }
}
