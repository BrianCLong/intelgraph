import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClient } from "../db/redis.js";
import { verifyToken } from "../lib/auth.js";
import logger from '../config/logger';

/**
 * mountLiveNamespace configures the Socket.IO "/live" namespace. It performs
 * JWT auth, joins clients to workspace rooms and relays basic live events such
 * as presence updates, graph operations and comments. This is a lightweight
 * implementation intended to be expanded with persistence and RBAC rules.
 */
export function mountLiveNamespace(io: Server): void {
  const logger = logger.child({ name: 'liveNamespace' });
  const pubClient = getRedisClient();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  const nsp = io.of("/live");

  nsp.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      const workspaceId = socket.handshake.auth?.workspaceId as string | undefined;
      if (!token || !workspaceId) return next(new Error("UNAUTHORIZED"));
      const user = await verifyToken(token);
      // @ts-ignore – attach user for handlers
      socket.data.user = user;
      socket.join(workspaceId);
      next();
    } catch (err) {
      next(new Error("UNAUTHORIZED"));
    }
  });

  nsp.on("connection", (socket) => {
    const workspaceId = socket.handshake.auth?.workspaceId as string;
    logger.info({ workspaceId }, "live:connected");

    socket.on("presence:update", (presence) => {
      presence.updatedAt = new Date().toISOString();
      nsp.to(workspaceId).emit("presence:update", presence);
    });

    socket.on("graph:ops", (ops) => {
      nsp.to(workspaceId).emit("graph:commit", ops);
    });

    socket.on("comment:add", (comment) => {
      nsp.to(workspaceId).emit("comment:new", comment);
    });

    socket.on("disconnect", (reason) => {
      logger.info({ workspaceId, reason }, "live:disconnected");
    });
  });
}
