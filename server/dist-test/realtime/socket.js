"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const auth_js_1 = require("../lib/auth.js");
const graph_crdt_js_1 = require("./graph-crdt.js");
const presence_js_1 = require("./presence.js");
const logger = logger.child({ name: 'socket' });
let ioInstance = null;
function initSocket(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
            credentials: true,
        },
    });
    const ns = io.of('/realtime');
    ns.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
            const user = await (0, auth_js_1.verifyToken)(token);
            if (!user) {
                logger.warn({ token }, 'Unauthorized socket connection attempt');
                return next(new Error('Unauthorized'));
            }
            socket.user = user;
            next();
        }
        catch (e) {
            logger.warn({ error: e.message }, 'Unauthorized socket connection attempt');
            next(new Error('Unauthorized'));
        }
    });
    ns.on('connection', (socket) => {
        logger.info(`Realtime connected ${socket.id} for user ${socket.user?.id}`);
        const authorize = (roles, event, handler) => (...args) => {
            const userRole = socket.user?.role;
            if (!userRole || !roles.includes(userRole)) {
                logger.warn({ userId: socket.user?.id, role: userRole, event }, 'Unauthorized socket event');
                socket.emit('error', 'Forbidden');
                return;
            }
            handler(...args);
        };
        const EDIT_ROLES = ['EDITOR', 'ADMIN'];
        socket.on('entity_update', authorize(EDIT_ROLES, 'entity_update', ({ graphId, entityId, changes }) => {
            if (!graphId || !entityId)
                return;
            socket.to(`graph:${graphId}`).emit('entity_updated', {
                userId: socket.user?.id,
                username: socket.user?.username || socket.user?.email,
                entityId,
                changes,
                ts: Date.now(),
            });
        }));
        (0, graph_crdt_js_1.registerGraphHandlers)(socket);
        (0, presence_js_1.registerPresenceHandlers)(socket);
        socket.on('disconnect', () => {
            logger.info(`Realtime disconnect ${socket.id} for user ${socket.user?.id}`);
        });
    });
    ioInstance = io;
    (0, graph_crdt_js_1.initGraphSync)(ns);
    return io;
}
function getIO() {
    return ioInstance;
}
//# sourceMappingURL=socket.js.map