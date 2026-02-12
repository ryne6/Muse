import { Thermometer } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settingsStore'

export function TemperatureControl() {
  const { temperature, setTemperature } = useSettingsStore()

  const handleTemperatureChange = (value: number) => {
    setTemperature(value)
  }

  const presets = [
    { label: 'Precise', value: 0, description: 'Deterministic, focused' },
    { label: 'Balanced', value: 1, description: 'Default, versatile' },
    { label: 'Creative', value: 1.5, description: 'More varied, exploratory' },
    { label: 'Very Creative', value: 2, description: 'Maximum creativity' },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <Thermometer className="h-4 w-4" />
          <span className="text-xs font-mono">{temperature.toFixed(1)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">Temperature</h4>
            <p className="text-xs text-muted-foreground">
              Controls randomness. Lower values are more focused, higher values
              are more creative.
            </p>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={e =>
                handleTemperatureChange(parseFloat(e.target.value))
              }
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span className="font-semibold text-foreground">
                {temperature.toFixed(1)}
              </span>
              <span>2</span>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-1">
            <p className="text-xs font-medium mb-2">Presets</p>
            {presets.map(preset => (
              <button
                key={preset.value}
                onClick={() => handleTemperatureChange(preset.value)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs hover:bg-accent transition-colors ${
                  temperature === preset.value ? 'bg-accent' : ''
                }`}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-muted-foreground">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
