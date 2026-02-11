interface MessageStatsProps {
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
}

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toLocaleString()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function MessageStats({ inputTokens, outputTokens, durationMs }: MessageStatsProps) {
  if (!inputTokens && !outputTokens && !durationMs) return null

  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--text-muted))]">
      {inputTokens != null && (
        <span>{'\u2191'} {formatTokenCount(inputTokens)}</span>
      )}
      {outputTokens != null && (
        <span>{'\u2193'} {formatTokenCount(outputTokens)} tokens</span>
      )}
      {durationMs != null && (
        <>
          <span>{'\u00b7'}</span>
          <span>{formatDuration(durationMs)}</span>
        </>
      )}
    </div>
  )
}
