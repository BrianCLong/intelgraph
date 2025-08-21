/**
 * IntelGraph Enhanced Cytoscape Canvas Component
 * Production-ready graph visualization with collaborative features
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core, ElementDefinition, NodeSingular, EdgeSingular } from 'cytoscape';
import $ from 'jquery';
import { useDispatch, useSelector } from 'react-redux';
import { addNode, addEdge } from '../store/graphSlice';
import { RootState } from '../store/types';
import { io, Socket } from 'socket.io-client';
import { Box, IconButton, Tooltip, Menu, MenuItem, Typography, Chip } from '@mui/material';
import {
  ZoomIn, ZoomOut, CenterFocusStrong, Download, 
  Lock, LockOpen, Analytics, Visibility, Share,
  FilterAlt, AccountTree, Timeline, Map
} from '@mui/icons-material';

interface GraphNode {
  id: string;
  type: string;
  name: string;
  properties?: Record<string, any>;
  confidence: number;
  locked?: boolean;
  lockedBy?: string;
}

interface GraphCanvasProps {
  investigationId?: string;
  readonly?: boolean;
  onNodeSelect?: (node: any) => void;
  onEdgeSelect?: (edge: any) => void;
  onAnalyticsRequest?: (elementId: string, elementType: 'node' | 'edge') => void;
}

const nodeTypeStyles = {
  PERSON: { backgroundColor: '#3498db', shape: 'ellipse', icon: '👤' },
  ORGANIZATION: { backgroundColor: '#e74c3c', shape: 'rectangle', icon: '🏢' },
  LOCATION: { backgroundColor: '#2ecc71', shape: 'triangle', icon: '📍' },
  EVENT: { backgroundColor: '#f39c12', shape: 'diamond', icon: '📅' },
  DOCUMENT: { backgroundColor: '#9b59b6', shape: 'rectangle', icon: '📄' },
  IP_ADDRESS: { backgroundColor: '#1abc9c', shape: 'hexagon', icon: '🌐' },
  DOMAIN: { backgroundColor: '#34495e', shape: 'rectangle', icon: '🔗' },
  EMAIL: { backgroundColor: '#e67e22', shape: 'ellipse', icon: '📧' },
  PHONE: { backgroundColor: '#95a5a6', shape: 'ellipse', icon: '📞' },
  CUSTOM: { backgroundColor: '#7f8c8d', shape: 'ellipse', icon: '⭐' }
};

const layoutOptions = {
  cola: {
    name: 'cola',
    animate: true,
    refresh: 1,
    maxSimulationTime: 4000,
    fit: true,
    padding: 30,
    nodeSpacing: () => 40,
    edgeLength: () => 80,
    avoidOverlap: true,
    handleDisconnected: true
  },
  cose: {
    name: 'cose',
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 30,
    nodeRepulsion: () => 400000,
    nodeOverlap: 20,
    idealEdgeLength: () => 80,
    edgeElasticity: () => 100
  },
  dagre: {
    name: 'dagre',
    fit: true,
    padding: 30,
    rankDir: 'TB',
    ranker: 'network-simplex',
    nodeSep: 50,
    edgeSep: 10,
    rankSep: 50
  },
  force: {
    name: 'cose-bilkent',
    animate: true,
    fit: true,
    padding: 30,
    nodeRepulsion: 4500,
    idealEdgeLength: 50,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500
  }
};

const GraphCanvas: React.FC<GraphCanvasProps> = ({
  investigationId,
  readonly = false,
  onNodeSelect,
  onEdgeSelect,
  onAnalyticsRequest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<Core | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useDispatch();
  const graph = useSelector((s: RootState) => s.graphData);
  
  const [selectedLayout, setSelectedLayout] = useState('cola');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
  } | null>(null);
  const [lockedNodes, setLockedNodes] = useState<Set<string>>(new Set());
  const [connectedUsers, setConnectedUsers] = useState<Array<{id: string, name: string}>>([]);

  // Initialize Cytoscape with production-ready configuration
  useEffect(() => {
    if (!containerRef.current || cyInstance.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      
      elements: [...graph.nodes, ...graph.edges] as ElementDefinition[],
      
      style: [
        // Base node styles
        {
          selector: 'node',
          style: {
            'width': 'mapData(confidence, 0, 1, 25, 50)',
            'height': 'mapData(confidence, 0, 1, 25, 50)',
            'label': 'data(name)',
            'text-opacity': 0.9,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
            'text-background-padding': '3px',
            'text-border-width': 0.5,
            'text-border-color': '#cccccc',
            'border-width': 2,
            'border-color': '#34495e',
            'overlay-padding': '8px',
            'z-index': 10,
            'min-zoomed-font-size': 8
          }
        },
        
        // Dynamic node type styling
        ...Object.entries(nodeTypeStyles).map(([type, style]) => ({
          selector: `node[type="${type}"]`,
          style: {
            'background-color': style.backgroundColor,
            'shape': style.shape as any,
            'content': `${style.icon} data(name)`
          }
        })),

        // Selected and hover states
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#3498db',
            'z-index': 20
          }
        },
        
        {
          selector: 'node:active',
          style: {
            'overlay-color': '#3498db',
            'overlay-opacity': 0.2
          }
        },

        // Locked nodes
        {
          selector: 'node.locked',
          style: {
            'border-style': 'dashed',
            'border-color': '#e74c3c',
            'border-width': 3
          }
        },

        // Edge styling
        {
          selector: 'edge',
          style: {
            'width': 'mapData(confidence, 0, 1, 1, 5)',
            'line-color': '#7f8c8d',
            'target-arrow-color': '#7f8c8d',
            'target-arrow-shape': 'triangle',
            'target-arrow-size': 8,
            'curve-style': 'bezier',
            'opacity': 'mapData(confidence, 0, 1, 0.4, 1)',
            'label': 'data(type)',
            'font-size': '9px',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
            'text-rotation': 'autorotate',
            'min-zoomed-font-size': 6
          }
        },

        // Selected edge
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#3498db',
            'target-arrow-color': '#3498db',
            'width': 4,
            'z-index': 15
          }
        },

        // Highlighted elements
        {
          selector: '.highlighted',
          style: {
            'border-color': '#f39c12',
            'border-width': 3,
            'line-color': '#f39c12',
            'target-arrow-color': '#f39c12',
            'z-index': 18
          }
        },

        // Filtered (dimmed) elements
        {
          selector: '.filtered',
          style: {
            'opacity': 0.3
          }
        }
      ],

      layout: layoutOptions[selectedLayout as keyof typeof layoutOptions],
      
      // Enhanced interaction options
      minZoom: 0.05,
      maxZoom: 15,
      wheelSensitivity: 0.15,
      boxSelectionEnabled: true,
      selectionType: 'single',
      autoungrabify: false,
      userPanningEnabled: true,
      userZoomingEnabled: true
    });

    cyInstance.current = cy;

    // Enhanced event handlers with jQuery integration
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        setContextMenu(null);
      }
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();
      onNodeSelect?.(nodeData);
      
      // Smooth selection animation with jQuery
      $(node.renderedMidpoint()).animate({ opacity: 0.8 }, 150);
      
      evt.stopPropagation();
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      const edgeData = edge.data();
      onEdgeSelect?.(edgeData);
      evt.stopPropagation();
    });

    // Context menu with right-click
    cy.on('cxttap', (evt) => {
      evt.preventDefault();
      const renderedPosition = evt.renderedPosition || evt.cyRenderedPosition;
      
      if (evt.target !== cy) {
        const targetData = evt.target.data();
        setContextMenu({
          x: renderedPosition.x,
          y: renderedPosition.y,
          nodeId: evt.target.isNode?.() ? targetData.id : undefined,
          edgeId: evt.target.isEdge?.() ? targetData.id : undefined
        });
      } else {
        setContextMenu(null);
      }
    });

    // Advanced hover effects
    cy.on('mouseover', 'node', function(evt) {
      const node = evt.target;
      
      // jQuery fade-in animation for connected elements
      node.connectedEdges().addClass('highlighted');
      node.neighborhood().addClass('highlighted');
      
      // Smooth scaling effect
      $(node).animate({ 
        style: { 'width': '+=5', 'height': '+=5' }
      }, 200);
    });

    cy.on('mouseout', 'node', function(evt) {
      cy.elements().removeClass('highlighted');
      
      // Reset scaling
      const node = evt.target;
      $(node).animate({ 
        style: { 'width': '-=5', 'height': '-=5' }
      }, 200);
    });

    // Double-click for neighborhood focus
    cy.on('dblclick', 'node', (evt) => {
      const node = evt.target;
      cy.animate({
        fit: {
          eles: node.closedNeighborhood(),
          padding: 80
        }
      }, {
        duration: 800,
        easing: 'ease-in-out-cubic'
      });
    });

    // Drag and drop with jQuery smooth effects
    cy.on('grab', 'node', function(evt) {
      $(this).addClass('grabbed');
    });

    cy.on('free', 'node', function(evt) {
      $(this).removeClass('grabbed');
      const nodeData = evt.target.data();
      dispatch(addNode({
        data: nodeData,
        position: evt.target.position()
      }));
    });

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
        cyInstance.current = null;
      }
    };
  }, [dispatch, graph.nodes, graph.edges, selectedLayout, onNodeSelect, onEdgeSelect]);

  // Socket.IO for real-time collaboration
  useEffect(() => {
    if (!investigationId) return;

    socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:4000', {
      auth: {
        token: localStorage.getItem('auth_token')
      }
    });

    socketRef.current.emit('investigation:join', investigationId);

    // Real-time graph updates
    socketRef.current.on('graph:updated', (update) => {
      if (update.type === 'node:add') {
        dispatch(addNode(update.data));
      } else if (update.type === 'edge:add') {
        dispatch(addEdge(update.data));
      }
    });

    // Collaborative locking
    socketRef.current.on('entity:locked', (data) => {
      setLockedNodes(prev => new Set([...prev, data.entityId]));
      if (cyInstance.current) {
        cyInstance.current.getElementById(data.entityId).addClass('locked');
      }
    });

    socketRef.current.on('entity:unlocked', (data) => {
      setLockedNodes(prev => {
        const next = new Set(prev);
        next.delete(data.entityId);
        return next;
      });
      if (cyInstance.current) {
        cyInstance.current.getElementById(data.entityId).removeClass('locked');
      }
    });

    // User presence
    socketRef.current.on('user:joined', (userData) => {
      setConnectedUsers(prev => [...prev, userData]);
    });

    socketRef.current.on('user:left', (userData) => {
      setConnectedUsers(prev => prev.filter(u => u.id !== userData.userId));
    });

    return () => {
      socketRef.current?.emit('investigation:leave', investigationId);
      socketRef.current?.disconnect();
    };
  }, [investigationId, dispatch]);

  // Control handlers
  const handleLayoutChange = useCallback((layout: string) => {
    setSelectedLayout(layout);
    if (cyInstance.current) {
      cyInstance.current.layout(layoutOptions[layout as keyof typeof layoutOptions]).run();
    }
  }, []);

  const handleZoom = useCallback((factor: number) => {
    cyInstance.current?.zoom(cyInstance.current.zoom() * factor);
  }, []);

  const handleFit = useCallback(() => {
    cyInstance.current?.fit(undefined, 50);
  }, []);

  const handleExport = useCallback(() => {
    if (!cyInstance.current) return;
    const png = cyInstance.current.png({
      output: 'blob',
      full: true,
      scale: 2
    });
    const link = document.createElement('a');
    link.download = `graph-${investigationId}-${Date.now()}.png`;
    link.href = URL.createObjectURL(png);
    link.click();
  }, [investigationId]);

  const handleContextAction = useCallback((action: string) => {
    if (!contextMenu) return;
    
    const { nodeId, edgeId } = contextMenu;
    
    switch (action) {
      case 'lock':
        if (nodeId && socketRef.current) {
          socketRef.current.emit('entity:lock', nodeId);
        }
        break;
      case 'unlock':
        if (nodeId && socketRef.current) {
          socketRef.current.emit('entity:unlock', nodeId);
        }
        break;
      case 'analyze':
        if (nodeId) onAnalyticsRequest?.(nodeId, 'node');
        if (edgeId) onAnalyticsRequest?.(edgeId, 'edge');
        break;
      case 'hide':
        if (nodeId) cyInstance.current?.getElementById(nodeId).style('display', 'none');
        if (edgeId) cyInstance.current?.getElementById(edgeId).style('display', 'none');
        break;
    }
    
    setContextMenu(null);
  }, [contextMenu, onAnalyticsRequest]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#f8f9fa' }}>
      {/* Main canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Control toolbar */}
      <Box sx={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, p: 1, boxShadow: 2 }}>
        <Tooltip title="Zoom In"><IconButton size="small" onClick={() => handleZoom(1.25)}><ZoomIn /></IconButton></Tooltip>
        <Tooltip title="Zoom Out"><IconButton size="small" onClick={() => handleZoom(0.8)}><ZoomOut /></IconButton></Tooltip>
        <Tooltip title="Fit to View"><IconButton size="small" onClick={handleFit}><CenterFocusStrong /></IconButton></Tooltip>
        <Tooltip title="Export PNG"><IconButton size="small" onClick={handleExport}><Download /></IconButton></Tooltip>
      </Box>

      {/* Layout selector */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, p: 2, boxShadow: 2, minWidth: 150 }}>
        <Typography variant="subtitle2" gutterBottom>Layout</Typography>
        {Object.keys(layoutOptions).map(layout => (
          <Chip
            key={layout}
            label={layout}
            size="small"
            variant={selectedLayout === layout ? 'filled' : 'outlined'}
            onClick={() => handleLayoutChange(layout)}
            sx={{ m: 0.25 }}
          />
        ))}
      </Box>

      {/* User presence indicator */}
      {connectedUsers.length > 0 && (
        <Box sx={{ position: 'absolute', bottom: 16, left: 16, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, p: 1, boxShadow: 2 }}>
          <Typography variant="caption" color="textSecondary">
            Connected: {connectedUsers.length} users
          </Typography>
        </Box>
      )}

      {/* Context menu */}
      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
      >
        {contextMenu?.nodeId && [
          <MenuItem key="lock" onClick={() => handleContextAction(lockedNodes.has(contextMenu.nodeId!) ? 'unlock' : 'lock')} disabled={readonly}>
            {lockedNodes.has(contextMenu.nodeId!) ? <LockOpen sx={{mr:1}} /> : <Lock sx={{mr:1}} />}
            {lockedNodes.has(contextMenu.nodeId!) ? 'Unlock' : 'Lock'} Node
          </MenuItem>,
          <MenuItem key="analyze" onClick={() => handleContextAction('analyze')}>
            <Analytics sx={{mr:1}} />Analyze Node
          </MenuItem>,
          <MenuItem key="hide" onClick={() => handleContextAction('hide')}>
            <Visibility sx={{mr:1}} />Hide Node
          </MenuItem>
        ]}
        {contextMenu?.edgeId && [
          <MenuItem key="analyze" onClick={() => handleContextAction('analyze')}>
            <Analytics sx={{mr:1}} />Analyze Relationship
          </MenuItem>,
          <MenuItem key="hide" onClick={() => handleContextAction('hide')}>
            <Visibility sx={{mr:1}} />Hide Relationship
          </MenuItem>
        ]}
      </Menu>
    </Box>
  );
};

export default GraphCanvas;
