import * as React from 'react'
import { Search, X, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  showShortcut?: boolean
  className?: string
}

export function SearchBar({
  placeholder = 'Search...',
  value = '',
  onChange,
  onClear,
  showShortcut = true,
  className,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = React.useState(value)

  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange?.('')
    onClear?.()
  }

  return (
    <div
      className={cn(
        'relative flex items-center w-full max-w-md',
        className
      )}
    >
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {internalValue && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
          {showShortcut && !internalValue && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

