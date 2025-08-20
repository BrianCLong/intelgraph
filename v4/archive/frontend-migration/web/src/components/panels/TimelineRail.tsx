interface TimelineRailProps extends PanelProps<TimelineEvent[]> {
  onTimeRangeChange?: (range: { start: string; end: string }) => void
  onEventSelect?: (event: TimelineEvent) => void
  selectedEventId?: string
  autoScroll?: boolean

              <div className="sticky top-0 bg-background/90 backdrop-blur-sm py-1">
                <div className="text-sm font-medium text-muted-foreground">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
              
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`relative flex gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg t
                    selectedEventId === event.id ? 'bg-muted ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onEventSelect?.(event)}
                >
                  <div 
                    className={`relative z-10 w-2 h-2 rounded-full border-2 bg-background mt-2 ${ge
                  >
                    {event.type === 'alert_triggered' && (
                      <Zap className="absolute -top-1 -left-1 h-4 w-4 text-red-500 animate-pulse" /
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getEventIcon(event.type)}</span>
                      <div className="font-medium text-sm truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(event.timestamp)}
                      </div>
                    </div>
                    
                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type.replace('_', ' ')}
                      </Badge>
                      
                      {event.entityId && (
                        <Badge variant="secondary" className="text-xs">
                          Entity: {event.entityId.slice(0, 8)}
                        </Badge>
