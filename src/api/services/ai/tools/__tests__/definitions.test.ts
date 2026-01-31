import { describe, it, expect } from 'vitest'
import { fileSystemTools } from '../definitions'

describe('Tool Definitions', () => {
  describe('fileSystemTools', () => {
    it('should export an array of tools', () => {
      expect(Array.isArray(fileSystemTools)).toBe(true)
      expect(fileSystemTools.length).toBeGreaterThan(0)
    })

    it('should have 6 file system tools', () => {
      expect(fileSystemTools).toHaveLength(6)
    })

    it('should include expected tool names', () => {
      const names = fileSystemTools.map((tool) => tool.name)
      expect(names).toEqual(['Bash', 'Read', 'Write', 'Edit', 'LS', 'TodoWrite'])
    })

    it('each tool should have required fields', () => {
      fileSystemTools.forEach((tool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('input_schema')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.input_schema).toBe('object')
      })
    })

    it('each input_schema should have type object', () => {
      fileSystemTools.forEach((tool) => {
        expect(tool.input_schema.type).toBe('object')
      })
    })
  })

  describe('Bash tool', () => {
    const bashTool = fileSystemTools.find((t) => t.name === 'Bash')

    it('should exist', () => {
      expect(bashTool).toBeDefined()
    })

    it('should require command parameter', () => {
      expect(bashTool?.input_schema.required).toContain('command')
    })

    it('should have optional cwd parameter', () => {
      expect(bashTool?.input_schema.properties.cwd).toBeDefined()
      expect(bashTool?.input_schema.required).not.toContain('cwd')
    })
  })

  describe('Read tool', () => {
    const readTool = fileSystemTools.find((t) => t.name === 'Read')

    it('should exist', () => {
      expect(readTool).toBeDefined()
    })

    it('should require path parameter', () => {
      expect(readTool?.input_schema.required).toContain('path')
    })
  })

  describe('Write tool', () => {
    const writeTool = fileSystemTools.find((t) => t.name === 'Write')

    it('should exist', () => {
      expect(writeTool).toBeDefined()
    })

    it('should require path and content parameters', () => {
      expect(writeTool?.input_schema.required).toContain('path')
      expect(writeTool?.input_schema.required).toContain('content')
    })
  })

  describe('Edit tool', () => {
    const editTool = fileSystemTools.find((t) => t.name === 'Edit')

    it('should exist', () => {
      expect(editTool).toBeDefined()
    })

    it('should require path, old_text, and new_text parameters', () => {
      expect(editTool?.input_schema.required).toContain('path')
      expect(editTool?.input_schema.required).toContain('old_text')
      expect(editTool?.input_schema.required).toContain('new_text')
    })
  })

  describe('LS tool', () => {
    const lsTool = fileSystemTools.find((t) => t.name === 'LS')

    it('should exist', () => {
      expect(lsTool).toBeDefined()
    })

    it('should require path parameter', () => {
      expect(lsTool?.input_schema.required).toContain('path')
    })

    it('should have optional pattern parameter', () => {
      expect(lsTool?.input_schema.properties.pattern).toBeDefined()
      expect(lsTool?.input_schema.required).not.toContain('pattern')
    })
  })

  describe('TodoWrite tool', () => {
    const todoTool = fileSystemTools.find((t) => t.name === 'TodoWrite')

    it('should exist', () => {
      expect(todoTool).toBeDefined()
    })

    it('should require todos parameter', () => {
      expect(todoTool?.input_schema.required).toContain('todos')
    })
  })
})
