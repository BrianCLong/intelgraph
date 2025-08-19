/**
 * Canvas Performance Utilities for MVP-0
 * Ensures ≥55 fps performance with 3k/6k node/edge limits
 */

// Performance monitoring and optimization utilities
export class CanvasPerformanceMonitor {
  constructor(options = {}) {
    this.targetFps = options.targetFps || 55;
    this.maxNodes = options.maxNodes || 3000;
    this.maxEdges = options.maxEdges || 6000;
    
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.isRunning = false;
    
    this.callbacks = new Set();
    this.rafId = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick() {
    if (!this.isRunning) return;
    
    this.frameCount++;
    const now = performance.now();
    const delta = now - this.lastTime;
    
    if (delta >= 1000) { // Update every second
      this.fps = Math.round(this.frameCount * 1000 / delta);
      this.frameCount = 0;
      this.lastTime = now;
      
      // Notify callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(this.getMetrics());
        } catch (error) {
          console.warn('Performance callback error:', error);
        }
      });
    }
    
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  getMetrics() {
    return {
      fps: this.fps,
      memoryUsage: this.getMemoryUsage(),
      isPerformant: this.fps >= this.targetFps,
      timestamp: Date.now()
    };
  }

  getMemoryUsage() {
    if (!performance.memory) return 0;
    return Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
  }

  onMetricsUpdate(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
}

// Level-of-Detail (LOD) system for performance optimization
export class LODManager {
  constructor() {
    this.thresholds = {
      OVERVIEW: { maxNodes: 100, maxEdges: 200, minConfidence: 0.8 },
      DETAILED: { maxNodes: 1000, maxEdges: 2000, minConfidence: 0.6 },
      FOCUSED: { maxNodes: 3000, maxEdges: 6000, minConfidence: 0.5 },
      MAXIMUM: { maxNodes: 3000, maxEdges: 6000, minConfidence: 0.3 }
    };
    
    this.currentLevel = 'FOCUSED';
    this.adaptiveMode = true;
  }

  // Automatically adjust LOD based on performance
  adaptToPerformance(fps, nodeCount, edgeCount) {
    if (!this.adaptiveMode) return this.currentLevel;
    
    // Performance is good, try upgrading
    if (fps >= 60) {
      if (this.currentLevel === 'OVERVIEW' && nodeCount < 500) {
        this.currentLevel = 'DETAILED';
      } else if (this.currentLevel === 'DETAILED' && nodeCount < 2000) {
        this.currentLevel = 'FOCUSED';
      } else if (this.currentLevel === 'FOCUSED' && nodeCount < 2500) {
        this.currentLevel = 'MAXIMUM';
      }
    }
    
    // Performance is poor, downgrade
    if (fps < 45) {
      if (this.currentLevel === 'MAXIMUM') {
        this.currentLevel = 'FOCUSED';
      } else if (this.currentLevel === 'FOCUSED') {
        this.currentLevel = 'DETAILED';
      } else if (this.currentLevel === 'DETAILED') {
        this.currentLevel = 'OVERVIEW';
      }
    }
    
    return this.currentLevel;
  }

  getLevelConfig(level = this.currentLevel) {
    return this.thresholds[level] || this.thresholds.FOCUSED;
  }

  // Filter data based on current LOD level
  filterGraphData(nodes, edges, level = this.currentLevel) {
    const config = this.getLevelConfig(level);
    
    // Sort by confidence and creation time
    const sortedNodes = nodes
      .filter(node => node.confidence >= config.minConfidence)
      .sort((a, b) => {
        // Primary sort: confidence (desc)
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        // Secondary sort: creation time (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
      .slice(0, config.maxNodes);

    // Get node IDs for edge filtering
    const nodeIds = new Set(sortedNodes.map(n => n.id));
    
    // Filter edges to only include those between visible nodes
    const filteredEdges = edges
      .filter(edge => 
        nodeIds.has(edge.sourceEntityId) && 
        nodeIds.has(edge.targetEntityId) &&
        edge.confidence >= config.minConfidence
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, config.maxEdges);

    return {
      nodes: sortedNodes,
      edges: filteredEdges,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      level,
      hasMore: nodes.length > sortedNodes.length || edges.length > filteredEdges.length
    };
  }

  setAdaptiveMode(enabled) {
    this.adaptiveMode = enabled;
  }

  setLevel(level) {
    if (this.thresholds[level]) {
      this.currentLevel = level;
      return true;
    }
    return false;
  }
}

// Cytoscape performance optimizations
export class CytoscapeOptimizer {
  static getOptimizedConfig(nodeCount, edgeCount) {
    const isLargeGraph = nodeCount > 1000 || edgeCount > 2000;
    
    return {
      // Rendering optimizations
      textureOnViewport: isLargeGraph,
      hideEdgesOnViewport: isLargeGraph && edgeCount > 3000,
      hideLabelsOnViewport: isLargeGraph && nodeCount > 2000,
      pixelRatio: 1, // Force pixel ratio for consistency
      motionBlur: false, // Disable motion blur for performance
      
      // Styling optimizations
      style: [
        {
          selector: 'node',
          style: {
            'overlay-opacity': 0, // Disable overlays for performance
            'selection-box-opacity': 0.2, // Minimal selection styling
          }
        },
        {
          selector: 'edge',
          style: {
            'overlay-opacity': 0,
            'selection-box-opacity': 0.2,
          }
        }
      ]
    };
  }

  static getOptimizedLayoutConfig(nodeCount, layoutName = 'fcose') {
    const isLargeGraph = nodeCount > 1000;
    
    const configs = {
      fcose: {
        name: 'fcose',
        quality: isLargeGraph ? 'draft' : 'default',
        randomize: false,
        animate: !isLargeGraph, // Disable animation for large graphs
        animationDuration: isLargeGraph ? 0 : 1000,
        fit: true,
        padding: 30,
        samplingType: isLargeGraph,
        sampleSize: isLargeGraph ? 15 : 25,
        nodeSeparation: isLargeGraph ? 50 : 75,
        numIter: isLargeGraph ? 1000 : 2500,
        // Performance optimizations
        uniformNodeDimensions: isLargeGraph,
        packComponents: true,
      },
      'cose-bilkent': {
        name: 'cose-bilkent',
        quality: isLargeGraph ? 'draft' : 'default',
        animate: !isLargeGraph,
        animationDuration: isLargeGraph ? 0 : 1000,
        fit: true,
        padding: 30,
        randomize: false,
        nodeRepulsion: isLargeGraph ? 2500 : 4500,
        idealEdgeLength: isLargeGraph ? 30 : 50,
        numIter: isLargeGraph ? 1000 : 2500,
        // Performance optimizations
        tile: isLargeGraph,
        tilingPaddingVertical: 5,
        tilingPaddingHorizontal: 5,
      }
    };
    
    return configs[layoutName] || configs.fcose;
  }
}

// Performance testing utilities
export class PerformanceTester {
  constructor() {
    this.tests = new Map();
  }

  startTest(testName) {
    this.tests.set(testName, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  endTest(testName) {
    const test = this.tests.get(testName);
    if (test) {
      test.endTime = performance.now();
      test.duration = test.endTime - test.startTime;
      return test.duration;
    }
    return null;
  }

  getTestResults() {
    const results = {};
    this.tests.forEach((test, name) => {
      results[name] = test.duration;
    });
    return results;
  }

  // Test graph rendering performance
  async testRenderingPerformance(cyInstance, iterations = 10) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      this.startTest(`render_${i}`);
      
      // Force re-render
      cyInstance.resize();
      cyInstance.center();
      
      // Wait for next frame
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      const duration = this.endTest(`render_${i}`);
      results.push(duration);
    }
    
    return {
      iterations,
      results,
      average: results.reduce((a, b) => a + b, 0) / results.length,
      min: Math.min(...results),
      max: Math.max(...results)
    };
  }
}

// Export utilities
export default {
  CanvasPerformanceMonitor,
  LODManager,
  CytoscapeOptimizer,
  PerformanceTester
};