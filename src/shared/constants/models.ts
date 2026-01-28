import type { ModelConfig } from '../types/config'

export const PRESET_MODELS: Record<string, ModelConfig[]> = {
  claude: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      contextLength: 200000,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      contextLength: 200000,
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      contextLength: 200000,
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      contextLength: 200000,
    },
  ],
  openai: [
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo Preview',
      contextLength: 128000,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      contextLength: 128000,
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      contextLength: 8192,
    },
    {
      id: 'gpt-4-32k',
      name: 'GPT-4 32K',
      contextLength: 32768,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      contextLength: 16385,
    },
  ],
}
