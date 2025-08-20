import { Server, Socket } from 'socket.io';
import pino from 'pino';

const logger = pino();

interface Presence {
  userId: string;
  username: string;
  status: string;
  ts: number;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
}

const presence = new Map<string, Map<string, Presence>>();
let io: Server | null = null;
const PRESENCE_TTL = 30_000;

setInterval(() => {
  if (!io) return;
  const now = Date.now();
  presence.forEach((map, workspaceId) => {
    let changed = false;
    map.forEach((p, userId) => {
      if (now - p.ts > PRESENCE_TTL) {
        map.delete(userId);
        changed = true;
      }
    });
    if (changed) {
      if (map.size === 0) presence.delete(workspaceId);
      io.to(`workspace:${workspaceId}`).emit(
        'presence:update',
        Array.from(map.values()),
      );
    }
  });
}, PRESENCE_TTL);

function broadcast(workspaceId: string, socket: Socket) {
  const list = Array.from(presence.get(workspaceId)?.values() || []);
  socket.to(`workspace:${workspaceId}`).emit('presence:update', list);
  socket.emit('presence:update', list);
}

export function registerPresenceHandlers(socket: Socket) {
  io = socket.server;
  const user = (socket as any).user;
  const workspaceId = socket.handshake.auth?.workspaceId;
  if (!user?.id || !workspaceId) {
    return;
  }
  const username = user.username || user.email || 'unknown';

  socket.join(`workspace:${workspaceId}`);
  const wsMap = presence.get(workspaceId) || new Map<string, Presence>();
  wsMap.set(user.id, {
    userId: user.id,
    username,
    status: 'online',
    ts: Date.now(),
  });
  presence.set(workspaceId, wsMap);
  broadcast(workspaceId, socket);

  socket.on('presence:update', (status: string) => {
    const map = presence.get(workspaceId);
    if (!map) return;
    map.set(user.id, {
      userId: user.id,
      username,
      status,
      ts: Date.now(),
    });
    broadcast(workspaceId, socket);
  });

  socket.on(
    'presence:heartbeat',
    (payload: { cursor?: any; selection?: any; status?: string }) => {
      const map = presence.get(workspaceId);
      if (!map) return;
      const prev = map.get(user.id);
      map.set(user.id, {
        userId: user.id,
        username,
        status: payload.status || prev?.status || 'online',
        cursor: payload.cursor,
        selection: payload.selection,
        ts: Date.now(),
      });
      broadcast(workspaceId, socket);
    },
  );

  socket.on('disconnect', () => {
    const map = presence.get(workspaceId);
    if (!map) return;
    map.delete(user.id);
    if (map.size === 0) presence.delete(workspaceId);
    socket
      .to(`workspace:${workspaceId}`)
      .emit('presence:update', Array.from(map.values()));
    logger.info({ userId: user.id, workspaceId }, 'presence:disconnect');
  });
}
