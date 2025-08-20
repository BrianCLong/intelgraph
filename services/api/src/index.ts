/**
 * IntelGraph API Service - Main Entry Point
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { createSocketIOServer } from './realtime/socket.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Create Express app with GraphQL
    const app = await createApp();
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Create Socket.IO server for realtime features
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    // Initialize Socket.IO handlers
    createSocketIOServer(io);
    
    // Start server
    httpServer.listen(PORT, () => {
      logger.info({
        message: 'IntelGraph API Server started',
        port: PORT,
        environment: NODE_ENV,
        graphqlPath: '/graphql',
        timestamp: new Date().toISOString()
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      httpServer.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error({
      message: 'Failed to start server',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

startServer();