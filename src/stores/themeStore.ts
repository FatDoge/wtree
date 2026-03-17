import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

type ThemeState = {
  theme: Theme
  setTheme: (t: Theme) => void
  initTheme: () => void
}

function applyTheme(theme: Theme) {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('wtui-theme') as Theme) || 'system',
  setTheme: (t) => {
    localStorage.setItem('wtui-theme', t)
    set({ theme: t })
    applyTheme(t)
  },
  initTheme: () => {
    const t = (localStorage.getItem('wtui-theme') as Theme) || 'system'
    applyTheme(t)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const currentTheme = useThemeStore.getState().theme
      if (currentTheme === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handler)
  },
}))
