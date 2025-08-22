export const config = {
  server: {
    port: parseInt(process.env.ML_ENGINE_PORT || '4003'),
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
  
  ml: {
    python: {
      scriptPath: process.env.PYTHON_SCRIPT_PATH || './src/python',
      pythonExecutable: process.env.PYTHON_EXECUTABLE || 'python3'
    },
    
    models: {
      defaultSentenceModel: process.env.DEFAULT_SENTENCE_MODEL || 'all-MiniLM-L6-v2',
      cacheDir: process.env.MODEL_CACHE_DIR || './models',
      maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || '1000000000') // 1GB
    },
    
    entityResolution: {
      defaultThreshold: parseFloat(process.env.DEFAULT_ER_THRESHOLD || '0.8'),
      maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '1000'),
      trainingDataRetentionDays: parseInt(process.env.TRAINING_DATA_RETENTION_DAYS || '30')
    }
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '2') // Use different DB from main app
  },
  
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9093'),
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};