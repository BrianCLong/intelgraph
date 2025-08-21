import { Server, Socket } from 'socket.io';
import { verifyToken } from '../lib/auth.js';
import logger from '../config/logger';
import { initGraphSync, registerGraphHandlers } from './graph-crdt.js';
import { registerPresenceHandlers } from './presence.js';

const logger = logger.child({ name: 'socket' });

interface UserSocket extends Socket {
  user?: any;
}

let ioInstance: Server | null = null;

export function initSocket(httpServer: any): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  });

  const ns = io.of('/realtime');

  ns.use(async (socket: UserSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const user = await verifyToken(token);
      if (!user) {
        logger.warn({ token }, 'Unauthorized socket connection attempt');
        return next(new Error('Unauthorized'));
      }
      socket.user = user;
      next();
    } catch (e: any) {
      logger.warn({ error: e.message }, 'Unauthorized socket connection attempt');
      next(new Error('Unauthorized'));
    }
  });

  ns.on('connection', (socket: UserSocket) => {
    logger.info(`Realtime connected ${socket.id} for user ${socket.user?.id}`);

    const authorize =
      (roles: string[], event: string, handler: (...args: any[]) => void) =>
      (...args: any[]) => {
        const userRole = socket.user?.role;
        if (!userRole || !roles.includes(userRole)) {
          logger.warn(
            { userId: socket.user?.id, role: userRole, event },
            'Unauthorized socket event',
          );
          socket.emit('error', 'Forbidden');
          return;
        }
        handler(...args);
      };

    const EDIT_ROLES = ['EDITOR', 'ADMIN'];

    socket.on(
      'entity_update',
      authorize(
        EDIT_ROLES,
        'entity_update',
        ({ graphId, entityId, changes }: { graphId: string; entityId: string; changes: any }) => {
          if (!graphId || !entityId) return;
          socket.to(`graph:${graphId}`).emit('entity_updated', {
            userId: socket.user?.id,
            username: socket.user?.username || socket.user?.email,
            entityId,
            changes,
            ts: Date.now(),
          });
        },
      ),
    );

    registerGraphHandlers(socket);
    registerPresenceHandlers(socket);

    socket.on('disconnect', () => {
      logger.info(`Realtime disconnect ${socket.id} for user ${socket.user?.id}`);
    });
  });

  ioInstance = io;
  initGraphSync(ns);
  return io;
}

export function getIO(): Server | null {
  return ioInstance;
}
