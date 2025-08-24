import http from 'http';
import { Server } from 'socket.io';

export interface CollabServer {
  io: Server;
  httpServer: http.Server;
}

/**
 * createCollabServer sets up a minimal Socket.IO server that relays
 * operational events between connected clients. Clients join a room for a
 * specific branch and broadcast changes to peers.
 */
export function createCollabServer(): CollabServer {
  const httpServer = http.createServer();
  const io = new Server(httpServer, { path: '/collab' });

  io.on('connection', socket => {
    socket.on('branch:join', branchId => {
      socket.join(`branch:${branchId}`);
    });

    socket.on('op', (branchId, op) => {
      socket.to(`branch:${branchId}`).emit('op', op);
    });
  });

  return { io, httpServer };
}
