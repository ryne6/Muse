export async function getSystemFonts(): Promise<string[]> {
  const fallbackFonts = [
    'System UI',
    'SF Pro Text',
    'Segoe UI',
    'Helvetica Neue',
    'Helvetica',
    'Arial',
    'Roboto',
    'Noto Sans',
  ]

  try {
    const anyWindow = window as unknown as { queryLocalFonts?: () => Promise<Array<{ family: string }>> }
    if (!anyWindow.queryLocalFonts) {
      return fallbackFonts
    }

    const fonts = await anyWindow.queryLocalFonts()
    const families = fonts
      .map((font) => font.family)
      .filter(Boolean)

    return Array.from(new Set([...families, ...fallbackFonts])).sort((a, b) => a.localeCompare(b))
  } catch {
    return fallbackFonts
  }
}

export function applyUIFont(font: string | null | undefined) {
  const root = document.documentElement
  if (!font) {
    root.style.removeProperty('--font-ui')
    return
  }
  root.style.setProperty('--font-ui', font)
}
