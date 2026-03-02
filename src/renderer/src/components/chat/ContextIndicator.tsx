interface ContextIndicatorProps {
  usedTokens: number | null
  totalConsumed: number | null
  contextLength: number | null
}

function formatTokenShort(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`
  return String(count)
}

export function ContextIndicator({
  usedTokens,
  totalConsumed,
  contextLength,
}: ContextIndicatorProps) {
  if (usedTokens == null && totalConsumed == null) return null

  const ratio =
    usedTokens != null && contextLength ? usedTokens / contextLength : 0
  const isWarning = ratio > 0.7
  const isCritical = ratio > 0.9

  const contextPart =
    usedTokens != null && contextLength != null
      ? `${formatTokenShort(usedTokens)} / ${formatTokenShort(contextLength)}`
      : null

  const totalPart =
    totalConsumed != null && totalConsumed > 0
      ? `Σ ${formatTokenShort(totalConsumed)}`
      : null

  const display = [contextPart, totalPart].filter(Boolean).join(' · ')
  if (!display) return null

  if (isCritical) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1">
        <div className="w-16 h-1.5 rounded-full bg-[hsl(var(--surface-2))]">
          <div
            className="h-full rounded-full bg-red-500"
            style={{ width: `${Math.min(ratio * 100, 100)}%` }}
          />
        </div>
        <span className="text-xs text-red-500">{display}</span>
      </div>
    )
  }

  return (
    <span
      className={`text-xs px-2 py-1 ${
        isWarning ? 'text-orange-500' : 'text-[hsl(var(--text-muted))]'
      }`}
    >
      {display}
    </span>
  )
}
