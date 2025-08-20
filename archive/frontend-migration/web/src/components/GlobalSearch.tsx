import React, { useState, useEffect } from 'react'
import { Command } from 'cmdk'
import { Search, FileText, User, AlertTriangle, Zap } from 'lucide-react'
import { useSearch } from '@/contexts/SearchContext'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'entity' | 'investigation' | 'alert' | 'case' | 'command'
  title: string
  description?: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string
}

export function GlobalSearch() {
  const { isOpen, query, setQuery, closeSearch } = useSearch()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Mock search function
  const searchFunction = async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return []

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))

    const mockResults: SearchResult[] = [
      // Entities
      {
        id: 'ent-001',
        type: 'entity',
        title: 'John Anderson',
        description: 'PERSON • Senior Engineer • 95% confidence',
        href: '/explore?entity=ent-001',
        icon: User,
        badge: 'PERSON',
      },
      {
        id: 'ent-002',
        type: 'entity',
        title: '192.168.1.100',
        description: 'IP_ADDRESS • Internal network • 98% confidence',
        href: '/explore?entity=ent-002',
        icon: Zap,
        badge: 'IP',
      },
      // Investigations
      {
        id: 'inv-001',
        type: 'investigation',
        title: 'Network Security Analysis',
        description: 'Active • 12 entities • High priority',
        href: '/explore?investigation=inv-001',
        icon: Search,
        badge: 'ACTIVE',
      },
      // Alerts
      {
        id: 'alert-001',
        type: 'alert',
        title: 'Suspicious Login Activity',
        description: 'Medium severity • Investigating',
        href: '/alerts/alert-001',
        icon: AlertTriangle,
        badge: 'MEDIUM',
      },
      // Cases
      {
        id: 'case-001',
        type: 'case',
        title: 'Insider Threat Investigation',
        description: 'In Progress • High priority',
        href: '/cases/case-001',
        icon: FileText,
        badge: 'HIGH',
      },
      // Commands
      {
        id: 'cmd-explore',
        type: 'command',
        title: 'Go to Graph Explorer',
        description: 'Navigate to the graph exploration interface',
        href: '/explore',
        icon: Search,
      },
      {
        id: 'cmd-alerts',
        type: 'command',
        title: 'View Alerts',
        description: 'Navigate to alerts dashboard',
        href: '/alerts',
        icon: AlertTriangle,
      },
    ]

    // Filter results based on query
    return mockResults.filter(result =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description?.toLowerCase().includes(query.toLowerCase())
    )
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    searchFunction(query)
      .then(setResults)
      .finally(() => setLoading(false))
  }, [query])

  const handleSelect = (result: SearchResult) => {
    if (result.href) {
      navigate(result.href)
      closeSearch()
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entity': return User
      case 'investigation': return Search
      case 'alert': return AlertTriangle
      case 'case': return FileText
      case 'command': return Zap
      default: return Search
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'entity': return 'secondary'
      case 'investigation': return 'default'
      case 'alert': return 'destructive'
      case 'case': return 'outline'
      case 'command': return 'intel'
      default: return 'secondary'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl">
        <Command className="rounded-lg border shadow-md bg-popover">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Search entities, investigations, alerts..."
              value={query}
              onValueChange={setQuery}
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <Command.List className="max-h-96 overflow-y-auto p-2">
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            
            {!loading && query && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            )}

            {!query && !loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type to search across entities, investigations, and more...
              </div>
            )}

            {results.length > 0 && (
              <>
                {/* Group results by type */}
                {['command', 'entity', 'investigation', 'alert', 'case'].map(type => {
                  const typeResults = results.filter(r => r.type === type)
                  if (typeResults.length === 0) return null

                  return (
                    <Command.Group key={type} heading={type.charAt(0).toUpperCase() + type.slice(1)}>
                      {typeResults.map((result) => {
                        const Icon = result.icon || getTypeIcon(result.type)
                        return (
                          <Command.Item
                            key={result.id}
                            value={result.id}
                            onSelect={() => handleSelect(result)}
                            className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-md"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{result.title}</div>
                              {result.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {result.description}
                                </div>
                              )}
                            </div>
                            {result.badge && (
                              <Badge 
                                variant={getTypeBadgeVariant(result.type) as any}
                                className="text-xs"
                              >
                                {result.badge}
                              </Badge>
                            )}
                          </Command.Item>
                        )
                      })}
                    </Command.Group>
                  )
                })}
              </>
            )}
          </Command.List>
          
          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Press Enter to select, Esc to close</span>
              <div className="flex items-center gap-1">
                <kbd className="h-5 px-1.5 rounded border bg-muted text-[10px] font-medium">↑</kbd>
                <kbd className="h-5 px-1.5 rounded border bg-muted text-[10px] font-medium">↓</kbd>
                <span className="text-[10px]">to navigate</span>
              </div>
            </div>
          </div>
        </Command>
      </div>
    </div>
  )
}