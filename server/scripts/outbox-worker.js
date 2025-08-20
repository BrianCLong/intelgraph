#!/usr/bin/env node

/**
 * Outbox Worker Service
 * Standalone service for Neo4j sync via outbox pattern
 */

const { getPostgresPool } = require('../src/db/postgres');
const { getNeo4jDriver } = require('../src/db/neo4j');
const { OutboxNeo4jSync } = require('../src/workers/OutboxNeo4jSync');

// Configuration
const config = {
  batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '100'),
  intervalMs: parseInt(process.env.OUTBOX_INTERVAL_MS || '2000'),
  maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '10'),
  backoffMultiplier: parseFloat(process.env.OUTBOX_BACKOFF_MULTIPLIER || '2'),
  cleanupIntervalMs: parseInt(process.env.OUTBOX_CLEANUP_INTERVAL_MS || '3600000'), // 1 hour
  cleanupOlderThanDays: parseInt(process.env.OUTBOX_CLEANUP_DAYS || '7')
};

let worker;
let cleanupInterval;

async function startWorker() {
  console.log('🚀 Starting IntelGraph Outbox Worker...');
  console.log('Configuration:', config);
  
  try {
    // Initialize database connections
    const pg = getPostgresPool();
    const neo4j = getNeo4jDriver();
    
    // Test connections
    console.log('🧪 Testing database connections...');
    
    const pgClient = await pg.connect();
    await pgClient.query('SELECT 1');
    pgClient.release();
    console.log('✅ PostgreSQL connection OK');
    
    await neo4j.verifyConnectivity();
    console.log('✅ Neo4j connection OK');
    
    // Create and start worker
    worker = new OutboxNeo4jSync(pg, neo4j, config);
    worker.start();
    
    console.log('✅ Outbox worker started successfully');
    
    // Setup cleanup interval
    cleanupInterval = setInterval(async () => {
      try {
        const deletedCount = await worker.cleanup(config.cleanupOlderThanDays);
        if (deletedCount > 0) {
          console.log(`🧹 Cleaned up ${deletedCount} old outbox events`);
        }
      } catch (error) {
        console.error('⚠️  Cleanup failed:', error.message);
      }
    }, config.cleanupIntervalMs);
    
    // Setup stats logging
    const statsInterval = setInterval(async () => {
      try {
        const stats = await worker.getStats();
        console.log('📊 Outbox stats:', {
          pending: stats.pending,
          failed: stats.failed,
          processed: stats.processed,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('⚠️  Stats collection failed:', error.message);
      }
    }, 30000); // Every 30 seconds
    
    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      if (worker) {
        worker.stop();
        console.log('✅ Outbox worker stopped');
      }
      
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
      
      if (statsInterval) {
        clearInterval(statsInterval);
      }
      
      // Close database connections
      try {
        if (pg) {
          await pg.end();
          console.log('✅ PostgreSQL pool closed');
        }
        
        if (neo4j) {
          await neo4j.close();
          console.log('✅ Neo4j driver closed');
        }
      } catch (error) {
        console.error('⚠️  Database cleanup error:', error.message);
      }
      
      console.log('👋 Outbox worker shutdown complete');
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason) => {
      console.error('💥 Unhandled rejection:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
    
  } catch (error) {
    console.error('💥 Worker startup failed:', error.message);
    process.exit(1);
  }
}

// Health check endpoint (for monitoring)
function setupHealthCheck() {
  const http = require('http');
  const port = process.env.OUTBOX_HEALTH_PORT || 8080;
  
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health') {
      try {
        const stats = worker ? await worker.getStats() : { pending: 0, failed: 0, processed: 0 };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          service: 'outbox-worker',
          version: '1.0.0',
          uptime: process.uptime(),
          stats,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  server.listen(port, () => {
    console.log(`🏥 Health check server running on port ${port}`);
  });
}

// Start the worker
if (require.main === module) {
  setupHealthCheck();
  startWorker();
}