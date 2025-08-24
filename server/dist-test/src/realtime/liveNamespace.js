"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountLiveNamespace = mountLiveNamespace;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_js_1 = require("../db/redis.js");
const auth_js_1 = require("../lib/auth.js");
/**
 * mountLiveNamespace configures the Socket.IO "/live" namespace. It performs
 * JWT auth, joins clients to workspace rooms and relays basic live events such
 * as presence updates, graph operations and comments. This is a lightweight
 * implementation intended to be expanded with persistence and RBAC rules.
 */
function mountLiveNamespace(io) {
    const logger = logger.child({ name: 'liveNamespace' });
    const pubClient = (0, redis_js_1.getRedisClient)();
    const subClient = pubClient.duplicate();
    io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    const nsp = io.of("/live");
    nsp.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            const workspaceId = socket.handshake.auth?.workspaceId;
            if (!token || !workspaceId)
                return next(new Error("UNAUTHORIZED"));
            const user = await (0, auth_js_1.verifyToken)(token);
            // @ts-ignore – attach user for handlers
            socket.data.user = user;
            socket.join(workspaceId);
            next();
        }
        catch (err) {
            next(new Error("UNAUTHORIZED"));
        }
    });
    nsp.on("connection", (socket) => {
        const workspaceId = socket.handshake.auth?.workspaceId;
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
//# sourceMappingURL=liveNamespace.js.map