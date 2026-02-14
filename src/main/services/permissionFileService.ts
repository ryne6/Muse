// src/main/services/permissionFileService.ts

import fs from 'fs'
import path from 'path'
import os from 'os'
import type {
  PermissionConfig,
  PermissionRule,
} from '~shared/types/toolPermissions'

const GLOBAL_DIR = path.join(os.homedir(), '.muse')
const GLOBAL_FILE = path.join(GLOBAL_DIR, 'permissions.json')
const PROJECT_DIR_NAME = '.muse'
const PROJECT_FILE_NAME = 'permissions.json'

export class PermissionFileService {
  private watchers: fs.FSWatcher[] = []
  private onChangeCallback?: () => void

  /**
   * 加载并合并 global + project 规则
   */
  loadRules(workspacePath?: string): PermissionRule[] {
    const globalRules = this.loadFile(GLOBAL_FILE, 'global')
    const projectRules = workspacePath
      ? this.loadFile(
          path.join(workspacePath, PROJECT_DIR_NAME, PROJECT_FILE_NAME),
          'project'
        )
      : []
    return [...projectRules, ...globalRules]
  }

  /**
   * 添加规则到指定级别的配置文件
   */
  addRule(
    rule: Omit<PermissionRule, 'source'>,
    source: 'project' | 'global',
    workspacePath?: string
  ): void {
    if (source === 'project' && !workspacePath) {
      throw new Error('workspacePath is required for project-level rules')
    }

    const filePath =
      source === 'global'
        ? GLOBAL_FILE
        : path.join(workspacePath!, PROJECT_DIR_NAME, PROJECT_FILE_NAME)

    const config = this.readConfigFile(filePath)
    config.rules.push(rule)
    this.writeConfigFile(filePath, config)
  }

  /**
   * 删除规则
   */
  removeRule(
    ruleId: string,
    source: 'project' | 'global',
    workspacePath?: string
  ): void {
    if (source === 'project' && !workspacePath) {
      throw new Error('workspacePath is required for project-level rules')
    }

    const filePath =
      source === 'global'
        ? GLOBAL_FILE
        : path.join(workspacePath!, PROJECT_DIR_NAME, PROJECT_FILE_NAME)

    const config = this.readConfigFile(filePath)
    config.rules = config.rules.filter(r => r.id !== ruleId)
    this.writeConfigFile(filePath, config)
  }

  /**
   * 监听配置文件变更
   */
  watch(workspacePath: string | undefined, onChange: () => void): void {
    this.stopWatch()
    this.onChangeCallback = onChange

    // Watch global file
    this.watchFile(GLOBAL_FILE)

    // Watch project file
    if (workspacePath) {
      const projectFile = path.join(
        workspacePath,
        PROJECT_DIR_NAME,
        PROJECT_FILE_NAME
      )
      this.watchFile(projectFile)
    }
  }

  stopWatch(): void {
    this.watchers.forEach(w => w.close())
    this.watchers = []
  }

  // --- private helpers ---

  private loadFile(
    filePath: string,
    source: 'project' | 'global'
  ): PermissionRule[] {
    const config = this.readConfigFile(filePath)
    return config.rules.map(r => ({ ...r, source }))
  }

  private readConfigFile(filePath: string): PermissionConfig {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content) as PermissionConfig
      if (parsed.version !== 1 || !Array.isArray(parsed.rules)) {
        return { version: 1, rules: [] }
      }
      return parsed
    } catch {
      return { version: 1, rules: [] }
    }
  }

  private writeConfigFile(filePath: string, config: PermissionConfig): void {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
  }

  private watchFile(filePath: string): void {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) return

      const watcher = fs.watch(dir, (_eventType, filename) => {
        if (filename === path.basename(filePath)) {
          this.onChangeCallback?.()
        }
      })
      this.watchers.push(watcher)
    } catch {
      // Ignore watch errors (directory may not exist)
    }
  }
}
