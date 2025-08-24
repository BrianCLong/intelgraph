"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
describe('GraphQL Integration Tests', () => {
    let app;
    let server;
    let authToken;
    let testUserId;
    beforeAll(async () => {
        app = await (0, app_1.createApp)();
        server = app.listen(0); // Listen on a random port
        // Register a test user
        const registerRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .send({
            query: `
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              token
              user { id email }
            }
          }
        `,
            variables: {
                input: {
                    email: 'testuser@example.com',
                    password: 'password123',
                    firstName: 'Test',
                    lastName: 'User',
                },
            },
        });
        expect(registerRes.statusCode).toEqual(200);
        expect(registerRes.body.data.register.token).toBeDefined();
        expect(registerRes.body.data.register.user.id).toBeDefined();
        authToken = registerRes.body.data.register.token;
        testUserId = registerRes.body.data.register.user.id;
    });
    afterAll(async () => {
        await server.close();
    });
    it('should allow user login', async () => {
        const res = await (0, supertest_1.default)(server)
            .post('/graphql')
            .send({
            query: `
          mutation Login($input: LoginInput!) {
            login(input: $input) {
              token
              user { id email }
            }
          }
        `,
            variables: {
                input: {
                    email: 'testuser@example.com',
                    password: 'password123',
                },
            },
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.login.token).toBeDefined();
        expect(res.body.data.login.user.email).toEqual('testuser@example.com');
    });
    it('should create, fetch, update, and delete an entity', async () => {
        // Create Entity
        const createRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation CreateEntity($input: EntityInput!) {
            createEntity(input: $input) {
              id
              label
              type
              investigationId
            }
          }
        `,
            variables: {
                input: {
                    type: 'PERSON',
                    label: 'John Doe',
                    investigationId: 'test-investigation-123',
                },
            },
        });
        expect(createRes.statusCode).toEqual(200);
        expect(createRes.body.data.createEntity.id).toBeDefined();
        expect(createRes.body.data.createEntity.label).toEqual('John Doe');
        const entityId = createRes.body.data.createEntity.id;
        // Fetch Entity
        const fetchRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          query Entity($id: ID!) {
            entity(id: $id) {
              id
              label
            }
          }
        `,
            variables: { id: entityId },
        });
        expect(fetchRes.statusCode).toEqual(200);
        expect(fetchRes.body.data.entity.id).toEqual(entityId);
        expect(fetchRes.body.data.entity.label).toEqual('John Doe');
        // Update Entity
        const updateRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation UpdateEntity($id: ID!, $input: EntityUpdateInput!) {
            updateEntity(id: $id, input: $input) {
              id
              label
            }
          }
        `,
            variables: {
                id: entityId,
                input: {
                    label: 'Jane Doe',
                },
            },
        });
        expect(updateRes.statusCode).toEqual(200);
        expect(updateRes.body.data.updateEntity.id).toEqual(entityId);
        expect(updateRes.body.data.updateEntity.label).toEqual('Jane Doe');
        // Delete Entity
        const deleteRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation DeleteEntity($id: ID!) {
            deleteEntity(id: $id)
          }
        `,
            variables: { id: entityId },
        });
        expect(deleteRes.statusCode).toEqual(200);
        expect(deleteRes.body.data.deleteEntity).toEqual(true);
    });
    it('should create and delete an investigation', async () => {
        // Create Investigation
        const createRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation CreateInvestigation($input: InvestigationInput!) {
            createInvestigation(input: $input) {
              id
              title
            }
          }
        `,
            variables: {
                input: {
                    title: 'Test Investigation',
                    description: 'A test investigation',
                },
            },
        });
        expect(createRes.statusCode).toEqual(200);
        expect(createRes.body.data.createInvestigation.id).toBeDefined();
        expect(createRes.body.data.createInvestigation.title).toEqual('Test Investigation');
        const investigationId = createRes.body.data.createInvestigation.id;
        // Delete Investigation
        const deleteRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation DeleteInvestigation($id: ID!) {
            deleteInvestigation(id: $id)
          }
        `,
            variables: { id: investigationId },
        });
        expect(deleteRes.statusCode).toEqual(200);
        expect(deleteRes.body.data.deleteInvestigation).toEqual(true);
    });
    it('should create and delete a relationship', async () => {
        // Create two entities first
        const createEntity1Res = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation CreateEntity($input: EntityInput!) {
            createEntity(input: $input) {
              id
            }
          }
        `,
            variables: {
                input: {
                    type: 'PERSON',
                    label: 'Entity 1',
                    investigationId: 'test-investigation-rel-1',
                },
            },
        });
        const entity1Id = createEntity1Res.body.data.createEntity.id;
        const createEntity2Res = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation CreateEntity($input: EntityInput!) {
            createEntity(input: $input) {
              id
            }
          }
        `,
            variables: {
                input: {
                    type: 'PERSON',
                    label: 'Entity 2',
                    investigationId: 'test-investigation-rel-1',
                },
            },
        });
        const entity2Id = createEntity2Res.body.data.createEntity.id;
        // Create Relationship
        const createRelRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation CreateRelationship($input: RelationshipInput!) {
            createRelationship(input: $input) {
              id
              type
              fromEntityId
              toEntityId
            }
          }
        `,
            variables: {
                input: {
                    type: 'CONNECTED_TO',
                    fromEntityId: entity1Id,
                    toEntityId: entity2Id,
                    investigationId: 'test-investigation-rel-1',
                },
            },
        });
        expect(createRelRes.statusCode).toEqual(200);
        expect(createRelRes.body.data.createRelationship.id).toBeDefined();
        expect(createRelRes.body.data.createRelationship.type).toEqual('CONNECTED_TO');
        const relationshipId = createRelRes.body.data.createRelationship.id;
        // Delete Relationship
        const deleteRelRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation DeleteRelationship($id: ID!) {
            deleteRelationship(id: $id)
          }
        `,
            variables: { id: relationshipId },
        });
        expect(deleteRelRes.statusCode).toEqual(200);
        expect(deleteRelRes.body.data.deleteRelationship).toEqual(true);
    });
    it('should fetch related entities', async () => {
        // Create a test entity
        const createEntityRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation CreateEntity($input: EntityInput!) {
            createEntity(input: $input) {
              id
              label
              type
              investigationId
            }
          }
        `,
            variables: {
                input: {
                    type: 'PERSON',
                    label: 'Related Entity Test',
                    investigationId: 'test-investigation-related',
                },
            },
        });
        const entityId = createEntityRes.body.data.createEntity.id;
        // Create another entity
        const createRelatedEntityRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation CreateEntity($input: EntityInput!) {
            createEntity(input: $input) {
              id
            }
          }
        `,
            variables: {
                input: {
                    type: 'ORGANIZATION',
                    label: 'Related Org',
                    investigationId: 'test-investigation-related',
                },
            },
        });
        const relatedEntityId = createRelatedEntityRes.body.data.createEntity.id;
        // Create a relationship between them
        await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation CreateRelationship($input: RelationshipInput!) {
            createRelationship(input: $input) {
              id
            }
          }
        `,
            variables: {
                input: {
                    type: 'WORKS_FOR',
                    fromEntityId: entityId,
                    toEntityId: relatedEntityId,
                    investigationId: 'test-investigation-related',
                },
            },
        });
        // Fetch related entities
        const fetchRelatedRes = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          query RelatedEntities($entityId: ID!) {
            relatedEntities(entityId: $entityId) {
              entity {
                id
                label
              }
              strength
              relationshipType
            }
          }
        `,
            variables: { entityId: entityId },
        });
        expect(fetchRelatedRes.statusCode).toEqual(200);
        expect(fetchRelatedRes.body.data.relatedEntities).toBeDefined();
        expect(fetchRelatedRes.body.data.relatedEntities.length).toBeGreaterThan(0);
        expect(fetchRelatedRes.body.data.relatedEntities[0].entity.id).toEqual(relatedEntityId);
        expect(fetchRelatedRes.body.data.relatedEntities[0].strength).toBeGreaterThan(0);
        expect(fetchRelatedRes.body.data.relatedEntities[0].relationshipType).toEqual('WORKS_FOR');
    });
    it('should generate entities and relationships from text', async () => {
        const res = await (0, supertest_1.default)(server)
            .post('/graphql')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            query: `
          mutation Generate($investigationId: ID!, $text: String!) {
            generateEntitiesFromText(investigationId: $investigationId, text: $text) {
              entities { id label }
              relationships { id type from to }
            }
          }
        `,
            variables: {
                investigationId: 'test-gen-1',
                text: 'Alice works with Bob',
            },
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.generateEntitiesFromText.entities.length).toBeGreaterThan(0);
        expect(res.body.data.generateEntitiesFromText.relationships.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=graphql.test.js.map