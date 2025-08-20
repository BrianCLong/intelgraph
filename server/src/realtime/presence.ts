import { Socket } from 'socket.io';
import logger from '../config/logger';

const logger = logger.child({ name: 'presence' });

interface Presence {
  userId: string;
  username: string;
  status: string;
  ts: number;
}

const presence = new Map<string, Map<string, Presence>>();

function broadcast(workspaceId: string, socket: Socket) {
  const list = Array.from(presence.get(workspaceId)?.values() || []);
  socket.to(`workspace:${workspaceId}`).emit('presence:update', list);
  socket.emit('presence:update', list);
}

export function registerPresenceHandlers(socket: Socket) {
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

  socket.on('disconnect', () => {
    const map = presence.get(workspaceId);
    if (!map) return;
    map.delete(user.id);
    if (map.size === 0) presence.delete(workspaceId);
    socket.to(`workspace:${workspaceId}`).emit('presence:update', Array.from(map.values()));
    logger.info({ userId: user.id, workspaceId }, 'presence:disconnect');
  });
}
