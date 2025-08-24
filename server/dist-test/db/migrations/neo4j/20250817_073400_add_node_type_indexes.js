/**
 * Migration: Add node type indexes for Person, Location, and Event
 * Created: 2025-08-17T07:34:00Z
 */
module.exports = {
    description: "Add id indexes for Person, Location, and Event nodes",
    /**
     * Apply migration
     * @param {Session} session Neo4j session
     */
    async up(session) {
        // Create indexes for fast node lookup by id
        await session.run("CREATE INDEX person_id IF NOT EXISTS FOR (p:Person) ON (p.id)");
        await session.run("CREATE INDEX location_id IF NOT EXISTS FOR (l:Location) ON (l.id)");
        await session.run("CREATE INDEX event_id IF NOT EXISTS FOR (e:Event) ON (e.id)");
    },
    /**
     * Rollback migration (optional)
     * @param {Session} session Neo4j session
     */
    async down(session) {
        await session.run("DROP INDEX person_id IF EXISTS");
        await session.run("DROP INDEX location_id IF EXISTS");
        await session.run("DROP INDEX event_id IF EXISTS");
    },
};
//# sourceMappingURL=20250817_073400_add_node_type_indexes.js.map