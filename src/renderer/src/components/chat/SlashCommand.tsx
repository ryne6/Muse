import {
  useState,
  useCallback,
  useRef,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Archive,
  Brain,
  BookOpen,
  FolderHeart,
  Eraser,
} from 'lucide-react'

interface SlashCommandDef {
  name: string
  description: string
  icon: React.ReactNode
  // true = 选中后直接执行，false = 填入输入框让用户继续输入
  immediate: boolean
}

const COMMANDS: SlashCommandDef[] = [
  {
    name: 'compact',
    description: '压缩对话上下文',
    icon: <Archive className="w-3.5 h-3.5" />,
    immediate: true,
  },
  {
    name: 'memories',
    description: '查看当前记忆',
    icon: <Brain className="w-3.5 h-3.5" />,
    immediate: true,
  },
  {
    name: 'remember',
    description: '保存用户记忆',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    immediate: false,
  },
  {
    name: 'remember-project',
    description: '保存项目记忆',
    icon: <FolderHeart className="w-3.5 h-3.5" />,
    immediate: false,
  },
  {
    name: 'forget',
    description: '删除匹配记忆',
    icon: <Eraser className="w-3.5 h-3.5" />,
    immediate: false,
  },
]

interface SlashCommandProps {
  inputValue: string
  onInputChange: (value: string) => void
  onExecute: (command: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function useSlashCommand({
  inputValue,
  onInputChange,
  onExecute,
  textareaRef,
}: SlashCommandProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [slashStart, setSlashStart] = useState(-1)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = COMMANDS.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  )

  // 检测 / 输入
  const handleInputChange = useCallback(
    (value: string) => {
      const textarea = textareaRef.current
      if (!textarea) {
        onInputChange(value)
        return
      }

      const cursorPos = textarea.selectionStart
      const textBeforeCursor = value.slice(0, cursorPos)

      // 只在行首或空格后的 / 触发
      const slashIdx = textBeforeCursor.lastIndexOf('/')
      if (
        slashIdx >= 0 &&
        (slashIdx === 0 || textBeforeCursor[slashIdx - 1] === ' ')
      ) {
        const query = textBeforeCursor.slice(slashIdx + 1)
        if (!query.includes(' ')) {
          setSlashStart(slashIdx)
          setFilter(query)
          setActiveIndex(0)
          setIsOpen(true)
          const rect = textarea.getBoundingClientRect()
          setPosition({ top: rect.top - 4, left: rect.left })
          onInputChange(value)
          return
        }
      }

      setIsOpen(false)
      onInputChange(value)
    },
    [textareaRef, onInputChange]
  )

  // 选中命令
  const selectCommand = useCallback(
    (cmd: SlashCommandDef) => {
      if (cmd.immediate) {
        // 清除输入中的 /xxx，直接执行
        const before = inputValue.slice(0, slashStart)
        const textarea = textareaRef.current
        const cursorPos = textarea?.selectionStart ?? inputValue.length
        const after = inputValue.slice(cursorPos)
        onInputChange((before + after).trim())
        onExecute(`~main/${cmd.name}`)
      } else {
        // 替换为 ~main/cmd + 空格，让用户继续输入
        const before = inputValue.slice(0, slashStart)
        const textarea = textareaRef.current
        const cursorPos = textarea?.selectionStart ?? inputValue.length
        const after = inputValue.slice(cursorPos)
        const newValue = `${before}~main/${cmd.name} ${after}`
        onInputChange(newValue)
        // 聚焦并移动光标到命令后
        setTimeout(() => {
          if (textarea) {
            const pos = before.length + `~main/${cmd.name} `.length
            textarea.selectionStart = pos
            textarea.selectionEnd = pos
            textarea.focus()
          }
        }, 0)
      }
      setIsOpen(false)
      setFilter('')
      setSlashStart(-1)
    },
    [slashStart, inputValue, textareaRef, onInputChange, onExecute]
  )

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen) return false
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
        return true
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        return true
      }
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault()
        selectCommand(filtered[activeIndex])
        return true
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        return true
      }
      return false
    },
    [isOpen, filtered, activeIndex, selectCommand]
  )

  // 点击外部关闭
  const slashMenu =
    isOpen && filtered.length > 0
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
            {filtered.map((cmd, i) => (
              <button
                key={cmd.name}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  i === activeIndex
                    ? 'bg-[hsl(var(--surface-2))]'
                    : 'hover:bg-[hsl(var(--surface-1))]'
                }`}
                onMouseDown={e => {
                  e.preventDefault()
                  selectCommand(cmd)
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="flex items-center gap-2 font-medium">
                  {cmd.icon}
                  <span>/{cmd.name}</span>
                </div>
                <div className="text-[hsl(var(--text-muted))] ml-5.5">
                  {cmd.description}
                </div>
              </button>
            ))}
          </div>,
          document.body
        )
      : null

  return {
    handleInputChange,
    handleKeyDown,
    slashMenu,
    isOpen,
  }
}
