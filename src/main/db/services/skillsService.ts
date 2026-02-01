import { eq } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import { generateId } from '../utils/idGenerator'
import type { SkillsDirectory, NewSkillsDirectory } from '../schema'
import * as fs from 'fs'
import * as path from 'path'

const { skillsDirectories } = schema

export interface Skill {
  name: string
  description: string
  path: string
  directory: string
}

interface SkillFrontmatter {
  name?: string
  description?: string
}

// Parse frontmatter from markdown content
function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const frontmatterStr = match[1]
  const body = match[2]
  const frontmatter: SkillFrontmatter = {}

  // Simple YAML parsing for name and description
  const lines = frontmatterStr.split('\n')
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '')
      if (key === 'name') frontmatter.name = value
      if (key === 'description') frontmatter.description = value
    }
  }

  return { frontmatter, body }
}

export class SkillsService {
  // Get all configured directories
  static async getAll(): Promise<SkillsDirectory[]> {
    const db = getDatabase()
    return db.select().from(skillsDirectories).all()
  }

  // Get enabled directories only
  static async getEnabled(): Promise<SkillsDirectory[]> {
    const db = getDatabase()
    return db.select().from(skillsDirectories).where(eq(skillsDirectories.enabled, true)).all()
  }

  // Add a new directory
  static async create(dirPath: string): Promise<SkillsDirectory> {
    const db = getDatabase()
    const expandedPath = dirPath.replace(/^~/, process.env.HOME || '')

    const newDir: NewSkillsDirectory = {
      id: generateId(),
      path: expandedPath,
      enabled: true,
    }

    await db.insert(skillsDirectories).values(newDir)
    return newDir as SkillsDirectory
  }

  // Remove a directory
  static async delete(id: string): Promise<void> {
    const db = getDatabase()
    await db.delete(skillsDirectories).where(eq(skillsDirectories.id, id))
  }

  // Toggle directory enabled status
  static async toggleEnabled(id: string): Promise<void> {
    const db = getDatabase()
    const dir = await db.select().from(skillsDirectories).where(eq(skillsDirectories.id, id)).get()
    if (dir) {
      await db.update(skillsDirectories)
        .set({ enabled: !dir.enabled })
        .where(eq(skillsDirectories.id, id))
    }
  }

  // Scan a directory for skill files
  static scanDirectory(dirPath: string): Skill[] {
    const skills: Skill[] = []

    if (!fs.existsSync(dirPath)) {
      return skills
    }

    const scanDir = (currentPath: string, depth: number = 0) => {
      if (depth > 3) return // Limit recursion depth

      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name)

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            scanDir(fullPath, depth + 1)
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8')
              const { frontmatter } = parseFrontmatter(content)

              const name = frontmatter.name || path.basename(entry.name, '.md')
              const description = frontmatter.description || ''

              skills.push({
                name,
                description,
                path: fullPath,
                directory: dirPath,
              })
            } catch (err) {
              console.error(`Failed to read skill file: ${fullPath}`, err)
            }
          }
        }
      } catch (err) {
        console.error(`Failed to scan directory: ${currentPath}`, err)
      }
    }

    scanDir(dirPath)
    return skills
  }

  // Get all skills from all enabled directories
  static async getAllSkills(): Promise<Skill[]> {
    const dirs = await this.getEnabled()
    const allSkills: Skill[] = []

    for (const dir of dirs) {
      const skills = this.scanDirectory(dir.path)
      allSkills.push(...skills)
    }

    return allSkills
  }

  // Get skill content by path
  static getSkillContent(skillPath: string): string {
    if (!fs.existsSync(skillPath)) {
      throw new Error(`Skill file not found: ${skillPath}`)
    }

    const content = fs.readFileSync(skillPath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    // Return the body with skill name as header if available
    const name = frontmatter.name || path.basename(skillPath, '.md')
    return `# Skill: ${name}\n\n${body}`
  }

  // Get skill count for a directory
  static getSkillCount(dirPath: string): number {
    return this.scanDirectory(dirPath).length
  }
}
