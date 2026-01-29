import { ChevronDown } from 'lucide-react'
import { useSettingsStoreV2 } from '@/stores/settingsStoreV2'

export function ChatHeader() {
  const { getCurrentModel } = useSettingsStoreV2()
  const model = getCurrentModel()
  const modelLabel = model?.displayName || model?.name || model?.modelId || '选择模型'

  return (
    <div className="h-14 flex items-center justify-between px-6 bg-[hsl(var(--bg-main))]">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <span className="text-base">⚛️</span>
          <span>{modelLabel}</span>
          <ChevronDown className="w-3 h-3 text-[hsl(var(--text-muted))]" />
        </div>
        <div className="flex items-center gap-2 text-[hsl(var(--text-muted))]">
          <span className="text-base">🌐</span>
          <span>联网搜索</span>
        </div>
      </div>
    </div>
  )
}
