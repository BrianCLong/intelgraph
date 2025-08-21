import { io, Socket } from 'socket.io-client';

export function createSocket(): Socket {
  // Stub without real connection
  return io('', { autoConnect: false });
}
