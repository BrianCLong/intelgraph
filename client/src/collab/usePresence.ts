import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Presence } from '../../../packages/shared/collab-types';

export function usePresence(
  tenantId: string,
  caseId: string,
  role: string,
) {
  const [users, setUsers] = useState<Presence[]>([]);

  useEffect(() => {
    const socket: Socket = io('/realtime', {
      auth: { tenantId, caseId, role },
    });
    socket.on('presence:update', (list: Presence[]) => setUsers(list));
    const interval = setInterval(() => {
      socket.emit('presence:heartbeat', {});
    }, 10_000);
    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [tenantId, caseId, role]);

  return users;
}
