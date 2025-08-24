"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const socket_1 = require("../src/realtime/socket");
jest.mock("../src/lib/auth.js", () => ({
    verifyToken: jest.fn(async (token) => {
        if (token === "admin-token") {
            return { id: "1", email: "a@example.com", role: "ADMIN" };
        }
        if (token === "viewer-token") {
            return { id: "2", email: "v@example.com", role: "VIEWER" };
        }
        throw new Error("Invalid token");
    }),
}));
describe("WebSocket JWT auth with RBAC", () => {
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
    it("rejects unauthorized sockets", (done) => {
        const client = (0, socket_io_client_1.default)(url, {
            auth: { token: "bad-token" },
            transports: ["websocket"],
        });
        client.on("connect_error", (err) => {
            expect(err.message).toBe("Unauthorized");
            client.close();
            done();
        });
    });
    it("enforces RBAC for edit events", (done) => {
        const client = (0, socket_io_client_1.default)(url, {
            auth: { token: "viewer-token" },
            transports: ["websocket"],
        });
        client.on("connect", () => {
            client.emit("entity_update", {
                graphId: "g1",
                entityId: "e1",
                changes: {},
            });
        });
        client.on("error", (msg) => {
            expect(msg).toBe("Forbidden");
            client.close();
            done();
        });
    });
});
//# sourceMappingURL=socket-auth-rbac.test.js.map