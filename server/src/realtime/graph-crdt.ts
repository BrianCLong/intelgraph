import { Namespace, Socket } from "socket.io";
import Redis from "ioredis";
import logger from '../config/logger';

const logger = logger.child({ name: 'graph-crdt' });

interface GraphOperation {
  id: string;
  kind: "node" | "edge";
  action: "set" | "delete";
  data?: any;
  ts: number;
}

class GraphCRDT {
  private nodes = new Map<string, { ts: number; data: any }>();
  private edges = new Map<string, { ts: number; data: any }>();

  apply(op: GraphOperation): boolean {
    const store = op.kind === "node" ? this.nodes : this.edges;
    const existing = store.get(op.id);
    if (!existing || op.ts >= existing.ts) {
      if (op.action === "delete") {
        store.delete(op.id);
      } else {
        store.set(op.id, { ts: op.ts, data: op.data });
      }
      return true;
    }
    return false;
  }
}

const graphs = new Map<string, { crdt: GraphCRDT; clock: number }>();

function getGraph(graphId: string) {
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

const pub = new Redis(redisOptions);
const sub = pub.duplicate();
let ioRef: Namespace | null = null;

export function initGraphSync(ns: Namespace) {
  ioRef = ns;
  sub.psubscribe("graph:op:*");
  sub.on("pmessage", (_pattern, channel, message) => {
    const graphId = channel.split(":")[2];
    const op: GraphOperation = JSON.parse(message);
    const entry = getGraph(graphId);
    entry.clock = Math.max(entry.clock, op.ts);
    if (entry.crdt.apply(op)) {
      ioRef?.to(`graph:${graphId}`).emit("graph:op", { graphId, op });
    }
  });
  sub.on("error", (err) => logger.error({ err }, "Redis sub error"));
}

export function registerGraphHandlers(socket: Socket) {
  socket.on("graph:op", ({ graphId, op }: { graphId: string; op: GraphOperation }) => {
    if (!graphId || !op) return;
    const entry = getGraph(graphId);
    entry.clock = Math.max(entry.clock, op.ts || 0) + 1;
    op.ts = entry.clock;
    if (entry.crdt.apply(op)) {
      socket.to(`graph:${graphId}`).emit("graph:op", { graphId, op });
      pub.publish(`graph:op:${graphId}`, JSON.stringify(op));
    }
  });
}
