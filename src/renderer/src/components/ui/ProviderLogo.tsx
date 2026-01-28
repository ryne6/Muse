import { cn } from '@/utils/cn'

interface ProviderLogoProps {
  type: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

export function ProviderLogo({ type, size = 'md', className }: ProviderLogoProps) {
  const sizeClass = SIZES[size]

  const logoPath = `/src/assets/providers/${type}.svg`

  return (
    <div className={cn('flex items-center justify-center', sizeClass, className)}>
      <img
        src={logoPath}
        alt={`${type} logo`}
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to generic icon on error
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          target.parentElement!.innerHTML = `<span class="text-lg">${getFallbackIcon(type)}</span>`
        }}
      />
    </div>
  )
}

function getFallbackIcon(type: string): string {
  const icons: Record<string, string> = {
    claude: 'A',
    openai: 'O',
    gemini: 'G',
    deepseek: 'D',
    moonshot: 'M',
    openrouter: 'R',
    custom: 'C',
  }
  return icons[type] || 'AI'
}
