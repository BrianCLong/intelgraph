"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const socket_1 = require("../src/realtime/socket");
jest.mock('../src/lib/auth.js', () => ({
    verifyToken: jest.fn(async (token) => {
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
    let server;
    let url;
    let io;
    beforeAll((done) => {
        server = http_1.default.createServer();
        io = (0, socket_1.initSocket)(server);
        server.listen(() => {
            const address = server.address();
            url = `http://localhost:${address.port}/realtime`;
            done();
        });
    });
    afterAll((done) => {
        io.close();
        server.close(done);
    });
    it('broadcasts presence to workspace', (done) => {
        const clientA = (0, socket_io_client_1.default)(url, {
            auth: { token: 't1', workspaceId: 'ws1' },
            transports: ['websocket'],
        });
        clientA.once('presence:update', (listA) => {
            expect(listA).toHaveLength(1);
            const clientB = (0, socket_io_client_1.default)(url, {
                auth: { token: 't2', workspaceId: 'ws1' },
                transports: ['websocket'],
            });
            clientA.once('presence:update', (listB) => {
                expect(listB).toHaveLength(2);
                clientA.close();
                clientB.close();
                done();
            });
        });
    });
});
//# sourceMappingURL=presence.test.js.map