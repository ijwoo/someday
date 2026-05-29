// Theme mode persistence + application.
// 'system' follows the OS via the prefers-color-scheme media query (no data-theme attr).
// 'light' / 'dark' force the theme via a data-theme attribute on <html>.

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'someday-theme'

export function getThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {}
  return 'system'
}

/** The theme actually in effect right now ('light' | 'dark'). */
export function getResolvedTheme(): 'light' | 'dark' {
  const mode = getThemeMode()
  if (mode !== 'system') return mode
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function applyThemeMode(mode: ThemeMode) {
  try {
    if (mode === 'system') {
      localStorage.removeItem(STORAGE_KEY)
      document.documentElement.removeAttribute('data-theme')
    } else {
      localStorage.setItem(STORAGE_KEY, mode)
      document.documentElement.setAttribute('data-theme', mode)
    }
  } catch {}
}
