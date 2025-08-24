/**
 * Migration: Add canonicalId to Entity
 * Created: 2025-08-16T01:46:19Z
 */
module.exports = {
    description: 'Add canonicalId to Entity nodes',
    /**
     * Apply migration
     * @param {Session} session Neo4j session
     */
    async up(session) {
        // Add canonicalId property to existing Entity nodes
        // For simplicity, setting canonicalId to be the same as id initially.
        // This can be updated later by the entity resolution process.
        await session.run(`
      MATCH (e:Entity)
      WHERE NOT EXISTS(e.canonicalId)
      SET e.canonicalId = e.id
    `);
        console.log('✅ Added canonicalId to existing Entity nodes.');
    },
    /**
     * Rollback migration (optional)
     * @param {Session} session Neo4j session
     */
    async down(session) {
        // Remove canonicalId property from Entity nodes
        await session.run(`
      MATCH (e:Entity)
      REMOVE e.canonicalId
    `);
        console.log('✅ Removed canonicalId from Entity nodes.');
    }
};
//# sourceMappingURL=20250816_014619_add_canonical_id_to_entity.js.map