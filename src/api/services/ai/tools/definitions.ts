export const fileSystemTools = [
  {
    name: 'Bash',
    description:
      'Execute a shell command in the system. Use this to run build scripts, package managers, git commands, or other CLI tools. Commands run with a 30-second timeout.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description:
            'The shell command to execute (e.g., "npm install", "git status")',
        },
        cwd: {
          type: 'string',
          description: 'Optional working directory for the command (defaults to workspace root)',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'Read',
    description:
      'Read the complete contents of a file from the file system. Use this when you need to examine, analyze, or work with the content of an existing file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'The absolute file path to read (e.g., /Users/username/project/src/index.ts)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'Write',
    description:
      'Create a new file or completely overwrite an existing file with new content. Use this when you need to create new files or replace the entire content of existing files. For making small changes to existing files, consider using Edit.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'The absolute file path to write to (e.g., /Users/username/project/src/newFile.ts)',
        },
        content: {
          type: 'string',
          description: 'The complete content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'Edit',
    description:
      'Update specific text in an existing file by replacing a target string with new content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'The absolute file path to edit (e.g., /Users/username/project/src/index.ts)',
        },
        old_text: {
          type: 'string',
          description: 'The exact text to replace',
        },
        new_text: {
          type: 'string',
          description: 'The replacement text',
        },
        replace_all: {
          type: 'boolean',
          description: 'Replace all occurrences instead of the first match',
        },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
  {
    name: 'LS',
    description:
      'Get a detailed listing of all files and directories in a specified folder. Results include names, paths, types, sizes, and modification times. Use this to explore directory structure or find specific files.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path of the directory to list (e.g., /Users/username/project/src)',
        },
        pattern: {
          type: 'string',
          description:
            'Optional filter pattern to match against file names (e.g., ".ts" to show only TypeScript files)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'TodoWrite',
    description:
      'Write or replace the entire TODO list for the current session.',
    input_schema: {
      type: 'object' as const,
      properties: {
        todos: {
          type: 'array',
          description: 'The full list of TODO items to write',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique identifier for the todo item' },
              title: { type: 'string', description: 'Short description of the task' },
              status: {
                type: 'string',
                description: 'Current status of the task',
                enum: ['todo', 'in_progress', 'done'],
              },
              notes: { type: 'string', description: 'Optional additional details' },
            },
            required: ['id', 'title', 'status'],
          },
        },
      },
      required: ['todos'],
    },
  },
]
