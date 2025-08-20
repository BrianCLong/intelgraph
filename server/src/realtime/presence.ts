import { Socket } from 'socket.io';
import pino from 'pino';
import type { Presence as SharedPresence } from '../../../packages/shared/collab-types';

const logger = pino();
const TTL = 30_000;

export interface Presence extends SharedPresence {}

const presence = new Map<string, Map<string, Presence>>();

function caseKey(tenantId: string, caseId: string) {
  return `${tenantId}:${caseId}`;
}

function broadcast(key: string, socket: Socket) {
  const list = Array.from(presence.get(key)?.values() || []);
  socket.to(`case:${key}`).emit('presence:update', list);
  socket.emit('presence:update', list);
}

export function getCasePresence(tenantId: string, caseId: string) {
  return Array.from(presence.get(caseKey(tenantId, caseId))?.values() || []);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, map] of presence.entries()) {
    for (const [id, p] of map.entries()) {
      if (now - p.lastSeen > TTL) {
        map.delete(id);
      }
    }
    if (map.size === 0) presence.delete(key);
  }
}, TTL);

export function registerPresenceHandlers(socket: Socket) {
  const user = (socket as any).user;
  const tenantId = socket.handshake.auth?.tenantId;
  const caseId = socket.handshake.auth?.caseId;
  const role = socket.handshake.auth?.role || 'reader';
  if (!user?.id || !tenantId || !caseId) {
    return;
  }
  const key = caseKey(tenantId, caseId);
  socket.join(`case:${key}`);
  const map = presence.get(key) || new Map<string, Presence>();
  map.set(user.id, {
    tenantId,
    caseId,
    userId: user.id,
    role,
    selections: [],
    lastSeen: Date.now(),
  });
  presence.set(key, map);
  broadcast(key, socket);

  socket.on('presence:heartbeat', (payload: { selections?: string[] }) => {
    const p = map.get(user.id);
    if (!p) return;
    p.lastSeen = Date.now();
    if (payload?.selections) {
      p.selections = payload.selections;
    }
    broadcast(key, socket);
  });

  socket.on('disconnect', () => {
    map.delete(user.id);
    if (map.size === 0) presence.delete(key);
    socket.to(`case:${key}`).emit('presence:update', Array.from(map.values()));
    logger.info({ userId: user.id, key }, 'presence:disconnect');
  });
}
