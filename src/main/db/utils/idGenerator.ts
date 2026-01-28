/**
 * Generate a unique ID (compatible with CommonJS)
 * Format: timestamp + random string
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomStr}`
}
