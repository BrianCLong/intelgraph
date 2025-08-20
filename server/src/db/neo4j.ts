import * as neo4j from "neo4j-driver";
import dotenv from "dotenv";
import logger from '../config/logger';
import {
  neo4jConnectivityUp,
  neo4jQueryErrorsTotal,
  neo4jQueryLatencyMs,
  neo4jQueryTotal,
} from "../metrics/neo4jMetrics.js";

dotenv.config();

const logger = logger.child({ name: 'neo4j' });

const NEO4J_URI = process.env.NEO4J_URI || "bolt://neo4j:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "devpassword";

let driver: neo4j.Driver;

let isMockMode = false;

export function getNeo4jDriver(): neo4j.Driver {
  if (!driver) {
    try {
      driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      );
      logger.info("Neo4j driver initialized.");
      const originalSession = driver.session.bind(driver);
      driver.session = (options?: any) => {
        const session = originalSession(options);
        return instrumentSession(session);
      };

      driver
        .verifyConnectivity()
        .then(() => neo4jConnectivityUp.set(1))
        .catch(() => {
          logger.warn("Neo4j connection failed - switching to mock mode");
          neo4jConnectivityUp.set(0);
          isMockMode = true;
        });

      setInterval(async () => {
        try {
          await driver.verifyConnectivity();
          neo4jConnectivityUp.set(1);
        } catch {
          neo4jConnectivityUp.set(0);
        }
      }, 15000);
    } catch (error) {
      logger.warn(
        `Neo4j connection failed - using development mode with mock responses. Error: ${(error as Error).message}`,
      );
      driver = createMockNeo4jDriver();
      isMockMode = true;
    }
  }
  return driver;
}

export function isNeo4jMockMode(): boolean {
  return isMockMode;
}

function createMockNeo4jDriver(): neo4j.Driver {
  return {
    session: () =>
      instrumentSession({
        run: async (cypher: string, params?: any) => {
          logger.debug(
            `Mock Neo4j query: Cypher: ${cypher}, Params: ${JSON.stringify(params)}`,
          );
          return {
            records: [],
            summary: { counters: { nodesCreated: 0, relationshipsCreated: 0 } },
          };
        },
        close: async () => {},
        readTransaction: async (fn: any) =>
          fn({
            run: async () => ({ records: [] }),
          }),
        writeTransaction: async (fn: any) =>
          fn({
            run: async () => ({ records: [] }),
          }),
      } as any),
    close: async () => {},
    verifyConnectivity: async () => ({}),
  } as any;
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    logger.info("Neo4j driver closed.");
    driver = null; // Clear the driver instance
  }
}

function instrumentSession(session: any) {
  const originalRun = session.run.bind(session);
  session.run = async (
    cypher: string,
    params?: any,
    labels: { operation?: string; label?: string } = {},
  ) => {
    const { operation = "unknown", label = "general" } = labels;
    const start = Date.now();
    neo4jQueryTotal.inc({ operation, label });
    try {
      const result = await originalRun(cypher, params);
      const latency = Date.now() - start;
      neo4jQueryLatencyMs.observe({ operation, label }, latency);
      if (latency > 300) {
        logger.warn(`Slow Neo4j query (${latency}ms): ${cypher}`);
      }
      return result;
    } catch (error) {
      neo4jQueryErrorsTotal.inc({ operation, label });
      throw error;
    }
  };
  return session;
}
