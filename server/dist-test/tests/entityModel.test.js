/**
 * Entity Model Tests
 * Tests for Neo4j entity modeling, constraints, indexes, and migrations
 */
const { EntityModelService, entityModelService } = require('../services/EntityModelService');
const { migrationManager } = require('../db/migrations/index');
const { connectNeo4j, connectPostgres, getNeo4jDriver, closeConnections } = require('../config/database');
describe('Entity Model System', () => {
    beforeAll(async () => {
        // Set up test database connections
        await connectPostgres();
        await connectNeo4j();
        entityModelService.initialize();
    });
    afterAll(async () => {
        await closeConnections();
    });
    describe('Migration System', () => {
        test('should initialize migration tracking table', async () => {
            await expect(migrationManager.initialize()).resolves.not.toThrow();
        });
        test('should get migration status', async () => {
            const status = await migrationManager.status();
            expect(Array.isArray(status)).toBe(true);
            // Should have at least the initial migrations
            const migrationVersions = status.map(s => s.version);
            expect(migrationVersions).toContain('001_initial_entity_model');
            expect(migrationVersions).toContain('002_entity_type_specialization');
        });
        test('should track applied migrations', async () => {
            const appliedMigrations = await migrationManager.getAppliedMigrations();
            expect(appliedMigrations instanceof Set).toBe(true);
            expect(appliedMigrations.size).toBeGreaterThan(0);
        });
    });
    describe('Entity Model Constraints', () => {
        let driver;
        let session;
        beforeEach(() => {
            driver = getNeo4jDriver();
            session = driver.session();
        });
        afterEach(async () => {
            if (session) {
                await session.close();
            }
        });
        test('should enforce unique entity IDs', async () => {
            const entityId = 'test-duplicate-entity-' + Date.now();
            // First entity should succeed
            await session.run(`
        CREATE (e:Entity {
          id: $id,
          type: 'PERSON',
          label: 'Test Person',
          investigationId: 'test-investigation',
          createdBy: 'test-user',
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, { id: entityId });
            // Second entity with same ID should fail
            await expect(session.run(`
        CREATE (e:Entity {
          id: $id,
          type: 'PERSON', 
          label: 'Another Test Person',
          investigationId: 'test-investigation',
          createdBy: 'test-user',
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, { id: entityId })).rejects.toThrow();
            // Cleanup
            await session.run('MATCH (e:Entity {id: $id}) DELETE e', { id: entityId });
        });
        test('should enforce required fields', async () => {
            // Entity without required type should fail
            await expect(session.run(`
        CREATE (e:Entity {
          id: 'test-invalid-entity',
          label: 'Test Entity',
          investigationId: 'test-investigation',
          createdBy: 'test-user',
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `)).rejects.toThrow();
        });
        test('should enforce email format for EMAIL entities', async () => {
            const entityId = 'test-invalid-email-' + Date.now();
            // Invalid email format should fail
            await expect(session.run(`
        CREATE (e:Entity {
          id: $id,
          type: 'EMAIL',
          label: 'not-an-email',
          investigationId: 'test-investigation',
          createdBy: 'test-user',
          createdAt: datetime(),
          updatedAt: datetime()
        })
      `, { id: entityId })).rejects.toThrow();
        });
    });
    describe('Entity Model Service', () => {
        const testInvestigationId = 'test-investigation-' + Date.now();
        const testEntityIds = [];
        beforeEach(async () => {
            // Create test entities
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                for (let i = 0; i < 5; i++) {
                    const entityId = `test-entity-${testInvestigationId}-${i}`;
                    testEntityIds.push(entityId);
                    await session.run(`
            CREATE (e:Entity {
              id: $id,
              type: $type,
              label: $label,
              investigationId: $investigationId,
              createdBy: 'test-user',
              confidence: $confidence,
              createdAt: datetime(),
              updatedAt: datetime()
            })
          `, {
                        id: entityId,
                        type: i % 2 === 0 ? 'PERSON' : 'ORGANIZATION',
                        label: `Test Entity ${i}`,
                        investigationId: testInvestigationId,
                        confidence: 0.5 + (i * 0.1)
                    });
                }
                // Create test relationships
                await session.run(`
          MATCH (e1:Entity {investigationId: $investigationId})
          MATCH (e2:Entity {investigationId: $investigationId})
          WHERE e1.id < e2.id
          CREATE (e1)-[r:RELATIONSHIP {
            id: e1.id + '-' + e2.id,
            type: 'CONNECTED_TO',
            investigationId: $investigationId,
            createdBy: 'test-user',
            confidence: 0.8,
            createdAt: datetime(),
            updatedAt: datetime()
          }]->(e2)
        `, { investigationId: testInvestigationId });
            }
            finally {
                await session.close();
            }
        });
        afterEach(async () => {
            // Cleanup test data
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                await session.run(`
          MATCH (e:Entity {investigationId: $investigationId})
          OPTIONAL MATCH (e)-[r:RELATIONSHIP]-()
          DELETE r, e
        `, { investigationId: testInvestigationId });
            }
            finally {
                await session.close();
            }
        });
        test('should get entity statistics', async () => {
            const stats = await entityModelService.getEntityStatistics(testInvestigationId);
            expect(stats).toHaveProperty('totalEntities');
            expect(stats).toHaveProperty('entityTypes');
            expect(stats).toHaveProperty('avgConfidence');
            expect(stats.totalEntities).toBe(5);
            expect(stats.entityTypes).toContain('PERSON');
            expect(stats.entityTypes).toContain('ORGANIZATION');
            expect(stats.avgConfidence).toBeGreaterThan(0);
        });
        test('should find hub entities', async () => {
            const hubs = await entityModelService.findHubEntities(testInvestigationId, 2);
            expect(Array.isArray(hubs)).toBe(true);
            // With 5 entities in a connected graph, some should have multiple connections
            expect(hubs.length).toBeGreaterThan(0);
            if (hubs.length > 0) {
                expect(hubs[0]).toHaveProperty('entityId');
                expect(hubs[0]).toHaveProperty('connectionCount');
                expect(hubs[0].connectionCount).toBeGreaterThanOrEqual(2);
            }
        });
        test('should validate model integrity', async () => {
            const validation = await entityModelService.validateModelIntegrity(testInvestigationId);
            expect(validation).toHaveProperty('isValid');
            expect(validation).toHaveProperty('issues');
            expect(validation).toHaveProperty('totalIssues');
            // Our test data should be valid
            expect(validation.isValid).toBe(true);
            expect(validation.totalIssues).toBe(0);
        });
        test('should get query performance stats', async () => {
            const perfStats = await entityModelService.getQueryPerformanceStats(testInvestigationId);
            expect(perfStats).toHaveProperty('investigationId');
            expect(perfStats).toHaveProperty('queryStats');
            expect(Array.isArray(perfStats.queryStats)).toBe(true);
            perfStats.queryStats.forEach(stat => {
                expect(stat).toHaveProperty('queryName');
                expect(stat).toHaveProperty('executionTimeMs');
                expect(stat).toHaveProperty('resultCount');
                expect(typeof stat.executionTimeMs).toBe('number');
            });
        });
    });
    describe('Index Performance', () => {
        test('should have efficient entity type queries', async () => {
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                const startTime = Date.now();
                await session.run(`
          MATCH (e:Entity)
          WHERE e.type = 'PERSON'
          RETURN count(e)
        `);
                const executionTime = Date.now() - startTime;
                // Query should complete quickly (under 1000ms for indexed query)
                expect(executionTime).toBeLessThan(1000);
            }
            finally {
                await session.close();
            }
        });
        test('should have efficient investigation queries', async () => {
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                const startTime = Date.now();
                await session.run(`
          MATCH (e:Entity)
          WHERE e.investigationId = 'test-investigation'
          RETURN count(e)
        `);
                const executionTime = Date.now() - startTime;
                expect(executionTime).toBeLessThan(1000);
            }
            finally {
                await session.close();
            }
        });
    });
});
//# sourceMappingURL=entityModel.test.js.map