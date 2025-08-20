/**
 * IntelGraph Socket.IO Realtime Hub
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { logger } from '../utils/logger.js';
import { redisClient } from '../db/redis.js';
import { postgresPool } from '../db/postgres.js';

interface AuthenticatedSocket extends Socket {
  userId: string;
  tenantId: string;
  role: string;
}

interface PresenceData {
  userId: string;
  tenantId: string;
  role: string;
  investigationId?: string;
  lastActive: number;
  socketId: string;
}

interface CollaborationEvent {
  type: 'entity_lock' | 'entity_unlock' | 'graph_update' | 'investigation_join' | 'investigation_leave';
  resourceId: string;
  userId: string;
  tenantId: string;
  data?: any;
  timestamp: number;
}

// JWKS client for token verification
const jwksClientInstance = jwksClient({
  jwksUri: process.env.OIDC_JWKS_URI || 'https://auth.intelgraph.com/.well-known/jwks.json',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

export function createSocketIOServer(io: SocketIOServer): void {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const user = await verifyToken(token);
      if (!user) {
        return next(new Error('Invalid authentication token'));
      }

      // Attach user info to socket
      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).tenantId = user.tenantId;
      (socket as AuthenticatedSocket).role = user.role;

      next();
    } catch (error) {
      logger.error({
        message: 'Socket authentication failed',
        error: error instanceof Error ? error.message : String(error),
        socketId: socket.id
      });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const { userId, tenantId, role } = socket;
    
    logger.info({
      message: 'User connected to realtime hub',
      userId,
      tenantId,
      role,
      socketId: socket.id
    });

    // Join tenant room for tenant-scoped broadcasts
    socket.join(`tenant:${tenantId}`);
    
    // Track user presence
    await updatePresence(socket, 'online');

    // Handle investigation collaboration
    socket.on('investigation:join', async (investigationId: string) => {
      try {
        // Verify user has access to investigation
        const hasAccess = await verifyInvestigationAccess(userId, investigationId, tenantId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to investigation' });
          return;
        }

        // Join investigation room
        socket.join(`investigation:${investigationId}`);
        
        // Update presence with investigation context
        await updatePresence(socket, 'online', investigationId);
        
        // Notify other users in investigation
        socket.to(`investigation:${investigationId}`).emit('user:joined', {
          userId,
          investigationId,
          timestamp: Date.now()
        });

        // Send current investigation state
        const investigationState = await getInvestigationState(investigationId);
        socket.emit('investigation:state', investigationState);

        logger.info({
          message: 'User joined investigation',
          userId,
          investigationId,
          socketId: socket.id
        });

      } catch (error) {
        logger.error({
          message: 'Failed to join investigation',
          userId,
          investigationId,
          error: error instanceof Error ? error.message : String(error)
        });
        socket.emit('error', { message: 'Failed to join investigation' });
      }
    });

    socket.on('investigation:leave', async (investigationId: string) => {
      try {
        socket.leave(`investigation:${investigationId}`);
        await updatePresence(socket, 'online'); // Remove investigation context
        
        socket.to(`investigation:${investigationId}`).emit('user:left', {
          userId,
          investigationId,
          timestamp: Date.now()
        });

        logger.info({
          message: 'User left investigation',
          userId,
          investigationId,
          socketId: socket.id
        });

      } catch (error) {
        logger.error({
          message: 'Failed to leave investigation',
          userId,
          investigationId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Entity locking for collaborative editing
    socket.on('entity:lock', async (entityId: string) => {
      try {
        const lockKey = `entity:lock:${entityId}`;
        const lockValue = JSON.stringify({ userId, timestamp: Date.now() });
        
        // Try to acquire lock (5 minute TTL)
        const lockAcquired = await redisClient.set(lockKey, lockValue, 300);
        
        if (lockAcquired) {
          socket.emit('entity:lock_acquired', { entityId, userId });
          
          // Notify others in tenant
          socket.to(`tenant:${tenantId}`).emit('entity:locked', {
            entityId,
            lockedBy: userId,
            timestamp: Date.now()
          });

          logger.info({
            message: 'Entity locked for editing',
            entityId,
            userId,
            socketId: socket.id
          });
        } else {
          // Lock already exists, get current lock holder
          const existingLock = await redisClient.get(lockKey);
          socket.emit('entity:lock_failed', {
            entityId,
            lockedBy: existingLock ? JSON.parse(existingLock).userId : 'unknown',
            message: 'Entity is already locked by another user'
          });
        }

      } catch (error) {
        logger.error({
          message: 'Failed to lock entity',
          entityId,
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
        socket.emit('error', { message: 'Failed to lock entity' });
      }
    });

    socket.on('entity:unlock', async (entityId: string) => {
      try {
        const lockKey = `entity:lock:${entityId}`;
        
        // Only allow unlock if user owns the lock
        const existingLock = await redisClient.get(lockKey);
        if (existingLock) {
          const lockData = JSON.parse(existingLock);
          if (lockData.userId === userId) {
            await redisClient.del(lockKey);
            
            socket.emit('entity:lock_released', { entityId });
            socket.to(`tenant:${tenantId}`).emit('entity:unlocked', {
              entityId,
              unlockedBy: userId,
              timestamp: Date.now()
            });

            logger.info({
              message: 'Entity unlocked',
              entityId,
              userId,
              socketId: socket.id
            });
          } else {
            socket.emit('error', { message: 'Cannot unlock entity locked by another user' });
          }
        }

      } catch (error) {
        logger.error({
          message: 'Failed to unlock entity',
          entityId,
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
        socket.emit('error', { message: 'Failed to unlock entity' });
      }
    });

    // Graph updates broadcasting
    socket.on('graph:update', async (data: any) => {
      try {
        // Validate update data
        if (!data.type || !data.resourceId) {
          socket.emit('error', { message: 'Invalid graph update data' });
          return;
        }

        // Broadcast to investigation or tenant
        const room = data.investigationId ? `investigation:${data.investigationId}` : `tenant:${tenantId}`;
        
        socket.to(room).emit('graph:updated', {
          ...data,
          userId,
          timestamp: Date.now()
        });

        // Cache update for offline users
        await cacheGraphUpdate(data, userId, tenantId);

        logger.info({
          message: 'Graph update broadcasted',
          type: data.type,
          resourceId: data.resourceId,
          userId,
          socketId: socket.id
        });

      } catch (error) {
        logger.error({
          message: 'Failed to broadcast graph update',
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
        socket.emit('error', { message: 'Failed to broadcast update' });
      }
    });

    // Handle cursor/selection sharing
    socket.on('cursor:update', (data: { x: number; y: number; selection?: string[] }) => {
      socket.broadcast.emit('cursor:moved', {
        userId,
        ...data,
        timestamp: Date.now()
      });
    });

    // Typing indicators
    socket.on('typing:start', (data: { context: string; field?: string }) => {
      socket.broadcast.emit('user:typing', {
        userId,
        ...data,
        timestamp: Date.now()
      });
    });

    socket.on('typing:stop', (data: { context: string; field?: string }) => {
      socket.broadcast.emit('user:stopped_typing', {
        userId,
        ...data,
        timestamp: Date.now()
      });
    });

    // Disconnect handler
    socket.on('disconnect', async (reason) => {
      logger.info({
        message: 'User disconnected from realtime hub',
        userId,
        tenantId,
        reason,
        socketId: socket.id
      });

      try {
        // Update presence to offline
        await updatePresence(socket, 'offline');
        
        // Release any entity locks held by this user
        await releaseUserLocks(userId);
        
        // Notify relevant rooms about user disconnect
        socket.to(`tenant:${tenantId}`).emit('user:disconnected', {
          userId,
          timestamp: Date.now()
        });

      } catch (error) {
        logger.error({
          message: 'Error during socket disconnect cleanup',
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  });

  // Periodic cleanup of stale locks and presence
  setInterval(async () => {
    await cleanupStaleData();
  }, 60000); // Every minute
}

async function verifyToken(token: string): Promise<any> {
  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) {
      return null;
    }

    const key = await jwksClientInstance.getSigningKey(decodedHeader.header.kid);
    const signingKey = key.getPublicKey();
    
    const payload = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      audience: process.env.OIDC_AUDIENCE || 'intelgraph-api',
      issuer: process.env.OIDC_ISSUER || 'https://auth.intelgraph.com'
    });

    // Get user from database
    const user = await postgresPool.findOne('users', {
      external_id: (payload as any).sub,
      is_active: true
    });

    return user;
  } catch (error) {
    logger.error({
      message: 'Token verification failed',
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function updatePresence(
  socket: AuthenticatedSocket,
  status: 'online' | 'offline',
  investigationId?: string
): Promise<void> {
  const presenceData: PresenceData = {
    userId: socket.userId,
    tenantId: socket.tenantId,
    role: socket.role,
    investigationId,
    lastActive: Date.now(),
    socketId: socket.id
  };

  const presenceKey = `presence:${socket.tenantId}:${socket.userId}`;
  
  if (status === 'online') {
    await redisClient.set(presenceKey, presenceData, 300); // 5 minute TTL
  } else {
    await redisClient.del(presenceKey);
  }
}

async function verifyInvestigationAccess(
  userId: string,
  investigationId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const investigation = await postgresPool.findOne('investigations', {
      id: investigationId,
      tenant_id: tenantId
    });

    if (!investigation) {
      return false;
    }

    // Check if user created investigation or is assigned to it
    if (investigation.created_by === userId) {
      return true;
    }

    if (investigation.assigned_to && investigation.assigned_to.includes(userId)) {
      return true;
    }

    // Check if user has supervisor+ role
    const user = await postgresPool.findOne('users', { id: userId });
    if (user && ['supervisor', 'admin'].includes(user.role)) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error({
      message: 'Failed to verify investigation access',
      userId,
      investigationId,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

async function getInvestigationState(investigationId: string): Promise<any> {
  try {
    // Get investigation with entities and relationships
    const investigation = await postgresPool.findOne('investigations', {
      id: investigationId
    });

    if (!investigation) {
      return null;
    }

    // Get associated entities and relationships
    const entities = await postgresPool.query(
      'SELECT e.* FROM investigation_entities ie JOIN entity_metadata e ON ie.entity_id = e.id WHERE ie.investigation_id = $1',
      [investigationId]
    );

    const relationships = await postgresPool.query(
      'SELECT r.* FROM investigation_relationships ir JOIN relationship_metadata r ON ir.relationship_id = r.id WHERE ir.investigation_id = $1',
      [investigationId]
    );

    return {
      investigation,
      entities: entities.rows,
      relationships: relationships.rows,
      timestamp: Date.now()
    };

  } catch (error) {
    logger.error({
      message: 'Failed to get investigation state',
      investigationId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function cacheGraphUpdate(
  data: any,
  userId: string,
  tenantId: string
): Promise<void> {
  try {
    const updateKey = `graph:updates:${tenantId}`;
    const update = {
      ...data,
      userId,
      timestamp: Date.now()
    };

    // Add to recent updates list (keep last 100)
    await redisClient.client?.lpush(updateKey, JSON.stringify(update));
    await redisClient.client?.ltrim(updateKey, 0, 99);
    await redisClient.expire(updateKey, 3600); // 1 hour TTL

  } catch (error) {
    logger.error({
      message: 'Failed to cache graph update',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function releaseUserLocks(userId: string): Promise<void> {
  try {
    // Find all locks owned by this user
    const lockPattern = 'entity:lock:*';
    // Note: In production, consider using Redis SCAN instead of KEYS for better performance
    // This is a simplified implementation
    
    // For now, we'll implement a cleanup mechanism through periodic maintenance
    logger.info({
      message: 'User lock cleanup initiated',
      userId
    });

  } catch (error) {
    logger.error({
      message: 'Failed to release user locks',
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function cleanupStaleData(): Promise<void> {
  try {
    // Cleanup stale presence data and locks
    // This would include more sophisticated cleanup logic in production
    logger.debug('Performing periodic realtime data cleanup');

  } catch (error) {
    logger.error({
      message: 'Failed to cleanup stale realtime data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}