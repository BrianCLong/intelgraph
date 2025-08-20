/**
 * MVP-0 Canvas Component
 * Level-of-Detail (LOD) optimized graph canvas
 * Requirements:
 * - Maximum 3k nodes / 6k edges visible
 * - ≥55 fps performance target 
 * - Performance overlay for monitoring
 * - Progressive loading with confidence-based filtering
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { 
  Box, 
  Paper, 
  Typography, 
  Chip, 
  Slider, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress 
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  CenterFocusStrong, 
  Visibility,
  Speed,
  Memory,
  Timeline 
} from '@mui/icons-material';
import Cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import fcose from 'cytoscape-fcose';
import { gql } from '@apollo/client';

// Register Cytoscape extensions
Cytoscape.use(coseBilkent);
Cytoscape.use(fcose);

// GraphQL queries
const GRAPH_CANVAS_QUERY = gql`
  query GraphCanvas(
    $investigationId: ID!
    $lodLevel: LODLevel = FOCUSED
    $maxNodes: Int = 3000
    $maxEdges: Int = 6000
    $minConfidence: Float = 0.5
  ) {
    graphCanvas(
      investigationId: $investigationId
      lodLevel: $lodLevel
      maxNodes: $maxNodes
      maxEdges: $maxEdges  
      minConfidence: $minConfidence
    ) {
      nodes {
        id
        type
        label
        confidence
        properties
        createdAt
        updatedAt
      }
      edges {
        id
        type
        sourceEntityId
        targetEntityId
        confidence
        properties
        createdAt
      }
      totalNodes
      totalEdges
      displayLevel
      hasMore
      queryTime
      cacheHit
    }
  }
`;

// LOD level configurations
const LOD_CONFIGS = {
  OVERVIEW: { 
    maxNodes: 100, 
    maxEdges: 200,
    minConfidence: 0.8,
    nodeSize: 20,
    edgeWidth: 1,
    labels: false
  },
  DETAILED: { 
    maxNodes: 1000, 
    maxEdges: 2000,
    minConfidence: 0.6,
    nodeSize: 25,
    edgeWidth: 2,
    labels: true
  },
  FOCUSED: { 
    maxNodes: 3000, 
    maxEdges: 6000,
    minConfidence: 0.5,
    nodeSize: 30,
    edgeWidth: 2,
    labels: true
  },
  MAXIMUM: { 
    maxNodes: 3000, 
    maxEdges: 6000,
    minConfidence: 0.3,
    nodeSize: 35,
    edgeWidth: 3,
    labels: true
  }
};

// Performance monitoring hook
const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    nodeCount: 0,
    edgeCount: 0,
    lastUpdate: Date.now()
  });

  const updateMetrics = useCallback((newMetrics) => {
    setMetrics(prev => ({
      ...prev,
      ...newMetrics,
      lastUpdate: Date.now()
    }));
  }, []);

  return { metrics, updateMetrics };
};

const MVP0Canvas = ({ 
  investigationId, 
  onNodeSelect, 
  onEdgeSelect, 
  selectedNode,
  className 
}) => {
  // Refs and state
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const performanceRef = useRef({ frameCount: 0, lastTime: Date.now() });
  
  const [lodLevel, setLodLevel] = useState('FOCUSED');
  const [confidenceFilter, setConfidenceFilter] = useState(0.5);
  const [layoutName, setLayoutName] = useState('fcose');
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);
  const [showPerformanceOverlay, setShowPerformanceOverlay] = useState(true);

  const { metrics, updateMetrics } = usePerformanceMonitor();

  // GraphQL query with optimized variables
  const { data, loading, error, refetch } = useQuery(GRAPH_CANVAS_QUERY, {
    variables: {
      investigationId,
      lodLevel,
      maxNodes: LOD_CONFIGS[lodLevel].maxNodes,
      maxEdges: LOD_CONFIGS[lodLevel].maxEdges,
      minConfidence: confidenceFilter
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'partial'
  });

  // Memoized Cytoscape configuration
  const cytoscapeConfig = useMemo(() => {
    const config = LOD_CONFIGS[lodLevel];
    
    return {
      container: containerRef.current,
      wheelSensitivity: 0.1,
      minZoom: 0.1,
      maxZoom: 3.0,
      style: [
        {
          selector: 'node',
          style: {
            'width': config.nodeSize,
            'height': config.nodeSize,
            'label': config.labels ? 'data(label)' : '',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#000',
            'text-outline-color': '#fff',
            'text-outline-width': 1,
            'background-opacity': 0.8,
            'border-width': 2,
            'border-opacity': 1,
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node[type="PERSON"]',
          style: {
            'background-color': '#4CAF50',
            'border-color': '#388E3C'
          }
        },
        {
          selector: 'node[type="ORGANIZATION"]',
          style: {
            'background-color': '#2196F3',
            'border-color': '#1976D2'
          }
        },
        {
          selector: 'node[type="LOCATION"]',
          style: {
            'background-color': '#FF9800',
            'border-color': '#F57C00'
          }
        },
        {
          selector: 'node[type="EMAIL"]',
          style: {
            'background-color': '#9C27B0',
            'border-color': '#7B1FA2'
          }
        },
        {
          selector: 'node[type="PHONE"]',
          style: {
            'background-color': '#E91E63',
            'border-color': '#C2185B'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#FF5722',
            'background-opacity': 1
          }
        },
        {
          selector: 'edge',
          style: {
            'width': config.edgeWidth,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.7
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'width': config.edgeWidth + 1,
            'line-color': '#FF5722',
            'target-arrow-color': '#FF5722',
            'opacity': 1
          }
        },
        {
          selector: 'node[confidence < 0.5]',
          style: {
            'opacity': 0.6,
            'border-style': 'dashed'
          }
        },
        {
          selector: 'edge[confidence < 0.5]',
          style: {
            'opacity': 0.4,
            'line-style': 'dashed'
          }
        }
      ]
    };
  }, [lodLevel]);

  // Performance monitoring
  useEffect(() => {
    const monitor = () => {
      if (cyRef.current) {
        const now = Date.now();
        const delta = now - performanceRef.current.lastTime;
        
        if (delta >= 1000) { // Update every second
          const fps = Math.round(performanceRef.current.frameCount * 1000 / delta);
          performanceRef.current.frameCount = 0;
          performanceRef.current.lastTime = now;
          
          // Memory usage (approximation)
          const memoryUsage = performance.memory ? 
            Math.round(performance.memory.usedJSHeapSize / 1048576) : 0;
          
          updateMetrics({
            fps,
            memoryUsage,
            nodeCount: cyRef.current.nodes().length,
            edgeCount: cyRef.current.edges().length
          });
          
          // Performance warning if below target
          if (fps < 55) {
            console.warn(`Canvas performance below target: ${fps} fps < 55 fps`);
          }
        }
        
        performanceRef.current.frameCount++;
      }
      
      requestAnimationFrame(monitor);
    };
    
    const rafId = requestAnimationFrame(monitor);
    return () => cancelAnimationFrame(rafId);
  }, [updateMetrics]);

  // Initialize Cytoscape
  useEffect(() => {
    if (containerRef.current && !cyRef.current) {
      cyRef.current = Cytoscape(cytoscapeConfig);
      
      // Event handlers
      cyRef.current.on('tap', 'node', (evt) => {
        const node = evt.target;
        onNodeSelect?.(node.data());
      });
      
      cyRef.current.on('tap', 'edge', (evt) => {
        const edge = evt.target;
        onEdgeSelect?.(edge.data());
      });
      
      // Layout events
      cyRef.current.on('layoutstart', () => setIsLayoutRunning(true));
      cyRef.current.on('layoutstop', () => setIsLayoutRunning(false));
    }
    
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [cytoscapeConfig, onNodeSelect, onEdgeSelect]);

  // Update graph data
  useEffect(() => {
    if (data?.graphCanvas && cyRef.current) {
      const { nodes, edges } = data.graphCanvas;
      const startTime = performance.now();
      
      // Convert data to Cytoscape format with MVP-0 optimizations
      const cyNodes = nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          confidence: node.confidence,
          properties: node.properties
        },
        classes: `node-${node.type.toLowerCase()}`
      }));
      
      const cyEdges = edges.map(edge => ({
        data: {
          id: edge.id,
          source: edge.sourceEntityId,
          target: edge.targetEntityId,
          label: edge.type,
          type: edge.type,
          confidence: edge.confidence,
          properties: edge.properties
        }
      }));
      
      // Batch update for performance
      cyRef.current.batch(() => {
        cyRef.current.elements().remove();
        cyRef.current.add(cyNodes.concat(cyEdges));
      });
      
      // Run layout if nodes were added
      if (cyNodes.length > 0) {
        runLayout();
      }
      
      const renderTime = performance.now() - startTime;
      updateMetrics({ renderTime });
      
      // Log performance info
      console.log(`Canvas updated: ${cyNodes.length} nodes, ${cyEdges.length} edges, ${renderTime.toFixed(1)}ms`);
    }
  }, [data, updateMetrics]);

  // Layout functions
  const runLayout = useCallback(() => {
    if (!cyRef.current) return;
    
    const layoutOptions = {
      fcose: {
        name: 'fcose',
        quality: 'default',
        randomize: false,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
        uniformNodeDimensions: false,
        packComponents: true,
        stepSize: 1,
        samplingType: true,
        sampleSize: 25,
        nodeSeparation: 75,
        piTol: 0.0001,
        numIter: 2500
      },
      'cose-bilkent': {
        name: 'cose-bilkent',
        quality: 'default',
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
        randomize: false,
        nodeRepulsion: 4500,
        idealEdgeLength: 50,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.4,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10
      }
    };
    
    const layout = cyRef.current.layout(layoutOptions[layoutName] || layoutOptions.fcose);
    layout.run();
  }, [layoutName]);

  // Control handlers
  const handleLodChange = (event) => {
    setLodLevel(event.target.value);
  };

  const handleConfidenceChange = (event, newValue) => {
    setConfidenceFilter(newValue);
  };

  const handleZoomIn = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  };

  const handleZoomOut = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleCenter = () => {
    cyRef.current?.fit(null, 50);
  };

  const handleLayoutChange = (event) => {
    setLayoutName(event.target.value);
    runLayout();
  };

  // Performance status color
  const getPerformanceColor = (fps) => {
    if (fps >= 55) return 'success';
    if (fps >= 45) return 'warning'; 
    return 'error';
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load canvas: {error.message}
      </Alert>
    );
  }

  return (
    <Box className={className} sx={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>LOD Level</InputLabel>
            <Select value={lodLevel} onChange={handleLodChange}>
              <MenuItem value="OVERVIEW">Overview</MenuItem>
              <MenuItem value="DETAILED">Detailed</MenuItem>
              <MenuItem value="FOCUSED">Focused</MenuItem>
              <MenuItem value="MAXIMUM">Maximum</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Layout</InputLabel>
            <Select value={layoutName} onChange={handleLayoutChange}>
              <MenuItem value="fcose">F-CoSE</MenuItem>
              <MenuItem value="cose-bilkent">CoSE Bilkent</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
            <Typography variant="body2">Confidence:</Typography>
            <Slider
              value={confidenceFilter}
              onChange={handleConfidenceChange}
              min={0}
              max={1}
              step={0.1}
              size="small"
              valueLabelDisplay="auto"
              sx={{ flex: 1 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={handleZoomIn}><ZoomIn /></Button>
            <Button size="small" onClick={handleZoomOut}><ZoomOut /></Button>
            <Button size="small" onClick={handleCenter}><CenterFocusStrong /></Button>
            <Button 
              size="small" 
              onClick={() => setShowPerformanceOverlay(!showPerformanceOverlay)}
            >
              <Speed />
            </Button>
          </Box>
          
          {loading && <CircularProgress size={20} />}
        </Box>
      </Paper>

      {/* Canvas Container */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 400 }}>
        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '100%', 
            background: '#fafafa',
            border: '1px solid #e0e0e0'
          }} 
        />
        
        {/* Performance Overlay */}
        {showPerformanceOverlay && (
          <Paper 
            sx={{ 
              position: 'absolute', 
              top: 10, 
              right: 10, 
              p: 1.5,
              bgcolor: 'rgba(255,255,255,0.95)',
              minWidth: 200
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Performance Monitor
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">FPS:</Typography>
                <Chip 
                  size="small" 
                  label={metrics.fps}
                  color={getPerformanceColor(metrics.fps)}
                  icon={<Timeline />}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Memory:</Typography>
                <Chip 
                  size="small" 
                  label={`${metrics.memoryUsage}MB`}
                  icon={<Memory />}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Nodes:</Typography>
                <Chip 
                  size="small" 
                  label={metrics.nodeCount}
                  color={metrics.nodeCount > 3000 ? 'warning' : 'default'}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Edges:</Typography>
                <Chip 
                  size="small" 
                  label={metrics.edgeCount}
                  color={metrics.edgeCount > 6000 ? 'warning' : 'default'}
                />
              </Box>
              
              {data?.graphCanvas && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Query Time:</Typography>
                    <Chip 
                      size="small" 
                      label={`${(data.graphCanvas.queryTime * 1000).toFixed(0)}ms`}
                      color={data.graphCanvas.queryTime > 0.5 ? 'warning' : 'success'}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Cache:</Typography>
                    <Chip 
                      size="small" 
                      label={data.graphCanvas.cacheHit ? 'HIT' : 'MISS'}
                      color={data.graphCanvas.cacheHit ? 'success' : 'default'}
                      icon={<Visibility />}
                    />
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        )}
        
        {/* Layout Running Indicator */}
        {isLayoutRunning && (
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: 10, 
              left: '50%', 
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              px: 2,
              py: 1,
              borderRadius: 1
            }}
          >
            <CircularProgress size={16} color="inherit" />
            <Typography variant="body2">Layout in progress...</Typography>
          </Box>
        )}
      </Box>
      
      {/* Status Bar */}
      {data?.graphCanvas && (
        <Paper sx={{ p: 1, mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2">
                Displaying: {data.graphCanvas.nodes.length} nodes, {data.graphCanvas.edges.length} edges
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total: {data.graphCanvas.totalNodes} nodes, {data.graphCanvas.totalEdges} edges
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                size="small" 
                label={data.graphCanvas.displayLevel}
                variant="outlined"
              />
              {data.graphCanvas.hasMore && (
                <Chip 
                  size="small" 
                  label="More Available"
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default MVP0Canvas;