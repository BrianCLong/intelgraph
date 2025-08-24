import { Driver } from 'neo4j-driver';
import { logger } from '../utils/logger';
import { GraphNode, GraphEdge, GraphSubnet } from './GraphAnalyticsService';

export interface VisualizationLayout {
  type: 'force' | 'hierarchical' | 'circular' | 'grid' | 'concentric' | 'breadthfirst';
  options: Record<string, any>;
}

export interface NodeStyle {
  size: number;
  color: string;
  shape: 'ellipse' | 'triangle' | 'rectangle' | 'diamond' | 'star' | 'pentagon';
  borderWidth: number;
  borderColor: string;
  label?: {
    text: string;
    fontSize: number;
    color: string;
    position: 'center' | 'top' | 'bottom';
  };
}

export interface EdgeStyle {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  arrow: boolean;
  curvature: number;
  label?: {
    text: string;
    fontSize: number;
    color: string;
  };
}

export interface VisualizationConfig {
  layout: VisualizationLayout;
  nodeStyles: Record<string, NodeStyle>; // Keyed by node label/type
  edgeStyles: Record<string, EdgeStyle>; // Keyed by relationship type
  filters: {
    nodeLabels?: string[];
    relationshipTypes?: string[];
    propertyFilters?: { property: string; operator: string; value: any }[];
  };
  rendering: {
    showLabels: boolean;
    showEdgeLabels: boolean;
    enablePhysics: boolean;
    enableInteraction: boolean;
    backgroundColor: string;
    theme: 'light' | 'dark';
  };
  performance: {
    maxNodes: number;
    maxEdges: number;
    simplifyBeyondThreshold: boolean;
    clustering: boolean;
  };
}

export interface NetworkVisualization {
  id: string;
  name: string;
  description?: string;
  config: VisualizationConfig;
  data: {
    nodes: (GraphNode & { style: NodeStyle; position?: { x: number; y: number } })[];
    edges: (GraphEdge & { style: EdgeStyle })[];
  };
  metadata: {
    totalNodes: number;
    totalEdges: number;
    visibleNodes: number;
    visibleEdges: number;
    renderTime?: number;
    generatedAt: Date;
  };
}

export interface InteractiveFeatures {
  nodeClick: {
    action: 'expand' | 'highlight' | 'details' | 'custom';
    config: Record<string, any>;
  };
  nodeHover: {
    showTooltip: boolean;
    highlightConnections: boolean;
    tooltipTemplate: string;
  };
  selection: {
    multiSelect: boolean;
    selectConnected: boolean;
    actions: Array<{
      name: string;
      action: string;
      icon?: string;
    }>;
  };
}

export class NetworkVisualizationService {
  constructor(private neo4jDriver: Driver) {}

  async generateVisualization(
    query: string,
    parameters: Record<string, any>,
    config: VisualizationConfig
  ): Promise<NetworkVisualization> {
    const session = this.neo4jDriver.session();
    const startTime = Date.now();
    
    try {
      logger.info('Generating network visualization', { query, config });
      
      // Execute query to get graph data
      const result = await session.run(query, parameters);
      
      const nodes = new Map<string, GraphNode>();
      const edges = new Map<string, GraphEdge>();
      
      // Extract nodes and relationships from query results
      result.records.forEach(record => {
        record.keys.forEach(key => {
          const value = record.get(key);
          
          if (value?.constructor?.name === 'Node') {
            const node = this.extractNode(value);
            if (this.shouldIncludeNode(node, config.filters)) {
              nodes.set(node.id, node);
            }
          } else if (value?.constructor?.name === 'Relationship') {
            const edge = this.extractEdge(value);
            if (this.shouldIncludeEdge(edge, config.filters)) {
              edges.set(edge.id, edge);
            }
          } else if (value?.constructor?.name === 'Path') {
            // Extract nodes and relationships from path
            const pathNodes = value.segments.flatMap((segment: any) => [segment.start, segment.end]);
            const pathRels = value.segments.map((segment: any) => segment.relationship);
            
            pathNodes.forEach((nodeValue: any) => {
              const node = this.extractNode(nodeValue);
              if (this.shouldIncludeNode(node, config.filters)) {
                nodes.set(node.id, node);
              }
            });
            
            pathRels.forEach((relValue: any) => {
              const edge = this.extractEdge(relValue);
              if (this.shouldIncludeEdge(edge, config.filters)) {
                edges.set(edge.id, edge);
              }
            });
          }
        });
      });
      
      // Apply performance limits
      const nodeArray = Array.from(nodes.values());
      const edgeArray = Array.from(edges.values());
      
      let visibleNodes = nodeArray;
      let visibleEdges = edgeArray;
      
      // Apply node limit
      if (nodeArray.length > config.performance.maxNodes) {
        if (config.performance.simplifyBeyondThreshold) {
          // Keep high-degree nodes and cluster others
          visibleNodes = this.simplifyNetwork(nodeArray, edgeArray, config.performance.maxNodes);
        } else {
          // Just truncate
          visibleNodes = nodeArray.slice(0, config.performance.maxNodes);
        }
      }
      
      // Filter edges to only include those between visible nodes
      const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
      visibleEdges = edgeArray.filter(edge => 
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
      );
      
      // Apply edge limit
      if (visibleEdges.length > config.performance.maxEdges) {
        // Keep edges with highest weights or most important relationships
        visibleEdges = visibleEdges
          .sort((a, b) => (b.weight || 1) - (a.weight || 1))
          .slice(0, config.performance.maxEdges);
      }
      
      // Apply styles
      const styledNodes = visibleNodes.map(node => ({
        ...node,
        style: this.getNodeStyle(node, config.nodeStyles),
        position: this.calculateNodePosition(node, visibleNodes, config.layout)
      }));
      
      const styledEdges = visibleEdges.map(edge => ({
        ...edge,
        style: this.getEdgeStyle(edge, config.edgeStyles)
      }));
      
      const renderTime = Date.now() - startTime;
      
      const visualization: NetworkVisualization = {
        id: `viz-${Date.now()}`,
        name: `Network Visualization ${new Date().toLocaleString()}`,
        config,
        data: {
          nodes: styledNodes,
          edges: styledEdges
        },
        metadata: {
          totalNodes: nodeArray.length,
          totalEdges: edgeArray.length,
          visibleNodes: styledNodes.length,
          visibleEdges: styledEdges.length,
          renderTime,
          generatedAt: new Date()
        }
      };
      
      logger.info('Network visualization generated', {
        totalNodes: nodeArray.length,
        totalEdges: edgeArray.length,
        visibleNodes: styledNodes.length,
        visibleEdges: styledEdges.length,
        renderTime
      });
      
      return visualization;
      
    } catch (error) {
      logger.error('Error generating network visualization:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async generateSubnetVisualization(
    centerNodeId: string,
    depth: number,
    config: Partial<VisualizationConfig> = {}
  ): Promise<NetworkVisualization> {
    const defaultConfig: VisualizationConfig = {
      layout: { type: 'force', options: { iterations: 1000 } },
      nodeStyles: {},
      edgeStyles: {},
      filters: {},
      rendering: {
        showLabels: true,
        showEdgeLabels: false,
        enablePhysics: true,
        enableInteraction: true,
        backgroundColor: '#ffffff',
        theme: 'light'
      },
      performance: {
        maxNodes: 500,
        maxEdges: 1000,
        simplifyBeyondThreshold: true,
        clustering: false
      }
    };
    
    const finalConfig = this.mergeConfig(defaultConfig, config);
    
    const query = `
      MATCH path = (center {id: $centerNodeId})-[*1..${depth}]-(connected)
      RETURN center, connected, relationships(path) as rels, path
    `;
    
    return this.generateVisualization(query, { centerNodeId }, finalConfig);
  }

  async generateCommunityVisualization(
    communityIds: string[],
    config: Partial<VisualizationConfig> = {}
  ): Promise<NetworkVisualization> {
    const defaultConfig: VisualizationConfig = {
      layout: { type: 'force', options: { nodeRepulsion: 500, edgeLength: 100 } },
      nodeStyles: {},
      edgeStyles: {},
      filters: {},
      rendering: {
        showLabels: true,
        showEdgeLabels: false,
        enablePhysics: true,
        enableInteraction: true,
        backgroundColor: '#ffffff',
        theme: 'light'
      },
      performance: {
        maxNodes: 1000,
        maxEdges: 2000,
        simplifyBeyondThreshold: true,
        clustering: true
      }
    };
    
    const finalConfig = this.mergeConfig(defaultConfig, config);
    
    const query = `
      MATCH (n)
      WHERE n.community_id IN $communityIds
      OPTIONAL MATCH (n)-[r]-(m)
      WHERE m.community_id IN $communityIds
      RETURN n, m, r
    `;
    
    return this.generateVisualization(query, { communityIds }, finalConfig);
  }

  async generatePathVisualization(
    sourceId: string,
    targetId: string,
    pathType: 'shortest' | 'all' = 'shortest',
    config: Partial<VisualizationConfig> = {}
  ): Promise<NetworkVisualization> {
    const defaultConfig: VisualizationConfig = {
      layout: { type: 'hierarchical', options: { direction: 'LR' } },
      nodeStyles: {
        source: { size: 30, color: '#4CAF50', shape: 'diamond', borderWidth: 3, borderColor: '#2E7D32' },
        target: { size: 30, color: '#F44336', shape: 'diamond', borderWidth: 3, borderColor: '#C62828' },
        intermediate: { size: 20, color: '#2196F3', shape: 'ellipse', borderWidth: 2, borderColor: '#1565C0' }
      },
      edgeStyles: {
        path: { width: 3, color: '#FF9800', style: 'solid', arrow: true, curvature: 0.1 }
      },
      filters: {},
      rendering: {
        showLabels: true,
        showEdgeLabels: true,
        enablePhysics: false,
        enableInteraction: true,
        backgroundColor: '#ffffff',
        theme: 'light'
      },
      performance: {
        maxNodes: 200,
        maxEdges: 300,
        simplifyBeyondThreshold: false,
        clustering: false
      }
    };
    
    const finalConfig = this.mergeConfig(defaultConfig, config);
    
    const query = pathType === 'shortest'
      ? `
        MATCH path = shortestPath((source {id: $sourceId})-[*]-(target {id: $targetId}))
        RETURN path, nodes(path) as nodes, relationships(path) as rels
        `
      : `
        MATCH path = (source {id: $sourceId})-[*1..6]-(target {id: $targetId})
        RETURN path, nodes(path) as nodes, relationships(path) as rels
        LIMIT 10
        `;
    
    return this.generateVisualization(query, { sourceId, targetId }, finalConfig);
  }

  async generateTimelineVisualization(
    timeRange: { start: Date; end: Date },
    config: Partial<VisualizationConfig> = {}
  ): Promise<NetworkVisualization> {
    const defaultConfig: VisualizationConfig = {
      layout: { type: 'breadthfirst', options: { directed: true } },
      nodeStyles: {},
      edgeStyles: {},
      filters: {},
      rendering: {
        showLabels: true,
        showEdgeLabels: false,
        enablePhysics: true,
        enableInteraction: true,
        backgroundColor: '#ffffff',
        theme: 'light'
      },
      performance: {
        maxNodes: 800,
        maxEdges: 1500,
        simplifyBeyondThreshold: true,
        clustering: false
      }
    };
    
    const finalConfig = this.mergeConfig(defaultConfig, config);
    
    const query = `
      MATCH (n)
      WHERE n.created_at >= $startTime AND n.created_at <= $endTime
      OPTIONAL MATCH (n)-[r]-(m)
      WHERE r.created_at >= $startTime AND r.created_at <= $endTime
      RETURN n, m, r
      ORDER BY n.created_at ASC
    `;
    
    return this.generateVisualization(query, {
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString()
    }, finalConfig);
  }

  private extractNode(nodeValue: any): GraphNode {
    return {
      id: nodeValue.identity?.toString() || nodeValue.properties?.id || Math.random().toString(),
      labels: nodeValue.labels || [],
      properties: nodeValue.properties || {}
    };
  }

  private extractEdge(relValue: any): GraphEdge {
    return {
      id: relValue.identity?.toString() || Math.random().toString(),
      source: relValue.start?.toString() || relValue.startNodeId?.toString(),
      target: relValue.end?.toString() || relValue.endNodeId?.toString(),
      type: relValue.type || 'CONNECTED_TO',
      properties: relValue.properties || {},
      weight: relValue.properties?.weight || 1
    };
  }

  private shouldIncludeNode(node: GraphNode, filters: VisualizationConfig['filters']): boolean {
    // Apply node label filters
    if (filters.nodeLabels && filters.nodeLabels.length > 0) {
      if (!node.labels.some(label => filters.nodeLabels!.includes(label))) {
        return false;
      }
    }
    
    // Apply property filters
    if (filters.propertyFilters) {
      for (const filter of filters.propertyFilters) {
        const value = node.properties[filter.property];
        if (!this.evaluatePropertyFilter(value, filter.operator, filter.value)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private shouldIncludeEdge(edge: GraphEdge, filters: VisualizationConfig['filters']): boolean {
    // Apply relationship type filters
    if (filters.relationshipTypes && filters.relationshipTypes.length > 0) {
      if (!filters.relationshipTypes.includes(edge.type)) {
        return false;
      }
    }
    
    return true;
  }

  private evaluatePropertyFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'eq': return value === filterValue;
      case 'ne': return value !== filterValue;
      case 'gt': return value > filterValue;
      case 'gte': return value >= filterValue;
      case 'lt': return value < filterValue;
      case 'lte': return value <= filterValue;
      case 'contains': return String(value).includes(filterValue);
      case 'startsWith': return String(value).startsWith(filterValue);
      case 'endsWith': return String(value).endsWith(filterValue);
      case 'in': return Array.isArray(filterValue) && filterValue.includes(value);
      default: return true;
    }
  }

  private simplifyNetwork(nodes: GraphNode[], edges: GraphEdge[], maxNodes: number): GraphNode[] {
    // Calculate node degrees
    const degrees = new Map<string, number>();
    nodes.forEach(node => degrees.set(node.id, 0));
    
    edges.forEach(edge => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });
    
    // Sort nodes by degree (descending) and take top maxNodes
    return nodes
      .sort((a, b) => (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0))
      .slice(0, maxNodes);
  }

  private getNodeStyle(node: GraphNode, nodeStyles: Record<string, NodeStyle>): NodeStyle {
    // Find matching style based on node labels
    for (const label of node.labels) {
      if (nodeStyles[label]) {
        return { ...this.getDefaultNodeStyle(), ...nodeStyles[label] };
      }
    }
    
    // Check for special node types
    if (node.properties.isCenter) {
      return { ...this.getDefaultNodeStyle(), ...nodeStyles.center };
    }
    
    return this.getDefaultNodeStyle();
  }

  private getEdgeStyle(edge: GraphEdge, edgeStyles: Record<string, EdgeStyle>): EdgeStyle {
    if (edgeStyles[edge.type]) {
      return { ...this.getDefaultEdgeStyle(), ...edgeStyles[edge.type] };
    }
    
    return this.getDefaultEdgeStyle();
  }

  private getDefaultNodeStyle(): NodeStyle {
    return {
      size: 20,
      color: '#2196F3',
      shape: 'ellipse',
      borderWidth: 2,
      borderColor: '#1565C0',
      label: {
        text: '',
        fontSize: 12,
        color: '#333333',
        position: 'center'
      }
    };
  }

  private getDefaultEdgeStyle(): EdgeStyle {
    return {
      width: 2,
      color: '#666666',
      style: 'solid',
      arrow: true,
      curvature: 0.1,
      label: {
        text: '',
        fontSize: 10,
        color: '#666666'
      }
    };
  }

  private calculateNodePosition(
    node: GraphNode,
    allNodes: GraphNode[],
    layout: VisualizationLayout
  ): { x: number; y: number } {
    // This would implement actual layout algorithms
    // For now, return random positions
    return {
      x: Math.random() * 1000,
      y: Math.random() * 1000
    };
  }

  private mergeConfig(
    defaultConfig: VisualizationConfig,
    userConfig: Partial<VisualizationConfig>
  ): VisualizationConfig {
    return {
      layout: { ...defaultConfig.layout, ...userConfig.layout },
      nodeStyles: { ...defaultConfig.nodeStyles, ...userConfig.nodeStyles },
      edgeStyles: { ...defaultConfig.edgeStyles, ...userConfig.edgeStyles },
      filters: { ...defaultConfig.filters, ...userConfig.filters },
      rendering: { ...defaultConfig.rendering, ...userConfig.rendering },
      performance: { ...defaultConfig.performance, ...userConfig.performance }
    };
  }

  // Export visualization data for external tools
  async exportVisualization(
    visualization: NetworkVisualization,
    format: 'cytoscape' | 'gephi' | 'graphml' | 'json'
  ): Promise<string> {
    switch (format) {
      case 'cytoscape':
        return this.exportToCytoscape(visualization);
      case 'gephi':
        return this.exportToGephi(visualization);
      case 'graphml':
        return this.exportToGraphML(visualization);
      case 'json':
        return JSON.stringify(visualization, null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCytoscape(visualization: NetworkVisualization): string {
    const cytoscapeData = {
      elements: {
        nodes: visualization.data.nodes.map(node => ({
          data: {
            id: node.id,
            label: node.properties.name || node.properties.title || node.id,
            ...node.properties
          },
          style: node.style,
          position: node.position
        })),
        edges: visualization.data.edges.map(edge => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.type,
            weight: edge.weight,
            ...edge.properties
          },
          style: edge.style
        }))
      },
      layout: visualization.config.layout
    };
    
    return JSON.stringify(cytoscapeData, null, 2);
  }

  private exportToGephi(visualization: NetworkVisualization): string {
    // Gephi GEXF format
    const nodes = visualization.data.nodes.map(node => 
      `    <node id="${node.id}" label="${node.properties.name || node.id}"/>`
    ).join('\n');
    
    const edges = visualization.data.edges.map((edge, index) => 
      `    <edge id="${index}" source="${edge.source}" target="${edge.target}" weight="${edge.weight || 1}"/>`
    ).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <graph mode="static" defaultedgetype="undirected">
    <nodes>
${nodes}
    </nodes>
    <edges>
${edges}
    </edges>
  </graph>
</gexf>`;
  }

  private exportToGraphML(visualization: NetworkVisualization): string {
    const nodes = visualization.data.nodes.map(node => 
      `    <node id="${node.id}">
      <data key="name">${node.properties.name || node.id}</data>
    </node>`
    ).join('\n');
    
    const edges = visualization.data.edges.map((edge, index) => 
      `    <edge id="e${index}" source="${edge.source}" target="${edge.target}">
      <data key="weight">${edge.weight || 1}</data>
    </edge>`
    ).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  <graph id="G" edgedefault="undirected">
${nodes}
${edges}
  </graph>
</graphml>`;
  }
}