import React, { createContext, useContext, useState, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

interface SearchContextType {
  isOpen: boolean
  query: string
  setQuery: (query: string) => void
  openSearch: () => void
  closeSearch: () => void
  results: any[]
  setResults: (results: any[]) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const openSearch = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [])

  // Global hotkey: Cmd/Ctrl + K
  useHotkeys('meta+k, ctrl+k', (event) => {
    event.preventDefault()
    openSearch()
  }, { enableOnContentEditable: true, enableOnFormTags: true })

  // ESC to close search
  useHotkeys('esc', () => {
    if (isOpen) {
      closeSearch()
    }
  }, { enableOnContentEditable: true })

  const value = {
    isOpen,
    query,
    setQuery,
    openSearch,
    closeSearch,
    results,
    setResults,
    loading,
    setLoading,
  }

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}