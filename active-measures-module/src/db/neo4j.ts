import * as neo4j from 'neo4j-driver';
import logger from '../utils/logger';
import { Entity, Relationship } from '../../../packages/contracts/src/graphql';

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';

let driver: neo4j.Driver;
let isMockMode = false;

export function getNeo4jDriver(): neo4j.Driver {
  if (!driver) {
    try {
      driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
        {
          maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
          disableLosslessIntegers: true, // Milspec precision
        }
      );

      driver
        .verifyConnectivity()
        .then(() => {
          logger.info('Neo4j Active Measures driver initialized successfully');
          isMockMode = false;
        })
        .catch((error) => {
          logger.warn('Neo4j connection failed - switching to mock mode', { error: error.message });
          isMockMode = true;
        });
    } catch (error) {
      logger.warn('Neo4j connection failed - using mock mode', { error: error.message });
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
    session: () => ({
      run: async (cypher: string, params?: any) => {
        logger.debug('Mock Neo4j query executed', { cypher, params });
        return {
          records: [],
          summary: { counters: { nodesCreated: 0, relationshipsCreated: 0 } },
        };
      },
      close: async () => {},
      readTransaction: async (fn: any) => fn({ run: async () => ({ records: [] }) }),
      writeTransaction: async (fn: any) => fn({ run: async () => ({ records: [] }) }),
    } as any),
    close: async () => {},
    verifyConnectivity: async () => ({}),
  } as any;
}

export class ActiveMeasuresGraphRepo {
  private driver: neo4j.Driver;

  constructor() {
    this.driver = getNeo4jDriver();
  }

  // Initialize constraints and indexes for Active Measures
  async initializeSchema(): Promise<void> {
    const session = this.driver.session();
    try {
      const constraints = [
        // Core constraints
        'CREATE CONSTRAINT active_measure_id IF NOT EXISTS FOR (m:ActiveMeasure) REQUIRE m.id IS UNIQUE',
        'CREATE CONSTRAINT operation_id IF NOT EXISTS FOR (o:Operation) REQUIRE o.id IS UNIQUE',
        'CREATE CONSTRAINT target_id IF NOT EXISTS FOR (t:Target) REQUIRE t.id IS UNIQUE',
        'CREATE CONSTRAINT actor_id IF NOT EXISTS FOR (a:Actor) REQUIRE a.id IS UNIQUE',
        
        // Security constraints
        'CREATE CONSTRAINT classified_operation IF NOT EXISTS FOR (o:Operation) REQUIRE o.classification IS NOT NULL',
        'CREATE CONSTRAINT audit_entry_id IF NOT EXISTS FOR (a:AuditEntry) REQUIRE a.id IS UNIQUE',
        
        // Simulation constraints
        'CREATE CONSTRAINT simulation_id IF NOT EXISTS FOR (s:Simulation) REQUIRE s.id IS UNIQUE',
        'CREATE CONSTRAINT scenario_id IF NOT EXISTS FOR (sc:Scenario) REQUIRE sc.id IS UNIQUE',
      ];

      for (const constraint of constraints) {
        await session.run(constraint);
      }

      const indexes = [
        // Performance indexes
        'CREATE INDEX active_measure_category IF NOT EXISTS FOR (m:ActiveMeasure) ON (m.category)',
        'CREATE INDEX operation_status IF NOT EXISTS FOR (o:Operation) ON (o.status)',
        'CREATE INDEX operation_timeline IF NOT EXISTS FOR (o:Operation) ON (o.scheduledStart, o.actualStart)',
        'CREATE INDEX target_type IF NOT EXISTS FOR (t:Target) ON (t.type)',
        'CREATE INDEX audit_timestamp IF NOT EXISTS FOR (a:AuditEntry) ON (a.timestamp)',
        'CREATE INDEX simulation_status IF NOT EXISTS FOR (s:Simulation) ON (s.status)',
        
        // Classification indexes
        'CREATE INDEX operation_classification IF NOT EXISTS FOR (o:Operation) ON (o.classification)',
        'CREATE INDEX measure_risk_level IF NOT EXISTS FOR (m:ActiveMeasure) ON (m.riskLevel)',
        
        // Effectiveness indexes
        'CREATE INDEX measure_effectiveness IF NOT EXISTS FOR (m:ActiveMeasure) ON (m.effectivenessRating)',
        'CREATE INDEX operation_success IF NOT EXISTS FOR (o:Operation) ON (o.successRate)',
      ];

      for (const index of indexes) {
        await session.run(index);
      }

      logger.info('Active Measures Neo4j schema initialized');
    } catch (error) {
      logger.error('Failed to initialize Active Measures schema', { error: error.message });
      throw error;
    } finally {
      await session.close();
    }
  }

  // Create an Active Measure
  async createActiveMeasure(measure: any): Promise<string> {
    const session = this.driver.session();
    try {
      const query = `
        CREATE (m:ActiveMeasure {
          id: $id,
          name: $name,
          category: $category,
          description: $description,
          riskLevel: $riskLevel,
          effectivenessRating: $effectivenessRating,
          unattributabilityScore: $unattributabilityScore,
          classification: $classification,
          createdAt: datetime(),
          updatedAt: datetime(),
          metadata: $metadata
        })
        RETURN m.id as id
      `;

      const result = await session.run(query, {
        id: measure.id,
        name: measure.name,
        category: measure.category,
        description: measure.description,
        riskLevel: measure.riskLevel,
        effectivenessRating: measure.effectivenessRating,
        unattributabilityScore: measure.unattributabilityScore,
        classification: measure.classification,
        metadata: measure.metadata || {},
      });

      return result.records[0]?.get('id');
    } catch (error) {
      logger.error('Failed to create active measure', { error: error.message, measure });
      throw error;
    } finally {
      await session.close();
    }
  }

  // Create an Operation
  async createOperation(operation: any): Promise<string> {
    const session = this.driver.session();
    try {
      const query = `
        CREATE (o:Operation {
          id: $id,
          name: $name,
          description: $description,
          status: $status,
          classification: $classification,
          objectives: $objectives,
          scheduledStart: datetime($scheduledStart),
          estimatedDuration: $estimatedDuration,
          createdBy: $createdBy,
          createdAt: datetime(),
          updatedAt: datetime(),
          metadata: $metadata
        })
        RETURN o.id as id
      `;

      const result = await session.run(query, {
        id: operation.id,
        name: operation.name,
        description: operation.description,
        status: operation.status || 'DRAFT',
        classification: operation.classification,
        objectives: operation.objectives || [],
        scheduledStart: operation.scheduledStart,
        estimatedDuration: operation.estimatedDuration,
        createdBy: operation.createdBy,
        metadata: operation.metadata || {},
      });

      return result.records[0]?.get('id');
    } catch (error) {
      logger.error('Failed to create operation', { error: error.message, operation });
      throw error;
    } finally {
      await session.close();
    }
  }

  // Get Active Measures Portfolio
  async getActiveMeasuresPortfolio(filters: any = {}): Promise<any[]> {
    const session = this.driver.session();
    try {
      let whereClause = '';
      const params: any = {};

      if (filters.categories && filters.categories.length > 0) {
        whereClause += ' AND m.category IN $categories';
        params.categories = filters.categories;
      }

      if (filters.riskLevels && filters.riskLevels.length > 0) {
        whereClause += ' AND m.riskLevel IN $riskLevels';
        params.riskLevels = filters.riskLevels;
      }

      if (filters.effectivenessThreshold) {
        whereClause += ' AND m.effectivenessRating >= $effectivenessThreshold';
        params.effectivenessThreshold = filters.effectivenessThreshold;
      }

      const query = `
        MATCH (m:ActiveMeasure)
        WHERE 1=1 ${whereClause}
        OPTIONAL MATCH (m)<-[u:USES_MEASURE]-(o:Operation)
        WITH m, count(o) as usageCount
        RETURN m {
          .*,
          usageCount: usageCount,
          lastUsed: null
        } as measure
        ORDER BY m.effectivenessRating DESC, m.createdAt DESC
      `;

      const result = await session.run(query, params);
      return result.records.map(record => record.get('measure'));
    } catch (error) {
      logger.error('Failed to get active measures portfolio', { error: error.message, filters });
      throw error;
    } finally {
      await session.close();
    }
  }

  // Get Operation with full details
  async getOperation(operationId: string): Promise<any | null> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (o:Operation {id: $operationId})
        OPTIONAL MATCH (o)-[um:USES_MEASURE]->(m:ActiveMeasure)
        OPTIONAL MATCH (o)-[tt:TARGETS]->(t:Target)
        OPTIONAL MATCH (o)<-[as:ASSIGNED_TO]-(a:Actor)
        OPTIONAL MATCH (o)-[hs:HAS_SIMULATION]->(s:Simulation)
        RETURN o {
          .*,
          measures: collect(DISTINCT m { .*, relationship: um }),
          targets: collect(DISTINCT t),
          team: collect(DISTINCT a),
          simulations: collect(DISTINCT s)
        } as operation
      `;

      const result = await session.run(query, { operationId });
      return result.records.length > 0 ? result.records[0].get('operation') : null;
    } catch (error) {
      logger.error('Failed to get operation', { error: error.message, operationId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      logger.info('Active Measures Neo4j driver closed');
    }
  }
}

export const activeMeasuresGraphRepo = new ActiveMeasuresGraphRepo();
export default activeMeasuresGraphRepo;