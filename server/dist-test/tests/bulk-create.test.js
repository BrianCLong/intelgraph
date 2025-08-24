const { crudResolvers: resolvers } = require('../src/graphql/resolvers/crudResolvers');
jest.mock('../src/config/database', () => {
    const tx = {
        run: jest.fn().mockResolvedValue({ records: [{ get: () => ({ properties: { id: 'id1', investigationId: 'inv1', fromEntity: { id: 'a' }, toEntity: { id: 'b' } } }) }] }),
        commit: jest.fn(),
        rollback: jest.fn(),
    };
    const session = { beginTransaction: () => tx, close: jest.fn() };
    const pgClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    return {
        getNeo4jDriver: () => ({ session: () => session }),
        getPostgresPool: () => ({ connect: () => pgClient }),
        getRedisClient: () => ({ smembers: jest.fn().mockResolvedValue([]), del: jest.fn(), get: jest.fn(), set: jest.fn(), sadd: jest.fn() }),
    };
});
describe('Bulk mutations', () => {
    const user = { id: 'u1', tenantId: 't1' };
    test('createEntities returns array', async () => {
        const inputs = [{ type: 'PERSON', label: 'E1', investigationId: 'inv1' }];
        const res = await resolvers.Mutation.createEntities(null, { inputs }, { user });
        expect(Array.isArray(res)).toBe(true);
        expect(res).toHaveLength(1);
    });
    test('createRelationships returns array', async () => {
        const inputs = [{ type: 'CONNECTED_TO', fromEntityId: 'a', toEntityId: 'b', investigationId: 'inv1' }];
        const res = await resolvers.Mutation.createRelationships(null, { inputs }, { user });
        expect(Array.isArray(res)).toBe(true);
        expect(res).toHaveLength(1);
    });
});
//# sourceMappingURL=bulk-create.test.js.map