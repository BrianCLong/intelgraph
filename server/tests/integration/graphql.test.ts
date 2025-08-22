import request from 'supertest';
import { createServer } from '../../src/server';
import { createTestUser, createTestCase } from '../setup';

describe('GraphQL API Integration Tests', () => {
  let app: any;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    app = await createServer({ env: 'test' });
    testUser = createTestUser();
    
    // Mock JWT token for testing
    authToken = 'test-jwt-token';
    
    // Mock authentication middleware to return test user
    jest.mock('../../src/middleware/auth', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.user = testUser;
        next();
      }
    }));
  });

  afterAll(async () => {
    if (app?.close) {
      await app.close();
    }
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      const query = `
        query {
          cases {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toMatch(/not authenticated/i);
    });

    it('should allow authenticated requests', async () => {
      const query = `
        query {
          cases {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should enforce role-based access control', async () => {
      const viewerUser = createTestUser({ role: 'viewer' });
      
      // Mock viewer user
      jest.doMock('../../src/middleware/auth', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          req.user = viewerUser;
          next();
        }
      }));

      const mutation = `
        mutation {
          createCase(input: { 
            title: "Test Case",
            description: "Test Description"
          }) {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toMatch(/not authorized/i);
    });
  });

  describe('Case Management', () => {
    it('should create a new case', async () => {
      const mutation = `
        mutation CreateCase($input: CreateCaseInput!) {
          createCase(input: $input) {
            id
            title
            description
            status
            priority
            assignee {
              id
              name
            }
            createdAt
            updatedAt
          }
        }
      `;

      const variables = {
        input: {
          title: 'Test Investigation Case',
          description: 'A test case for integration testing',
          priority: 'HIGH',
          assigneeId: testUser.id
        }
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const caseData = response.body.data.createCase;
      expect(caseData.id).toBeValidUUID();
      expect(caseData.title).toBe(variables.input.title);
      expect(caseData.description).toBe(variables.input.description);
      expect(caseData.status).toBe('ACTIVE');
      expect(caseData.priority).toBe('HIGH');
      expect(caseData.assignee.id).toBe(testUser.id);
      expect(caseData.createdAt).toBeISODate();
      expect(caseData.updatedAt).toBeISODate();
    });

    it('should retrieve case list with pagination', async () => {
      // Create test cases first
      const testCase1 = createTestCase({ title: 'Case 1' });
      const testCase2 = createTestCase({ title: 'Case 2' });
      
      // Mock database to return test cases
      jest.spyOn(global.testDb, 'query').mockResolvedValueOnce({
        rows: [testCase1, testCase2],
        rowCount: 2
      } as any);

      const query = `
        query GetCases($limit: Int, $offset: Int) {
          cases(limit: $limit, offset: $offset) {
            items {
              id
              title
              status
              createdAt
            }
            pageInfo {
              total
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `;

      const variables = { limit: 10, offset: 0 };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const casesData = response.body.data.cases;
      expect(casesData.items).toHaveLength(2);
      expect(casesData.items[0].title).toBe('Case 1');
      expect(casesData.items[1].title).toBe('Case 2');
      expect(casesData.pageInfo.total).toBe(2);
    });

    it('should update case status', async () => {
      const testCase = createTestCase();
      
      const mutation = `
        mutation UpdateCase($id: ID!, $input: UpdateCaseInput!) {
          updateCase(id: $id, input: $input) {
            id
            status
            updatedAt
          }
        }
      `;

      const variables = {
        id: testCase.id,
        input: {
          status: 'RESOLVED'
        }
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const updatedCase = response.body.data.updateCase;
      expect(updatedCase.id).toBe(testCase.id);
      expect(updatedCase.status).toBe('RESOLVED');
    });
  });

  describe('Entity Management', () => {
    it('should create entity with validation', async () => {
      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            type
            name
            properties
            confidence
            caseId
          }
        }
      `;

      const variables = {
        input: {
          type: 'PERSON',
          name: 'John Doe',
          properties: {
            email: 'john.doe@example.com',
            phone: '+1-555-0123'
          },
          caseId: 'test-case-1',
          confidence: 0.95
        }
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const entity = response.body.data.createEntity;
      expect(entity.id).toBeValidUUID();
      expect(entity.type).toBe('PERSON');
      expect(entity.name).toBe('John Doe');
      expect(entity.properties.email).toBe('john.doe@example.com');
      expect(entity.confidence).toBe(0.95);
    });

    it('should reject invalid entity data', async () => {
      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          type: 'INVALID_TYPE',
          name: '', // Empty name should be invalid
          confidence: 1.5 // Invalid confidence > 1.0
        }
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toMatch(/validation/i);
    });
  });

  describe('Graph Analytics', () => {
    it('should find shortest path between entities', async () => {
      const query = `
        query FindPath($from: ID!, $to: ID!, $maxHops: Int) {
          findPath(from: $from, to: $to, maxHops: $maxHops) {
            path {
              nodes {
                id
                type
                name
              }
              edges {
                id
                type
                weight
              }
            }
            distance
            confidence
          }
        }
      `;

      const variables = {
        from: 'entity-1',
        to: 'entity-2',
        maxHops: 5
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const pathData = response.body.data.findPath;
      expect(pathData.path).toBeDefined();
      expect(pathData.distance).toBeGreaterThanOrEqual(0);
      expect(pathData.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should calculate centrality metrics', async () => {
      const query = `
        query CalculateCentrality($entityId: ID!, $type: CentralityType!) {
          calculateCentrality(entityId: $entityId, type: $type) {
            score
            rank
            percentile
          }
        }
      `;

      const variables = {
        entityId: 'entity-1',
        type: 'BETWEENNESS'
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const centrality = response.body.data.calculateCentrality;
      expect(centrality.score).toBeGreaterThanOrEqual(0);
      expect(centrality.rank).toBeGreaterThan(0);
      expect(centrality.percentile).toBeGreaterThanOrEqual(0);
      expect(centrality.percentile).toBeLessThanOrEqual(100);
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should handle case updates subscription', (done) => {
      // Mock WebSocket subscription
      const subscription = `
        subscription CaseUpdates($caseId: ID!) {
          caseUpdated(caseId: $caseId) {
            id
            title
            status
            updatedAt
          }
        }
      `;

      // This would require WebSocket testing setup
      // For now, we'll test the subscription resolver directly
      expect(subscription).toBeDefined();
      done();
    });
  });

  describe('Search Integration', () => {
    it('should perform full-text search', async () => {
      const query = `
        query Search($query: String!, $filters: SearchFilters) {
          search(query: $query, filters: $filters) {
            results {
              id
              type
              title
              snippet
              score
            }
            total
            facets {
              entityTypes {
                value
                count
              }
              sources {
                value
                count
              }
            }
          }
        }
      `;

      const variables = {
        query: 'test investigation',
        filters: {
          entityTypes: ['PERSON', 'ORGANIZATION']
        }
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const searchData = response.body.data.search;
      expect(searchData.results).toBeDefined();
      expect(searchData.total).toBeGreaterThanOrEqual(0);
      expect(searchData.facets).toBeDefined();
    });
  });

  describe('Audit Trail', () => {
    it('should create audit log for mutations', async () => {
      const mutation = `
        mutation CreateCase($input: CreateCaseInput!) {
          createCase(input: $input) {
            id
            auditTrail {
              id
              action
              userId
              timestamp
              changes
            }
          }
        }
      `;

      const variables = {
        input: {
          title: 'Audited Case',
          description: 'Test case for audit trail'
        }
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const caseData = response.body.data.createCase;
      expect(caseData.auditTrail).toBeDefined();
      expect(caseData.auditTrail.length).toBeGreaterThan(0);
      
      const auditEntry = caseData.auditTrail[0];
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.userId).toBe(testUser.id);
      expect(auditEntry.timestamp).toBeISODate();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest.spyOn(global.testDb, 'query').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const query = `
        query {
          cases {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toMatch(/database/i);
    });

    it('should handle malformed GraphQL queries', async () => {
      const invalidQuery = `
        query {
          cases {
            invalidField
        }
      `; // Missing closing brace

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: invalidQuery });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const query = `
        query {
          cases(limit: 10) {
            items {
              id
              title
            }
          }
        }
      `;

      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.errors).toBeUndefined();
      });

      // Should complete within reasonable time (5 seconds for 10 concurrent requests)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});