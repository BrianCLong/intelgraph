import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import type { Entity, Relationship, GraphLayout } from '@/types'

interface GraphCanvasProps {
  entities: Entity[]
  relationships: Relationship[]
  layout: GraphLayout
  onEntitySelect?: (entity: Entity) => void
  selectedEntityId?: string
  width?: number
  height?: number
  className?: string
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  entity: Entity
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string
  relationship: Relationship
  source: GraphNode
  target: GraphNode
}

export function GraphCanvas({
  entities,
  relationships,
  layout,
  onEntitySelect,
  selectedEntityId,
  className,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions

    // Create nodes and links
    const nodes: GraphNode[] = entities.map(entity => ({
      id: entity.id,
      entity,
    }))

    const links: GraphLink[] = relationships
      .filter(rel => {
        const sourceNode = nodes.find(n => n.id === rel.sourceId)
        const targetNode = nodes.find(n => n.id === rel.targetId)
        return sourceNode && targetNode
      })
      .map(rel => ({
        id: rel.id,
        relationship: rel,
        source: nodes.find(n => n.id === rel.sourceId)!,
        target: nodes.find(n => n.id === rel.targetId)!,
      }))

    // Create simulation based on layout type
    let simulation: d3.Simulation<GraphNode, GraphLink>

    switch (layout.type) {
      case 'force':
        simulation = d3.forceSimulation(nodes)
          .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(30))
        break
        
      case 'radial':
        simulation = d3.forceSimulation(nodes)
          .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(80))
          .force('charge', d3.forceManyBody().strength(-200))
          .force('radial', d3.forceRadial(150, width / 2, height / 2))
        break
        
      case 'hierarchic':
        // Simple hierarchical layout - in a real app you'd use dagre or similar
        simulation = d3.forceSimulation(nodes)
          .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(60))
          .force('charge', d3.forceManyBody().strength(-100))
          .force('y', d3.forceY().y(d => (d.index || 0) * 80 + 100))
          .force('x', d3.forceX(width / 2))
        break
        
      default:
        simulation = d3.forceSimulation(nodes)
          .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id))
          .force('charge', d3.forceManyBody())
          .force('center', d3.forceCenter(width / 2, height / 2))
    }

    // Create container groups
    const container = svg.append('g')
    const linksGroup = container.append('g').attr('class', 'links')
    const nodesGroup = container.append('g').attr('class', 'nodes')

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Draw links
    const link = linksGroup
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.relationship.confidence * 3))

    // Draw link labels
    const linkLabel = linksGroup
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d.relationship.type.replace('_', ' ').toLowerCase())

    // Entity type to color mapping
    const getEntityColor = (type: string) => {
      const colors: Record<string, string> = {
        PERSON: '#3b82f6',
        ORGANIZATION: '#8b5cf6',
        LOCATION: '#10b981',
        IP_ADDRESS: '#f59e0b',
        DOMAIN: '#06b6d4',
        EMAIL: '#ec4899',
        FILE: '#ef4444',
        PROJECT: '#84cc16',
        SYSTEM: '#6b7280',
      }
      return colors[type] || '#6b7280'
    }

    // Entity type to icon mapping
    const getEntityIcon = (type: string) => {
      const icons: Record<string, string> = {
        PERSON: '👤',
        ORGANIZATION: '🏢',
        LOCATION: '📍',
        IP_ADDRESS: '🌐',
        DOMAIN: '🔗',
        EMAIL: '📧',
        FILE: '📄',
        PROJECT: '📊',
        SYSTEM: '⚙️',
      }
      return icons[type] || '📊'
    }

    // Draw nodes
    const node = nodesGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        })
      )

    // Node circles
    node.append('circle')
      .attr('r', d => 15 + (d.entity.confidence * 10))
      .attr('fill', d => getEntityColor(d.entity.type))
      .attr('stroke', d => selectedEntityId === d.entity.id ? '#fbbf24' : '#fff')
      .attr('stroke-width', d => selectedEntityId === d.entity.id ? 3 : 2)
      .style('filter', d => selectedEntityId === d.entity.id ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))' : 'none')

    // Node icons (using text for simplicity)
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '12px')
      .text(d => getEntityIcon(d.entity.type))

    // Node labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '25px')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text(d => d.entity.name.length > 15 ? d.entity.name.slice(0, 15) + '...' : d.entity.name)

    // Confidence indicator
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '37px')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .style('pointer-events', 'none')
      .text(d => `${Math.round(d.entity.confidence * 100)}%`)

    // Click handler for nodes
    node.on('click', (event, d) => {
      event.stopPropagation()
      onEntitySelect?.(d.entity)
    })

    // Hover effects
    node.on('mouseenter', function(event, d) {
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', 20 + (d.entity.confidence * 10))
      
      // Highlight connected links
      link.style('stroke-opacity', l => 
        l.source === d || l.target === d ? 1 : 0.2
      )
    })

    node.on('mouseleave', function(event, d) {
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', 15 + (d.entity.confidence * 10))
      
      // Reset link opacity
      link.style('stroke-opacity', 0.6)
    })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)

      linkLabel
        .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [entities, relationships, layout, dimensions, selectedEntityId, onEntitySelect])

  return (
    <div className={cn('relative w-full h-full', className)}>
      <svg
        ref={svgRef}
        className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)' }}
      />
      
      {/* Graph controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Graph Info
          </div>
          <div className="text-xs space-y-1">
            <div>Entities: {entities.length}</div>
            <div>Relationships: {relationships.length}</div>
            <div>Layout: {layout.type}</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-sm">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Entity Types
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Array.from(new Set(entities.map(e => e.type))).map(type => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: (() => {
                  const colors: Record<string, string> = {
                    PERSON: '#3b82f6',
                    ORGANIZATION: '#8b5cf6',
                    LOCATION: '#10b981',
                    IP_ADDRESS: '#f59e0b',
                    DOMAIN: '#06b6d4',
                    EMAIL: '#ec4899',
                    FILE: '#ef4444',
                    PROJECT: '#84cc16',
                    SYSTEM: '#6b7280',
                  }
                  return colors[type] || '#6b7280'
                })() }}
              />
              <span>{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}