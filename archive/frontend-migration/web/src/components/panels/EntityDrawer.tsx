import * as React from 'react'
import { X, ExternalLink, Edit3, Trash2, Tag, Calendar, User, MapPin } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/Drawer'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'
import { formatDate, getRiskColor, capitalizeFirst } from '@/lib/utils'
import type { Entity, Relationship, PanelProps } from '@/types'

interface EntityDrawerProps extends PanelProps<Entity[]> {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEntityId?: string
  relationships?: Relationship[]
}

export function EntityDrawer({
  data: entities,
  loading = false,
  error,
  onSelect,
  onAction,
  open,
  onOpenChange,
  selectedEntityId,
  relationships = [],
}: EntityDrawerProps) {
  const selectedEntity = entities.find(e => e.id === selectedEntityId)

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'PERSON': return '👤'
      case 'ORGANIZATION': return '🏢'
      case 'LOCATION': return '📍'
      case 'IP_ADDRESS': return '🌐'
      case 'DOMAIN': return '🔗'
      case 'EMAIL': return '📧'
      case 'PHONE': return '📞'
      case 'FILE': return '📄'
      case 'HASH': return '🔑'
      case 'MALWARE': return '🦠'
      default: return '📊'
    }
  }

  const getRelatedEntities = () => {
    if (!selectedEntity) return []
    
    const relatedIds = relationships
      .filter(r => r.sourceId === selectedEntity.id || r.targetId === selectedEntity.id)
      .map(r => r.sourceId === selectedEntity.id ? r.targetId : r.sourceId)
    
    return entities.filter(e => relatedIds.includes(e.id))
  }

  const relatedEntities = getRelatedEntities()

  if (!selectedEntity) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent side="right" className="w-96">
          <DrawerHeader>
            <DrawerTitle>Entity Details</DrawerTitle>
            <DrawerDescription>
              Select an entity to view its details and relationships
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No entity selected
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="w-96">
        <DrawerHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getEntityIcon(selectedEntity.type)}</span>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="truncate">{selectedEntity.name}</DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{selectedEntity.type}</Badge>
                <Badge 
                  variant={selectedEntity.confidence > 0.8 ? 'success' : 
                          selectedEntity.confidence > 0.6 ? 'warning' : 'error'}
                >
                  {Math.round(selectedEntity.confidence * 100)}% confidence
                </Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAction?.('edit', selectedEntity)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit entity</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAction?.('delete', selectedEntity)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete entity</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAction?.('export', selectedEntity)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export entity</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="relationships">Relations</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 p-4 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(selectedEntity.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Source:</span>
                    <span>{selectedEntity.source || 'Unknown'}</span>
                  </div>

                  {selectedEntity.properties.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location:</span>
                      <span>{selectedEntity.properties.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedEntity.tags && selectedEntity.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntity.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Custom Properties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(selectedEntity.properties).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace('_', ' ')}:
                        </span>
                        <span className="text-right max-w-32 truncate">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relationships" className="space-y-4 p-4 overflow-y-auto">
              <div className="text-sm text-muted-foreground mb-4">
                {relatedEntities.length} related entities found
              </div>
              
              {relatedEntities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No relationships found
                </div>
              ) : (
                <div className="space-y-2">
                  {relatedEntities.map(entity => {
                    const relationship = relationships.find(r => 
                      (r.sourceId === selectedEntity.id && r.targetId === entity.id) ||
                      (r.targetId === selectedEntity.id && r.sourceId === entity.id)
                    )
                    
                    return (
                      <Card key={entity.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => onSelect?.(entity)}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getEntityIcon(entity.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{entity.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {relationship?.type.replace('_', ' ').toLowerCase()}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {entity.type}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4 p-4 overflow-y-auto">
              <div className="text-sm text-muted-foreground mb-4">
                Entity activity timeline
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Entity Created</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(selectedEntity.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Last Updated</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(selectedEntity.updatedAt)}
                    </div>
                  </div>
                </div>

                {/* Add more timeline events as needed */}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

