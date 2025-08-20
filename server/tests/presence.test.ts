import http from 'http';
import ioClient from 'socket.io-client';
import { initSocket } from '../src/realtime/socket';

jest.mock('../src/lib/auth.js', () => ({
  verifyToken: jest.fn(async (token: string) => {
    if (token === 't1') {
      return { id: '1', email: 'u1@example.com', username: 'u1', role: 'ADMIN' };
    }
    if (token === 't2') {
      return { id: '2', email: 'u2@example.com', username: 'u2', role: 'ADMIN' };
    }
    throw new Error('Invalid token');
  }),
}));

describe('presence websocket', () => {
  let server: http.Server;
  let url: string;
  let io: any;

  beforeAll((done) => {
    server = http.createServer();
    io = initSocket(server);
    server.listen(() => {
      const address = server.address() as any;
      url = `http://localhost:${address.port}/realtime`;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it('broadcasts presence to workspace', (done) => {
    const clientA = ioClient(url, {
      auth: { token: 't1', workspaceId: 'ws1' },
      transports: ['websocket'],
    });
    clientA.once('presence:update', (listA: any[]) => {
      expect(listA).toHaveLength(1);
      const clientB = ioClient(url, {
        auth: { token: 't2', workspaceId: 'ws1' },
        transports: ['websocket'],
      });
      clientA.once('presence:update', (listB: any[]) => {
        expect(listB).toHaveLength(2);
        clientA.close();
        clientB.close();
        done();
      });
    });
  });

  it('updates cursor on heartbeat', (done) => {
    const client = ioClient(url, {
      auth: { token: 't1', workspaceId: 'ws1' },
      transports: ['websocket'],
    });
    client.once('presence:update', () => {
      client.emit('presence:heartbeat', { cursor: { x: 1, y: 2 } });
    });
    client.on('presence:update', (list: any[]) => {
      const me = list.find((p: any) => p.userId === '1');
      if (me?.cursor) {
        expect(me.cursor).toEqual({ x: 1, y: 2 });
        client.close();
        done();
      }
    });
  });
});
