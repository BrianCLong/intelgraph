import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

interface AppState {
  theme: ThemeMode
  history: ThemeMode[]
  future: ThemeMode[]
  toggleTheme: () => void
  undo: () => void
  redo: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  history: [],
  future: [],
  toggleTheme: () => {
    const { theme, history } = get()
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light'
    set({ theme: next, history: [...history, theme], future: [] })
  },
  undo: () => {
    const { history, future, theme } = get()
    if (history.length === 0) return
    const previous = history[history.length - 1]
    set({
      theme: previous,
      history: history.slice(0, -1),
      future: [theme, ...future],
    })
  },
  redo: () => {
    const { history, future, theme } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      theme: next,
      history: [...history, theme],
      future: future.slice(1),
    })
  },
}))
