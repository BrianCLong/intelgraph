"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const ws_1 = require("graphql-ws/lib/use/ws");
const ws_2 = require("ws");
const auth_js_1 = require("./lib/auth.js");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// import WSPersistedQueriesMiddleware from "./graphql/middleware/wsPersistedQueries.js";
const app_js_1 = require("./app.js");
const schema_1 = require("@graphql-tools/schema");
const schema_js_1 = require("./graphql/schema.js");
const index_js_1 = __importDefault(require("./graphql/resolvers/index.js"));
const DataRetentionService_js_1 = require("./services/DataRetentionService.js");
const neo4j_js_1 = require("./db/neo4j.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const logger = logger.child({ name: 'index' });
const startServer = async () => {
    // Optional Kafka consumer import - only when AI services enabled
    let startKafkaConsumer = null;
    let stopKafkaConsumer = null;
    if (process.env.AI_ENABLED === 'true' || process.env.KAFKA_ENABLED === 'true') {
        try {
            const kafkaModule = await Promise.resolve().then(() => __importStar(require('./realtime/kafkaConsumer.js')));
            startKafkaConsumer = kafkaModule.startKafkaConsumer;
            stopKafkaConsumer = kafkaModule.stopKafkaConsumer;
        }
        catch (error) {
            logger.warn('Kafka not available - running in minimal mode');
        }
    }
    const app = await (0, app_js_1.createApp)();
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: schema_js_1.typeDefs, resolvers: index_js_1.default });
    const httpServer = http_1.default.createServer(app);
    // Subscriptions with Persisted Query validation
    const wss = new ws_2.WebSocketServer({
        server: httpServer,
        path: "/graphql",
    });
    // const wsPersistedQueries = new WSPersistedQueriesMiddleware();
    // const wsMiddleware = wsPersistedQueries.createMiddleware();
    (0, ws_1.useServer)({
        schema,
        context: auth_js_1.getContext,
        // ...wsMiddleware,
    }, wss);
    if (process.env.NODE_ENV === "production") {
        const clientDistPath = path_1.default.resolve(__dirname, "../../client/dist");
        app.use(express.static(clientDistPath));
        app.get("*", (_req, res) => {
            res.sendFile(path_1.default.join(clientDistPath, "index.html"));
        });
    }
    const { initSocket, getIO } = await Promise.resolve().then(() => __importStar(require("./realtime/socket.ts"))); // JWT auth
    const port = Number(process.env.PORT || 4000);
    httpServer.listen(port, async () => {
        logger.info(`Server listening on port ${port}`);
        // Initialize and start Data Retention Service
        const neo4jDriver = (0, neo4j_js_1.getNeo4jDriver)();
        const dataRetentionService = new DataRetentionService_js_1.DataRetentionService(neo4jDriver);
        dataRetentionService.startCleanupJob(); // Start the cleanup job
        // WAR-GAMED SIMULATION - Start Kafka Consumer
        await startKafkaConsumer();
        // Create sample data for development
        if (process.env.NODE_ENV === "development") {
            setTimeout(async () => {
                try {
                    const { createSampleData } = await Promise.resolve().then(() => __importStar(require("./utils/sampleData.js")));
                    await createSampleData();
                }
                catch (error) {
                    logger.warn("Failed to create sample data, continuing without it");
                }
            }, 2000); // Wait 2 seconds for connections to be established
        }
    });
    // Initialize Socket.IO
    const io = initSocket(httpServer);
    const { closeNeo4jDriver } = await Promise.resolve().then(() => __importStar(require("./db/neo4j.js")));
    const { closePostgresPool } = await Promise.resolve().then(() => __importStar(require("./db/postgres.js")));
    const { closeRedisClient } = await Promise.resolve().then(() => __importStar(require("./db/redis.js")));
    // Graceful shutdown
    const shutdown = async (sig) => {
        logger.info(`Shutting down. Signal: ${sig}`);
        wss.close();
        io.close(); // Close Socket.IO server
        if (stopKafkaConsumer)
            await stopKafkaConsumer(); // WAR-GAMED SIMULATION - Stop Kafka Consumer
        await Promise.allSettled([
            closeNeo4jDriver(),
            closePostgresPool(),
            closeRedisClient(),
        ]);
        httpServer.close((err) => {
            if (err) {
                logger.error(`Error during shutdown: ${err instanceof Error ? err.message : "Unknown error"}`);
                process.exitCode = 1;
            }
            process.exit();
        });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
};
startServer();
//# sourceMappingURL=index.js.map