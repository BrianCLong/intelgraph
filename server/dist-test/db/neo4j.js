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
exports.getNeo4jDriver = getNeo4jDriver;
exports.isNeo4jMockMode = isNeo4jMockMode;
exports.closeNeo4jDriver = closeNeo4jDriver;
const neo4j = __importStar(require("neo4j-driver"));
const dotenv_1 = __importDefault(require("dotenv"));
const neo4jMetrics_js_1 = require("../metrics/neo4jMetrics.js");
dotenv_1.default.config();
const logger = logger.child({ name: 'neo4j' });
const NEO4J_URI = process.env.NEO4J_URI || "bolt://neo4j:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "devpassword";
let driver;
let isMockMode = false;
function getNeo4jDriver() {
    if (!driver) {
        try {
            driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
            logger.info("Neo4j driver initialized.");
            const originalSession = driver.session.bind(driver);
            driver.session = (options) => {
                const session = originalSession(options);
                return instrumentSession(session);
            };
            driver
                .verifyConnectivity()
                .then(() => neo4jMetrics_js_1.neo4jConnectivityUp.set(1))
                .catch(() => {
                logger.warn("Neo4j connection failed - switching to mock mode");
                neo4jMetrics_js_1.neo4jConnectivityUp.set(0);
                isMockMode = true;
            });
            setInterval(async () => {
                try {
                    await driver.verifyConnectivity();
                    neo4jMetrics_js_1.neo4jConnectivityUp.set(1);
                }
                catch {
                    neo4jMetrics_js_1.neo4jConnectivityUp.set(0);
                }
            }, 15000);
        }
        catch (error) {
            logger.warn(`Neo4j connection failed - using development mode with mock responses. Error: ${error.message}`);
            driver = createMockNeo4jDriver();
            isMockMode = true;
        }
    }
    return driver;
}
function isNeo4jMockMode() {
    return isMockMode;
}
function createMockNeo4jDriver() {
    return {
        session: () => instrumentSession({
            run: async (cypher, params) => {
                logger.debug(`Mock Neo4j query: Cypher: ${cypher}, Params: ${JSON.stringify(params)}`);
                return {
                    records: [],
                    summary: { counters: { nodesCreated: 0, relationshipsCreated: 0 } },
                };
            },
            close: async () => { },
            readTransaction: async (fn) => fn({
                run: async () => ({ records: [] }),
            }),
            writeTransaction: async (fn) => fn({
                run: async () => ({ records: [] }),
            }),
        }),
        close: async () => { },
        verifyConnectivity: async () => ({}),
    };
}
async function closeNeo4jDriver() {
    if (driver) {
        await driver.close();
        logger.info("Neo4j driver closed.");
        driver = null; // Clear the driver instance
    }
}
function instrumentSession(session) {
    const originalRun = session.run.bind(session);
    session.run = async (cypher, params, labels = {}) => {
        const { operation = "unknown", label = "general" } = labels;
        const start = Date.now();
        neo4jMetrics_js_1.neo4jQueryTotal.inc({ operation, label });
        try {
            const result = await originalRun(cypher, params);
            const latency = Date.now() - start;
            neo4jMetrics_js_1.neo4jQueryLatencyMs.observe({ operation, label }, latency);
            if (latency > 300) {
                logger.warn(`Slow Neo4j query (${latency}ms): ${cypher}`);
            }
            return result;
        }
        catch (error) {
            neo4jMetrics_js_1.neo4jQueryErrorsTotal.inc({ operation, label });
            throw error;
        }
    };
    return session;
}
//# sourceMappingURL=neo4j.js.map