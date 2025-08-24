export const config = {
  server: {
    port: parseInt(process.env.GRAPH_ANALYTICS_PORT || '4006'),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4001'],
    environment: process.env.NODE_ENV || 'development'
  },
  
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'intelgraph',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'intelgraph',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    },
    
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password'
    }
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '5') // Use different DB from other services
  },
  
  analytics: {
    maxQueryTimeout: parseInt(process.env.MAX_QUERY_TIMEOUT || '300000'), // 5 minutes
    maxNodesPerAnalysis: parseInt(process.env.MAX_NODES_PER_ANALYSIS || '10000'),
    maxEdgesPerAnalysis: parseInt(process.env.MAX_EDGES_PER_ANALYSIS || '50000'),
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    defaultCacheTTL: parseInt(process.env.DEFAULT_CACHE_TTL || '3600'), // 1 hour
    enableAdvancedAlgorithms: process.env.ENABLE_ADVANCED_ALGORITHMS === 'true'
  },
  
  visualization: {
    maxNodesPerVisualization: parseInt(process.env.MAX_NODES_PER_VIZ || '1000'),
    maxEdgesPerVisualization: parseInt(process.env.MAX_EDGES_PER_VIZ || '2000'),
    defaultLayout: process.env.DEFAULT_LAYOUT || 'force',
    enableLayoutOptimization: process.env.ENABLE_LAYOUT_OPTIMIZATION !== 'false',
    imageExportEnabled: process.env.IMAGE_EXPORT_ENABLED === 'true',
    svgExportEnabled: process.env.SVG_EXPORT_ENABLED !== 'false'
  },
  
  algorithms: {
    centrality: {
      maxIterations: parseInt(process.env.CENTRALITY_MAX_ITERATIONS || '100'),
      tolerance: parseFloat(process.env.CENTRALITY_TOLERANCE || '0.001'),
      dampingFactor: parseFloat(process.env.PAGERANK_DAMPING || '0.85')
    },
    communityDetection: {
      algorithm: process.env.COMMUNITY_ALGORITHM || 'louvain', // louvain, modularity, label_propagation
      resolution: parseFloat(process.env.COMMUNITY_RESOLUTION || '1.0'),
      maxIterations: parseInt(process.env.COMMUNITY_MAX_ITERATIONS || '1000')
    },
    pathfinding: {
      maxDepth: parseInt(process.env.MAX_PATH_DEPTH || '10'),
      maxPaths: parseInt(process.env.MAX_PATHS_RETURNED || '100'),
      enableWeighted: process.env.ENABLE_WEIGHTED_PATHS !== 'false'
    }
  },
  
  anomalyDetection: {
    enableStructural: process.env.ENABLE_STRUCTURAL_ANOMALIES !== 'false',
    enableBehavioral: process.env.ENABLE_BEHAVIORAL_ANOMALIES === 'true',
    enableTemporal: process.env.ENABLE_TEMPORAL_ANOMALIES === 'true',
    thresholds: {
      degreeOutlier: parseFloat(process.env.DEGREE_OUTLIER_THRESHOLD || '3.0'),
      clusteringAnomaly: parseFloat(process.env.CLUSTERING_ANOMALY_THRESHOLD || '0.1'),
      temporalSpike: parseFloat(process.env.TEMPORAL_SPIKE_THRESHOLD || '2.0')
    }
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'graph-analytics-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9096'),
    logLevel: process.env.LOG_LEVEL || 'info',
    enablePerformanceLogging: process.env.ENABLE_PERFORMANCE_LOGGING === 'true'
  }
};