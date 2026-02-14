import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { dbClient } from '~/services/dbClient'
import { useSettingsStore } from '~/stores/settingsStore'

interface Skill {
  name: string
  description: string
  path: string
  directory: string
}

interface SkillMentionProps {
  inputValue: string
  onInputChange: (value: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function useSkillMention({
  inputValue,
  onInputChange,
  textareaRef,
}: SkillMentionProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState(-1)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const { setSelectedSkill } = useSettingsStore()

  // 加载 skills
  useEffect(() => {
    const load = async () => {
      try {
        const data = await dbClient.skills.getAll()
        setSkills(data || [])
      } catch (error) {
        console.error('Failed to load skills:', error)
      }
    }
    load()

    const handler = () => load()
    window.addEventListener('skills-updated', handler)
    return () => window.removeEventListener('skills-updated', handler)
  }, [])

  // 带 Auto 选项的过滤列表
  const filteredItems = [
    { name: 'Auto (AI chooses)', path: null, description: '' },
    ...skills,
  ].filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))

  // 检测 @ 输入
  const handleInputChange = useCallback(
    (value: string) => {
      const textarea = textareaRef.current
      if (!textarea) {
        onInputChange(value)
        return
      }

      const cursorPos = textarea.selectionStart
      // 找光标前最近的 @
      const textBeforeCursor = value.slice(0, cursorPos)
      const atIndex = textBeforeCursor.lastIndexOf('@')

      if (
        atIndex >= 0 &&
        (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')
      ) {
        const query = textBeforeCursor.slice(atIndex + 1)
        // @ 后没有空格才算正在输入 mention
        if (!query.includes(' ')) {
          setMentionStart(atIndex)
          setFilter(query)
          setActiveIndex(0)
          setIsOpen(true)
          updatePosition(textarea, atIndex)
          onInputChange(value)
          return
        }
      }

      setIsOpen(false)
      onInputChange(value)
    },
    [textareaRef, onInputChange]
  )

  // 计算浮层位置（textarea 上方）
  const updatePosition = (textarea: HTMLTextAreaElement, _atIndex: number) => {
    const rect = textarea.getBoundingClientRect()
    setPosition({
      top: rect.top - 4,
      left: rect.left,
    })
  }

  // 选中 skill
  const selectSkill = useCallback(
    (item: { name: string; path: string | null }) => {
      setSelectedSkill(item.path)
      // 从输入框删除 @xxx
      if (mentionStart >= 0) {
        const textarea = textareaRef.current
        const cursorPos = textarea?.selectionStart ?? inputValue.length
        const before = inputValue.slice(0, mentionStart)
        const after = inputValue.slice(cursorPos)
        onInputChange(before + after)
      }
      setIsOpen(false)
      setFilter('')
      setMentionStart(-1)
    },
    [mentionStart, inputValue, textareaRef, onInputChange, setSelectedSkill]
  )

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen) return false

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, filteredItems.length - 1))
        return true
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        return true
      }
      if (e.key === 'Enter' && filteredItems.length > 0) {
        e.preventDefault()
        selectSkill(filteredItems[activeIndex])
        return true
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        return true
      }
      return false
    },
    [isOpen, filteredItems, activeIndex, selectSkill]
  )

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // 浮层渲染
  const mentionMenu =
    isOpen && filteredItems.length > 0
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] shadow-lg py-1 w-64 max-h-48 overflow-y-auto animate-fade-in"
            style={{
              top: position.top,
              left: position.left,
              transform: 'translateY(-100%)',
            }}
          >
            {filteredItems.map((item, i) => (
              <button
                key={item.path ?? 'auto'}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  i === activeIndex
                    ? 'bg-[hsl(var(--surface-2))]'
                    : 'hover:bg-[hsl(var(--surface-1))]'
                }`}
                onMouseDown={e => {
                  e.preventDefault()
                  selectSkill(item)
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="font-medium">{item.name}</div>
                {item.description && (
                  <div className="text-[hsl(var(--text-muted))] truncate">
                    {item.description}
                  </div>
                )}
              </button>
            ))}
          </div>,
          document.body
        )
      : null

  return {
    handleInputChange,
    handleKeyDown,
    mentionMenu,
    isOpen,
  }
}
