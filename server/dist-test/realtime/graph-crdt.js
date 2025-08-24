"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGraphSync = initGraphSync;
exports.registerGraphHandlers = registerGraphHandlers;
const ioredis_1 = __importDefault(require("ioredis"));
const logger = logger.child({ name: 'graph-crdt' });
class GraphCRDT {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }
    apply(op) {
        const store = op.kind === "node" ? this.nodes : this.edges;
        const existing = store.get(op.id);
        if (!existing || op.ts >= existing.ts) {
            if (op.action === "delete") {
                store.delete(op.id);
            }
            else {
                store.set(op.id, { ts: op.ts, data: op.data });
            }
            return true;
        }
        return false;
    }
}
const graphs = new Map();
function getGraph(graphId) {
    let entry = graphs.get(graphId);
    if (!entry) {
        entry = { crdt: new GraphCRDT(), clock: 0 };
        graphs.set(graphId, entry);
    }
    return entry;
}
const redisOptions = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
};
const pub = new ioredis_1.default(redisOptions);
const sub = pub.duplicate();
let ioRef = null;
function initGraphSync(ns) {
    ioRef = ns;
    sub.psubscribe("graph:op:*");
    sub.on("pmessage", (_pattern, channel, message) => {
        const graphId = channel.split(":")[2];
        const op = JSON.parse(message);
        const entry = getGraph(graphId);
        entry.clock = Math.max(entry.clock, op.ts);
        if (entry.crdt.apply(op)) {
            ioRef?.to(`graph:${graphId}`).emit("graph:op", { graphId, op });
        }
    });
    sub.on("error", (err) => logger.error({ err }, "Redis sub error"));
}
function registerGraphHandlers(socket) {
    socket.on("graph:op", ({ graphId, op }) => {
        if (!graphId || !op)
            return;
        const entry = getGraph(graphId);
        entry.clock = Math.max(entry.clock, op.ts || 0) + 1;
        op.ts = entry.clock;
        if (entry.crdt.apply(op)) {
            socket.to(`graph:${graphId}`).emit("graph:op", { graphId, op });
            pub.publish(`graph:op:${graphId}`, JSON.stringify(op));
        }
    });
}
//# sourceMappingURL=graph-crdt.js.map