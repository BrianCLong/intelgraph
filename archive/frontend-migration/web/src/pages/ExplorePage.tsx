import React, { useState, useEffect } from 'react'
import { Search, Filter, Settings, Download, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { EntityDrawer } from '@/components/panels/EntityDrawer'
import { FilterPanel } from '@/components/panels/FilterPanel'
import { TimelineRail } from '@/components/panels/TimelineRail'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { GraphCanvas } from '@/graphs/GraphCanvas'
import { useEntities, useEntityUpdates } from '@/hooks/useGraphQL'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import mockData from '@/mock/data.json'
import type { Entity, Relationship, FilterState, TimelineEvent, GraphLayout } from '@/types'

export default function ExplorePage() {
  // GraphQL hooks
  const { data: entitiesData, loading: entitiesLoading, error: entitiesError, refetch } = useEntities()
  const { data: entityUpdates } = useEntityUpdates()
  
  const [entities, setEntities] = useState<Entity[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // UI State
  const [selectedEntityId, setSelectedEntityId] = useState<string>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filterPanelOpen, setFilterPanelOpen] = useState(true)
  const [timelineOpen, setTimelineOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Graph state
  const [graphLayout, setGraphLayout] = useState<GraphLayout>({
    type: 'force',
    settings: {}
  })
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    entityTypes: [],
    relationshipTypes: [],
    dateRange: { start: '', end: '' },
    confidenceRange: { min: 0, max: 1 },
    tags: [],
    sources: [],
  })

  // Load data - prefer GraphQL over mock data
  useEffect(() => {
    if (entitiesData?.entities) {
      // Use real GraphQL data when available
      setEntities(entitiesData.entities)
      setLoading(entitiesLoading)
      setError(entitiesError)
    } else {
      // Fallback to mock data for development
      const loadMockData = async () => {
        try {
          setLoading(true)
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          setEntities(mockData.entities as Entity[])
          setRelationships(mockData.relationships as Relationship[])
          setTimelineEvents(mockData.timelineEvents as TimelineEvent[])
        } catch (err) {
          setError(err as Error)
        } finally {
          setLoading(false)
        }
      }

      loadMockData()
    }
  }, [entitiesData, entitiesLoading, entitiesError])

  // Handle real-time entity updates
  useEffect(() => {
    if (entityUpdates?.entityUpdated) {
      setEntities(prev => {
        const updatedEntity = entityUpdates.entityUpdated
        const index = prev.findIndex(e => e.id === updatedEntity.id)
        if (index >= 0) {
          const newEntities = [...prev]
          newEntities[index] = { ...newEntities[index], ...updatedEntity }
          return newEntities
        }
        return [...prev, updatedEntity]
      })
    }
  }, [entityUpdates])

  // Filter data based on current filters
  const filteredEntities = entities.filter(entity => {
    if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(entity.type)) return false
    if (filters.confidenceRange.min > entity.confidence || filters.confidenceRange.max < entity.confidence) return false
    if (filters.tags.length > 0 && !entity.tags?.some(tag => filters.tags.includes(tag))) return false
    if (filters.sources.length > 0 && entity.source && !filters.sources.includes(entity.source)) return false
    if (searchQuery && !entity.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredRelationships = relationships.filter(rel => {
    if (filters.relationshipTypes.length > 0 && !filters.relationshipTypes.includes(rel.type)) return false
    // Only include relationships where both entities are in filtered set
    return filteredEntities.some(e => e.id === rel.sourceId) && 
           filteredEntities.some(e => e.id === rel.targetId)
  })

  // Get available filter options
  const availableEntityTypes = Array.from(new Set(entities.map(e => e.type)))
  const availableRelationshipTypes = Array.from(new Set(relationships.map(r => r.type)))
  const availableTags = Array.from(new Set(entities.flatMap(e => e.tags || [])))
  const availableSources = Array.from(new Set(entities.map(e => e.source).filter(Boolean))) as string[]

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntityId(entity.id)
    setDrawerOpen(true)
  }

  const handleRefresh = async () => {
    if (entitiesData) {
      // Refetch from GraphQL
      await refetch()
    } else {
      // Simulate refresh for mock data
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLoading(false)
    }
  }

  const handleExport = () => {
    const data = {
      entities: filteredEntities,
      relationships: filteredRelationships,
      filters,
      timestamp: new Date().toISOString(),
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `intelgraph-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="alert"
          title="Failed to load graph data"
          description={error.message}
          action={{
            label: "Retry",
            onClick: () => window.location.reload()
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Graph Explorer</h1>
          <ConnectionStatus />
          <SearchBar
            placeholder="Search entities..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-80"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimelineOpen(!timelineOpen)}
          >
            <Search className="h-4 w-4 mr-2" />
            Timeline
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Layout
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Filters */}
        {filterPanelOpen && (
          <div className="w-80 border-r overflow-y-auto">
            <FilterPanel
              data={filters}
              onFilterChange={setFilters}
              availableEntityTypes={availableEntityTypes}
              availableRelationshipTypes={availableRelationshipTypes}
              availableTags={availableTags}
              availableSources={availableSources}
              loading={loading}
              className="m-4"
            />
          </div>
        )}

        {/* Center - Graph Canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading graph data...</p>
              </div>
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState
                icon="search"
                title="No entities found"
                description="Try adjusting your filters or search query"
                action={{
                  label: "Clear filters",
                  onClick: () => {
                    setFilters({
                      entityTypes: [],
                      relationshipTypes: [],
                      dateRange: { start: '', end: '' },
                      confidenceRange: { min: 0, max: 1 },
                      tags: [],
                      sources: [],
                    })
                    setSearchQuery('')
                  }
                }}
              />
            </div>
          ) : (
            <GraphCanvas
              entities={filteredEntities}
              relationships={filteredRelationships}
              layout={graphLayout}
              onEntitySelect={handleEntitySelect}
              selectedEntityId={selectedEntityId}
              className="h-full w-full"
            />
          )}
        </div>

        {/* Right Sidebar - Timeline */}
        {timelineOpen && (
          <div className="w-80 border-l overflow-y-auto">
            <TimelineRail
              data={timelineEvents}
              loading={loading}
              onEventSelect={(event) => {
                if (event.entityId) {
                  setSelectedEntityId(event.entityId)
                  setDrawerOpen(true)
                }
              }}
              className="m-4"
            />
          </div>
        )}
      </div>

      {/* Entity Details Drawer */}
      <EntityDrawer
        data={entities}
        relationships={relationships}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        selectedEntityId={selectedEntityId}
        onSelect={handleEntitySelect}
        onAction={(action, payload) => {
          console.log('Entity action:', action, payload)
          // Handle entity actions (edit, delete, export, etc.)
        }}
      />
    </div>
  )
}