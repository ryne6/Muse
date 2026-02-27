import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import {
  Trash2,
  Search,
  Brain,
  Download,
  Upload,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useSettingsStore } from '~/stores/settingsStore'
import { notify } from '~/utils/notify'
import type { MemoryRecord } from '~shared/types/ipc'

type CategoryFilter =
  | 'all'
  | 'preference'
  | 'knowledge'
  | 'decision'
  | 'pattern'

// Import limits
const MAX_IMPORT_FILE_SIZE = 1024 * 1024 // 1 MB
const MAX_IMPORT_ITEMS = 500

export const MemorySettings = memo(function MemorySettings() {
  const [userMemories, setUserMemories] = useState<MemoryRecord[]>([])
  const [projectMemories, setProjectMemories] = useState<MemoryRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MemoryRecord[] | null>(
    null
  )
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [confirmClear, setConfirmClear] = useState<'user' | 'project' | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const memoryEnabled = useSettingsStore(s => s.memoryEnabled)
  const setMemoryEnabled = useSettingsStore(s => s.setMemoryEnabled)

  const loadMemories = useCallback(async () => {
    if (!memoryEnabled) {
      setLoadingInitial(false)
      return
    }
    try {
      setLoadingInitial(true)
      const [user, project] = await Promise.all([
        window.api.memory.getByType('user'),
        window.api.memory.getByType('project'),
      ])
      setUserMemories(user || [])
      setProjectMemories(project || [])
    } catch (error) {
      console.error('Failed to load memories:', error)
      notify.error('加载记忆失败')
    } finally {
      setLoadingInitial(false)
    }
  }, [memoryEnabled])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    try {
      const results = await window.api.memory.search(searchQuery)
      setSearchResults(results)
    } catch {
      notify.error('搜索失败')
    }
  }, [searchQuery])

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        setLoading(true)
        await window.api.memory.delete(id)
        notify.success('记忆已删除')
        loadMemories()
        if (searchResults) handleSearch()
      } catch {
        notify.error('删除失败')
      } finally {
        setLoading(false)
      }
    },
    [loadMemories, searchResults, handleSearch]
  )

  const handleEdit = (memory: MemoryRecord) => {
    setEditingId(memory.id)
    setEditContent(memory.content)
  }

  const handleSaveEdit = useCallback(
    async (id: string) => {
      if (!editContent.trim()) return
      try {
        setLoading(true)
        await window.api.memory.update(id, { content: editContent.trim() })
        notify.success('已更新')
        setEditingId(null)
        loadMemories()
        if (searchResults) handleSearch()
      } catch {
        notify.error('更新失败')
      } finally {
        setLoading(false)
      }
    },
    [editContent, loadMemories, searchResults, handleSearch]
  )

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleClearType = useCallback(
    async (type: 'user' | 'project') => {
      try {
        setLoading(true)
        await window.api.memory.deleteByType(type)
        notify.success(`已清空${type === 'user' ? '用户' : '项目'}记忆`)
        setConfirmClear(null)
        loadMemories()
      } catch {
        notify.error('清空失败')
      } finally {
        setLoading(false)
      }
    },
    [loadMemories]
  )

  const handleExport = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.memory.export()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crow-memories-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      notify.success(`已导出 ${data.length} 条记忆`)
    } catch {
      notify.error('导出失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // I4+I9: Validate file size
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        notify.error('文件过大：最大支持 1 MB')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      try {
        setLoading(true)
        const text = await file.text()
        const data = JSON.parse(text)
        if (!Array.isArray(data)) {
          notify.error('文件格式错误：需要 JSON 数组')
          return
        }

        // I9: Cap import count
        if (data.length > MAX_IMPORT_ITEMS) {
          notify.error(
            `条目过多：最多支持 ${MAX_IMPORT_ITEMS} 条，当前 ${data.length} 条`
          )
          return
        }

        const result = await window.api.memory.import(data)
        notify.success(
          `导入 ${result.imported} 条，跳过 ${result.skipped} 条重复`
        )
        loadMemories()
      } catch {
        notify.error('导入失败：请检查文件格式')
      } finally {
        setLoading(false)
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [loadMemories]
  )

  // M6: useMemo to avoid re-filtering on every render
  const filteredUser = useMemo(
    () =>
      categoryFilter === 'all'
        ? userMemories
        : userMemories.filter(m => m.category === categoryFilter),
    [userMemories, categoryFilter]
  )
  const filteredProject = useMemo(
    () =>
      categoryFilter === 'all'
        ? projectMemories
        : projectMemories.filter(m => m.category === categoryFilter),
    [projectMemories, categoryFilter]
  )
  const filteredSearch = useMemo(
    () =>
      searchResults
        ? categoryFilter === 'all'
          ? searchResults
          : searchResults.filter(m => m.category === categoryFilter)
        : null,
    [searchResults, categoryFilter]
  )

  const totalCount = userMemories.length + projectMemories.length

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      preference: '偏好',
      knowledge: '知识',
      decision: '决策',
      pattern: '模式',
    }
    return map[cat] || cat
  }

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      preference:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      knowledge:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      decision:
        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      pattern:
        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    }
    return (
      map[cat] ||
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    )
  }

  const renderMemoryItem = (memory: MemoryRecord) => {
    const isEditing = editingId === memory.id

    return (
      <div
        key={memory.id}
        className="flex items-start justify-between p-3 rounded-lg border bg-background gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${categoryColor(memory.category)}`}
            >
              {categoryLabel(memory.category)}
            </span>
            <span className="text-xs text-muted-foreground">
              {memory.source === 'auto' ? '自动' : '手动'}
            </span>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Input
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveEdit(memory.id)
                  if (e.key === 'Escape') handleCancelEdit()
                }}
                className="text-sm h-8"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => handleSaveEdit(memory.id)}
              >
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={handleCancelEdit}
              >
                <X className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          ) : (
            <div className="text-sm">{memory.content}</div>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => handleEdit(memory)}
              disabled={loading}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => handleDelete(memory.id)}
              disabled={loading}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderClearButton = (type: 'user' | 'project', count: number) => {
    if (count === 0) return null

    if (confirmClear === type) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            确认清空?
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 text-xs px-2"
            onClick={() => handleClearType(type)}
          >
            确认
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2"
            onClick={() => setConfirmClear(null)}
          >
            取消
          </Button>
        </div>
      )
    }

    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-6 text-xs text-muted-foreground"
        onClick={() => setConfirmClear(type)}
      >
        清空
      </Button>
    )
  }

  const categories: CategoryFilter[] = [
    'all',
    'preference',
    'knowledge',
    'decision',
    'pattern',
  ]
  const categoryFilterLabel: Record<CategoryFilter, string> = {
    all: '全部',
    preference: '偏好',
    knowledge: '知识',
    decision: '决策',
    pattern: '模式',
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">记忆功能</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {memoryEnabled
              ? '已开启 — Crow 会记住你的偏好和项目知识'
              : '开启后，Crow 将记住你的偏好和项目知识'}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={memoryEnabled}
          aria-label="记忆功能开关"
          onClick={() => setMemoryEnabled(!memoryEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            memoryEnabled ? 'bg-primary' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              memoryEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {!memoryEnabled && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Brain className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>记忆功能已关闭</p>
          <p className="text-sm mt-1">开启后可使用 /remember 命令保存记忆</p>
        </div>
      )}

      {memoryEnabled && (
        <>
          {loadingInitial ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              加载中...
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="flex items-center justify-between text-xs text-muted-foreground border rounded-lg px-3 py-2">
                <span>
                  共 {totalCount} 条记忆（用户 {userMemories.length} / 项目{' '}
                  {projectMemories.length}）
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={handleExport}
                    disabled={loading}
                  >
                    <Download className="h-3.5 w-3.5" /> 导出
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-3.5 w-3.5" /> 导入
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </div>
              </div>

              {/* Search */}
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索记忆..."
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Category filter */}
              <div className="flex gap-1.5 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    aria-pressed={categoryFilter === cat}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      categoryFilter === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {categoryFilterLabel[cat]}
                  </button>
                ))}
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      搜索结果 ({searchResults.length})
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSearchResults(null)
                        setSearchQuery('')
                      }}
                    >
                      清除
                    </Button>
                  </div>
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      无匹配结果
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredSearch!.map(renderMemoryItem)}
                    </div>
                  )}
                </div>
              )}

              {/* Memory lists */}
              {!searchResults && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">
                        用户记忆 ({filteredUser.length})
                      </h3>
                      {renderClearButton('user', userMemories.length)}
                    </div>
                    {filteredUser.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                        {categoryFilter === 'all'
                          ? '暂无用户记忆，使用 /remember 命令添加'
                          : `暂无「${categoryFilterLabel[categoryFilter]}」类型的用户记忆`}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredUser.map(renderMemoryItem)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">
                        项目记忆 ({filteredProject.length})
                      </h3>
                      {renderClearButton('project', projectMemories.length)}
                    </div>
                    {filteredProject.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                        {categoryFilter === 'all'
                          ? '暂无项目记忆，使用 /remember-project 命令添加'
                          : `暂无「${categoryFilterLabel[categoryFilter]}」类型的项目记忆`}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredProject.map(renderMemoryItem)}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
})
