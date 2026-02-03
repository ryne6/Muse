import { useEffect, useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { Dropdown } from '@lobehub/ui'
import { dbClient } from '@/services/dbClient'
import { useSettingsStore } from '@/stores/settingsStore'

interface Skill {
  name: string
  description: string
  path: string
  directory: string
}

export function SkillsDropdown() {
  const [skills, setSkills] = useState<Skill[]>([])
  const { selectedSkill, setSelectedSkill } = useSettingsStore()

  const loadSkills = useCallback(async () => {
    try {
      const data = await dbClient.skills.getAll()
      setSkills(data || [])
    } catch (error) {
      console.error('Failed to load skills:', error)
    }
  }, [])

  useEffect(() => {
    loadSkills()
    const interval = setInterval(loadSkills, 10000)
    return () => clearInterval(interval)
  }, [loadSkills])

  // Listen for skills-updated event from Settings
  useEffect(() => {
    const handleSkillsUpdated = () => loadSkills()
    window.addEventListener('skills-updated', handleSkillsUpdated)
    return () => window.removeEventListener('skills-updated', handleSkillsUpdated)
  }, [loadSkills])

  const truncateStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    display: 'block',
    maxWidth: 200,
  }

  const menuItems: any[] = [
    {
      key: 'auto',
      label: <span style={truncateStyle}>Auto (AI chooses)</span>,
      onClick: () => setSelectedSkill(null),
    },
    { type: 'divider' },
  ]

  if (skills.length > 0) {
    skills.forEach((skill) => {
      menuItems.push({
        key: skill.path,
        label: <span style={truncateStyle}>{skill.name}</span>,
        onClick: () => setSelectedSkill(skill.path),
      })
    })
  } else {
    menuItems.push({
      key: 'no-skills',
      label: <span style={truncateStyle}>No skills available</span>,
      disabled: true,
    })
  }

  const currentLabel = selectedSkill
    ? skills.find((s) => s.path === selectedSkill)?.name || 'Selected'
    : 'Auto'

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="top"
      styles={{ root: { width: 240, overflow: 'hidden' } }}
    >
      <button className="flex items-center gap-1.5 px-2 py-1 rounded text-sm hover:bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] transition-colors">
        <Sparkles className="w-4 h-4" />
        <span>Skill: {currentLabel}</span>
      </button>
    </Dropdown>
  )
}
