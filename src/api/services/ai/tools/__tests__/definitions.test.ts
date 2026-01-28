import { describe, it, expect } from 'vitest'
import { fileSystemTools } from '../definitions'

describe('Tool Definitions', () => {
  describe('fileSystemTools', () => {
    it('should export an array of tools', () => {
      expect(Array.isArray(fileSystemTools)).toBe(true)
      expect(fileSystemTools.length).toBeGreaterThan(0)
    })

    it('should have 4 file system tools', () => {
      expect(fileSystemTools).toHaveLength(4)
    })

    it('each tool should have required fields', () => {
      fileSystemTools.forEach(tool => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('input_schema')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.input_schema).toBe('object')
      })
    })

    it('each input_schema should have type object', () => {
      fileSystemTools.forEach(tool => {
        expect(tool.input_schema.type).toBe('object')
      })
    })
  })

  describe('read_file tool', () => {
    const readFileTool = fileSystemTools.find(t => t.name === 'read_file')

    it('should exist', () => {
      expect(readFileTool).toBeDefined()
    })

    it('should require path parameter', () => {
      expect(readFileTool?.input_schema.required).toContain('path')
    })

    it('should have path property with string type', () => {
      expect(readFileTool?.input_schema.properties.path.type).toBe('string')
    })
  })

  describe('write_file tool', () => {
    const writeFileTool = fileSystemTools.find(t => t.name === 'write_file')

    it('should exist', () => {
      expect(writeFileTool).toBeDefined()
    })

    it('should require path and content parameters', () => {
      expect(writeFileTool?.input_schema.required).toContain('path')
      expect(writeFileTool?.input_schema.required).toContain('content')
    })
  })

  describe('list_files tool', () => {
    const listFilesTool = fileSystemTools.find(t => t.name === 'list_files')

    it('should exist', () => {
      expect(listFilesTool).toBeDefined()
    })

    it('should require path parameter', () => {
      expect(listFilesTool?.input_schema.required).toContain('path')
    })

    it('should have optional pattern parameter', () => {
      expect(listFilesTool?.input_schema.properties.pattern).toBeDefined()
      expect(listFilesTool?.input_schema.required).not.toContain('pattern')
    })
  })

  describe('execute_command tool', () => {
    const execTool = fileSystemTools.find(t => t.name === 'execute_command')

    it('should exist', () => {
      expect(execTool).toBeDefined()
    })

    it('should require command parameter', () => {
      expect(execTool?.input_schema.required).toContain('command')
    })

    it('should have optional cwd parameter', () => {
      expect(execTool?.input_schema.properties.cwd).toBeDefined()
      expect(execTool?.input_schema.required).not.toContain('cwd')
    })
  })
})
