/**
 * IntelGraph API Integration Tests
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

const request = require('supertest');
const { createApp } = require('../../services/api/src/app.js');
const { neo4jConnection } = require('../../services/api/src/db/neo4j.js');
const { postgresConnection } = require('../../services/api/src/db/postgres.js');
const { redisConnection } = require('../../services/api/src/db/redis.js');

describe('IntelGraph API Integration Tests', () => {
  let app;
  let authToken;
  const testTenantId = 'test-tenant-123';

  beforeAll(async () => {
    // Initialize test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.OIDC_ISSUER = 'https://test.auth.com';
    
    // Create application
    app = await createApp();
    
    // Setup test data and authentication
    authToken = 'Bearer test-jwt-token';
    
    // Clear test data
    await clearTestData();
  });

  afterAll(async () => {
    // Cleanup connections
    await neo4jConnection.close();
    await postgresConnection.close();
    await redisConnection.close();
  });

  beforeEach(async () => {
    // Reset test state before each test
    await clearTestData();
  });

  async function clearTestData() {
    try {
      // Clear Neo4j test data
      await neo4jConnection.executeQuery(
        'MATCH (n {tenantId: $tenantId}) DETACH DELETE n',
        { tenantId: testTenantId }
      );

      // Clear PostgreSQL test data
      await postgresConnection.query(
        'DELETE FROM entity_metadata WHERE tenant_id = $1',
        [testTenantId]
      );
      await postgresConnection.query(
        'DELETE FROM investigations WHERE tenant_id = $1',
        [testTenantId]
      );
    } catch (error) {
      console.error('Failed to clear test data:', error);
    }
  }

  describe('Health Checks', () => {
    test('GET /health should return service status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('GET /metrics should return monitoring data', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GraphQL API', () => {
    test('should handle GraphQL queries', async () => {
      const query = `
        query {
          __schema {
            queryType {
              name
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({ query })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.__schema.queryType.name).toBe('Query');
    });

    test('should create and query entities', async () => {
      // Create entity mutation
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            name
            type
            confidence
          }
        }
      `;

      const entityInput = {
        type: 'PERSON',
        name: 'John Doe',
        description: 'Test person',
        properties: { age: 30, location: 'New York' },
        sourceIds: []
      };

      const createResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createMutation,
          variables: { input: entityInput }
        })
        .expect(200);

      expect(createResponse.body.data.createEntity).toMatchObject({
        name: 'John Doe',
        type: 'PERSON',
        confidence: 1
      });

      const entityId = createResponse.body.data.createEntity.id;

      // Query entity
      const queryEntity = `
        query GetEntity($id: ID!) {
          entity(id: $id) {
            id
            name
            type
            properties
          }
        }
      `;

      const queryResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: queryEntity,
          variables: { id: entityId }
        })
        .expect(200);

      expect(queryResponse.body.data.entity).toMatchObject({
        id: entityId,
        name: 'John Doe',
        type: 'PERSON'
      });
    });

    test('should enforce tenant isolation', async () => {
      const differentTenantId = 'different-tenant-456';

      // Create entity in one tenant
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            name
          }
        }
      `;

      const entityInput = {
        type: 'ORGANIZATION',
        name: 'Secret Corp',
        sourceIds: []
      };

      const createResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createMutation,
          variables: { input: entityInput }
        })
        .expect(200);

      const entityId = createResponse.body.data.createEntity.id;

      // Try to query from different tenant
      const queryEntity = `
        query GetEntity($id: ID!) {
          entity(id: $id) {
            id
            name
          }
        }
      `;

      const queryResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', differentTenantId)
        .send({
          query: queryEntity,
          variables: { id: entityId }
        })
        .expect(200);

      // Should not find entity from different tenant
      expect(queryResponse.body.data.entity).toBeNull();
    });
  });

  describe('Real-time Features', () => {
    test('should handle WebSocket connections', (done) => {
      const io = require('socket.io-client');
      const client = io('http://localhost:4000', {
        auth: {
          token: 'test-token'
        }
      });

      client.on('connect', () => {
        client.emit('investigation:join', 'test-investigation-123');
      });

      client.on('investigation:state', (state) => {
        expect(state).toHaveProperty('investigation');
        expect(state).toHaveProperty('timestamp');
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        done(error);
      });
    });
  });

  describe('Authentication & Authorization', () => {
    test('should reject requests without authentication', async () => {
      const query = `
        query {
          entities {
            id
            name
          }
        }
      `;

      await request(app)
        .post('/graphql')
        .send({ query })
        .expect(401);
    });

    test('should enforce role-based permissions', async () => {
      const restrictedMutation = `
        mutation DeleteEntity($id: ID!) {
          deleteEntity(id: $id)
        }
      `;

      // Mock viewer role token (should not have delete permissions)
      const viewerToken = 'Bearer viewer-jwt-token';

      await request(app)
        .post('/graphql')
        .set('Authorization', viewerToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: restrictedMutation,
          variables: { id: 'test-entity-id' }
        })
        .expect(403);
    });
  });

  describe('Performance & Reliability', () => {
    test('should handle concurrent requests', async () => {
      const query = `
        query {
          entities(limit: 10) {
            id
            name
            type
          }
        }
      `;

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/graphql')
          .set('Authorization', authToken)
          .set('X-Tenant-ID', testTenantId)
          .send({ query })
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      });
    });

    test('should handle malformed GraphQL queries gracefully', async () => {
      const malformedQuery = `
        query {
          entities {
            id
            nonExistentField
            invalidNesting {
              anotherInvalidField
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({ query: malformedQuery })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toHaveProperty('message');
    });
  });

  describe('Data Validation', () => {
    test('should validate entity input data', async () => {
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            name
            type
          }
        }
      `;

      // Invalid entity type
      const invalidInput = {
        type: 'INVALID_TYPE',
        name: 'Test Entity',
        sourceIds: []
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createMutation,
          variables: { input: invalidInput }
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    test('should validate confidence scores', async () => {
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            confidence
          }
        }
      `;

      // Invalid confidence score (> 1.0)
      const invalidInput = {
        type: 'PERSON',
        name: 'Test Person',
        confidence: 1.5,
        sourceIds: []
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createMutation,
          variables: { input: invalidInput }
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Analytics Integration', () => {
    test('should perform pathfinding between entities', async () => {
      // First create two entities and a relationship
      const createEntityMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const entity1Response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createEntityMutation,
          variables: {
            input: {
              type: 'PERSON',
              name: 'Alice',
              sourceIds: []
            }
          }
        })
        .expect(200);

      const entity2Response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createEntityMutation,
          variables: {
            input: {
              type: 'PERSON',
              name: 'Bob',
              sourceIds: []
            }
          }
        })
        .expect(200);

      const entity1Id = entity1Response.body.data.createEntity.id;
      const entity2Id = entity2Response.body.data.createEntity.id;

      // Create relationship
      const createRelationshipMutation = `
        mutation CreateRelationship($input: CreateRelationshipInput!) {
          createRelationship(input: $input) {
            id
          }
        }
      `;

      await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createRelationshipMutation,
          variables: {
            input: {
              type: 'CONNECTED_TO',
              sourceId: entity1Id,
              targetId: entity2Id,
              sourceIds: []
            }
          }
        })
        .expect(200);

      // Test pathfinding
      const pathfindingQuery = `
        query FindPaths($input: PathfindingInput!) {
          findPaths(input: $input) {
            paths {
              length
              nodes {
                id
                name
              }
            }
            totalPaths
          }
        }
      `;

      const pathResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: pathfindingQuery,
          variables: {
            input: {
              sourceId: entity1Id,
              targetId: entity2Id,
              algorithm: 'SHORTEST_PATH'
            }
          }
        })
        .expect(200);

      expect(pathResponse.body.data.findPaths.paths).toHaveLength(1);
      expect(pathResponse.body.data.findPaths.paths[0].length).toBe(1);
    });
  });
});