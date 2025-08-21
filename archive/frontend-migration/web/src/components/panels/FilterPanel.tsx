import * as React from 'react'
import { Filter, X, Calendar, Sliders, Tag, Database, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FilterState, EntityType, RelationshipType, PanelProps } from '@/types'

interface FilterPanelProps extends PanelProps<FilterState> {
  onFilterChange: (filters: FilterState) => void
  availableEntityTypes: EntityType[]
  availableRelationshipTypes: RelationshipType[]
  availableTags: string[]
  availableSources: string[]
}

export function FilterPanel({
  data: filters,
  loading = false,
  onFilterChange,
  availableEntityTypes,
  availableRelationshipTypes,
  availableTags,
  availableSources,
  className,
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = React.useState<FilterState>(filters)

  React.useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...localFilters, ...updates }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleEntityType = (type: EntityType) => {
    const current = localFilters.entityTypes
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    updateFilters({ entityTypes: updated })
  }

  const toggleRelationshipType = (type: RelationshipType) => {
    const current = localFilters.relationshipTypes
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    updateFilters({ relationshipTypes: updated })
  }

  const toggleTag = (tag: string) => {
    const current = localFilters.tags
    const updated = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag]
    updateFilters({ tags: updated })
  }

  const toggleSource = (source: string) => {
    const current = localFilters.sources
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source]
    updateFilters({ sources: updated })
  }

  const clearAllFilters = () => {
    const emptyFilters: FilterState = {
      entityTypes: [],
      relationshipTypes: [],
      dateRange: { start: '', end: '' },
      confidenceRange: { min: 0, max: 1 },
      tags: [],
      sources: [],
    }
    updateFilters(emptyFilters)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (localFilters.entityTypes.length > 0) count++
    if (localFilters.relationshipTypes.length > 0) count++
    if (localFilters.dateRange.start || localFilters.dateRange.end) count++
    if (localFilters.confidenceRange.min > 0 || localFilters.confidenceRange.max < 1) count++
    if (localFilters.tags.length > 0) count++
    if (localFilters.sources.length > 0) count++
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <div className="flex flex-wrap gap-1">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-6 w-20" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearAllFilters}
              disabled={activeFilterCount === 0}
              className="h-8 w-8"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="entities" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="entities" className="text-xs">Entities</TabsTrigger>
            <TabsTrigger value="relations" className="text-xs">Relations</TabsTrigger>
            <TabsTrigger value="time" className="text-xs">Time</TabsTrigger>
            <TabsTrigger value="meta" className="text-xs">Meta</TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Entity Types</label>
              <div className="flex flex-wrap gap-1">
                {availableEntityTypes.map(type => (
                  <Badge
                    key={type}
                    variant={localFilters.entityTypes.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleEntityType(type)}
                  >
                    {type.replace('_', ' ')}
                    {localFilters.entityTypes.includes(type) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Confidence Range</label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localFilters.confidenceRange.min}
                  onChange={(e) => updateFilters({
                    confidenceRange: {
                      ...localFilters.confidenceRange,
                      min: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(localFilters.confidenceRange.min * 100)}%</span>
                  <span>{Math.round(localFilters.confidenceRange.max * 100)}%</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="relations" className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Relationship Types</label>
              <div className="flex flex-wrap gap-1">
                {availableRelationshipTypes.map(type => (
                  <Badge
                    key={type}
                    variant={localFilters.relationshipTypes.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleRelationshipType(type)}
                  >
                    {type.replace('_', ' ')}
                    {localFilters.relationshipTypes.includes(type) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={localFilters.dateRange.start}
                  onChange={(e) => updateFilters({
                    dateRange: {
                      ...localFilters.dateRange,
                      start: e.target.value
                    }
                  })}
                  className="w-full px-3 py-1 text-sm border rounded-md"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={localFilters.dateRange.end}
                  onChange={(e) => updateFilters({
                    dateRange: {
                      ...localFilters.dateRange,
                      end: e.target.value
                    }
                  })}
                  className="w-full px-3 py-1 text-sm border rounded-md"
                  placeholder="End date"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="meta" className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </label>
              <div className="flex flex-wrap gap-1">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={localFilters.tags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {localFilters.tags.includes(tag) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Database className="h-4 w-4" />
                Sources
              </label>
              <div className="flex flex-wrap gap-1">
                {availableSources.map(source => (
                  <Badge
                    key={source}
                    variant={localFilters.sources.includes(source) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleSource(source)}
                  >
                    {source}
                    {localFilters.sources.includes(source) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {activeFilterCount > 0 && (
          <div className="pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

