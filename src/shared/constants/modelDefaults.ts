/**
 * 内置模型的默认 context length 映射
 * 匹配规则: modelId 前缀匹配，优先精确匹配
 */
export const MODEL_CONTEXT_DEFAULTS: Array<{
  pattern: string | RegExp
  contextLength: number
}> = [
  { pattern: /^claude-sonnet-4-/, contextLength: 200_000 },
  { pattern: /^claude-opus-4-/, contextLength: 200_000 },
  { pattern: /^claude-haiku-3\.5-/, contextLength: 200_000 },
  { pattern: /^claude-3-/, contextLength: 200_000 },
  { pattern: /^gpt-4\.1/, contextLength: 1_047_576 },
  { pattern: /^gpt-4o/, contextLength: 128_000 },
  { pattern: /^gpt-4-turbo/, contextLength: 128_000 },
  { pattern: /^o[134]/, contextLength: 200_000 },
  { pattern: /^gemini-2\.[05]-/, contextLength: 1_048_576 },
  { pattern: /^deepseek-chat$/, contextLength: 64_000 },
  { pattern: /^deepseek-reasoner$/, contextLength: 64_000 },
  { pattern: /^moonshot-v1-8k$/, contextLength: 8_000 },
  { pattern: /^moonshot-v1-32k$/, contextLength: 32_000 },
  { pattern: /^moonshot-v1-128k$/, contextLength: 128_000 },
]

export function getDefaultContextLength(modelId: string): number | null {
  for (const entry of MODEL_CONTEXT_DEFAULTS) {
    if (entry.pattern instanceof RegExp) {
      if (entry.pattern.test(modelId)) return entry.contextLength
    } else if (modelId.startsWith(entry.pattern)) {
      return entry.contextLength
    }
  }
  return null
}
