const Redis = require("ioredis");
const logger = require("../utils/logger");
const AuthService = require("../services/AuthService");
const { evaluate } = require("../services/AccessControl");
const STREAM_KEY = process.env.ANALYTICS_RESULTS_STREAM || "analytics:results";
const GROUP = process.env.ANALYTICS_RESULTS_GROUP || "analytics-bridge";
class AnalyticsBridge {
    constructor(io, redisUrl) {
        this.io = io;
        this.ns = io.of("/graph-analytics");
        const redisOptions = redisUrl ||
            process.env.REDIS_URL || {
            host: process.env.REDIS_HOST || "localhost",
            port: Number(process.env.REDIS_PORT || 6379),
            password: process.env.REDIS_PASSWORD || undefined,
            db: Number(process.env.REDIS_DB || 1),
        };
        this.redis = new Redis(redisOptions);
        this.redis.on("error", (err) => {
            logger.warn(`Redis connection failed for analytics bridge - using mock. Error: ${err.message}`);
            this.redis = createMockRedis();
        });
        this.consumer = `${process.env.HOSTNAME || "c"}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        this.running = false;
        this._setupNamespace();
    }
    _setupNamespace() {
        const authService = new AuthService();
        // Require JWT and attach user (bypassable for tests/dev by env)
        const bypassAuth = process.env.DISABLE_SOCKET_AUTH === "1" ||
            process.env.NODE_ENV === "test";
        this.ns.use(async (socket, next) => {
            try {
                if (bypassAuth) {
                    socket.user = { id: "test", role: "ANALYST" };
                    return next();
                }
                const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.replace("Bearer ", "");
                const user = await authService.verifyToken(token);
                if (!user)
                    return next(new Error("Unauthorized"));
                socket.user = user;
                next();
            }
            catch (e) {
                next(new Error("Unauthorized"));
            }
        });
        this.ns.on("connection", (socket) => {
            socket.on("join_job", async ({ jobId }) => {
                if (!jobId)
                    return;
                // ABAC gate for job visibility
                const decision = await evaluate("analytics_job_view", socket.user, { jobId }, {});
                if (!decision?.allow) {
                    socket.emit("error", {
                        code: "FORBIDDEN",
                        message: "Not authorized to view job",
                    });
                    return;
                }
                socket.join(`job:${jobId}`);
            });
            socket.on("leave_job", ({ jobId }) => {
                if (!jobId)
                    return;
                socket.leave(`job:${jobId}`);
            });
        });
    }
    async _ensureGroup() {
        try {
            await this.redis.xgroup("CREATE", STREAM_KEY, GROUP, "$", "MKSTREAM");
            logger.info(`Created consumer group ${GROUP} on ${STREAM_KEY}`);
        }
        catch (e) {
            // Group exists
            if (!String(e.message || "").includes("BUSYGROUP")) {
                logger.warn("xgroup create error", e);
            }
        }
    }
    _classify(event) {
        const msg = (event.message || "").toLowerCase();
        const level = (event.level || "INFO").toUpperCase();
        if (level === "ERROR" || msg.includes("fail"))
            return "error";
        if (msg.startsWith("job:done") || msg.startsWith("job:complete"))
            return "complete";
        if (msg.includes("done") || msg.includes("result"))
            return "result";
        return "progress";
    }
    async start() {
        await this._ensureGroup();
        this.running = true;
        this._loop();
    }
    async stop() {
        this.running = false;
    }
    async _loop() {
        while (this.running) {
            try {
                const res = await this.redis.xreadgroup("GROUP", GROUP, this.consumer, "BLOCK", 200, "COUNT", 64, "STREAMS", STREAM_KEY, ">");
                if (!res)
                    continue; // timeout
                for (const [_stream, entries] of res) {
                    for (const [id, fields] of entries) {
                        try {
                            const raw = fields.event || fields.data || fields.payload || null;
                            if (!raw) {
                                await this.redis.xack(STREAM_KEY, GROUP, id);
                                continue;
                            }
                            const ev = JSON.parse(raw);
                            const type = this._classify(ev);
                            const jobId = ev.job_id ||
                                ev.jobId ||
                                ev.payload?.job_id ||
                                ev.payload?.jobId;
                            if (jobId) {
                                this.ns.to(`job:${jobId}`).emit(type, ev);
                            }
                            else {
                                // broadcast if no job id
                                this.ns.emit(type, ev);
                            }
                            await this.redis.xack(STREAM_KEY, GROUP, id);
                        }
                        catch (e) {
                            logger.error("analyticsBridge entry error", { err: e });
                            // ack to avoid poison pill loop
                            try {
                                await this.redis.xack(STREAM_KEY, GROUP, id);
                            }
                            catch (_) {
                                /* Intentionally empty */
                            }
                        }
                    }
                }
            }
            catch (e) {
                logger.error("analyticsBridge loop error", { err: e });
                await new Promise((r) => setTimeout(r, 500));
            }
        }
    }
}
function createMockRedis() {
    return {
        xgroup: async () => { },
        xreadgroup: async () => null,
        xack: async () => { },
        on: () => { },
    };
}
module.exports = { AnalyticsBridge };
//# sourceMappingURL=analyticsBridge.js.map