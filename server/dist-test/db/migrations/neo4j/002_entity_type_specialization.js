/**
 * Migration: Entity Type Specialization
 * Created: 2025-01-14T20:15:00Z
 * Description: Adds specialized indexes and constraints for specific entity types
 */
module.exports = {
    description: 'Entity Type Specialization - Type-specific indexes and constraints',
    /**
     * Apply migration
     * @param {Session} session Neo4j session
     */
    async up(session) {
        console.log('🔄 Setting up entity type specialization...');
        // === ENTITY TYPE SPECIFIC CONSTRAINTS ===
        // These ensure data integrity for specific entity types
        const typeSpecificConstraints = [
            // Email entities must have valid email in label
            `CREATE CONSTRAINT email_entity_format IF NOT EXISTS FOR (e:Entity) 
       REQUIRE (e.type <> 'EMAIL' OR e.label =~ '.*@.*\\..*')`,
            // Phone entities should have numeric characters
            `CREATE CONSTRAINT phone_entity_format IF NOT EXISTS FOR (e:Entity)
       REQUIRE (e.type <> 'PHONE' OR e.label =~ '.*[0-9].*')`,
            // IP_ADDRESS entities should follow basic IP format
            `CREATE CONSTRAINT ip_entity_format IF NOT EXISTS FOR (e:Entity)
       REQUIRE (e.type <> 'IP_ADDRESS' OR e.label =~ '[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+')`,
        ];
        for (const constraint of typeSpecificConstraints) {
            try {
                await session.run(constraint);
                console.log(`✅ Created type constraint: ${constraint.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create type constraint: ${error.message}`);
                }
            }
        }
        // === SPECIALIZED INDEXES FOR HIGH-VOLUME ENTITY TYPES ===
        const specializedIndexes = [
            // Person-specific indexes
            'CREATE INDEX person_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.type) WHERE e.type = "PERSON"',
            // Organization-specific indexes  
            'CREATE INDEX org_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.type) WHERE e.type = "ORGANIZATION"',
            // Communication entities (EMAIL, PHONE)
            'CREATE INDEX comm_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.type) WHERE e.type IN ["EMAIL", "PHONE"]',
            // Location entities
            'CREATE INDEX location_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.type) WHERE e.type = "LOCATION"',
            // Digital entities (IP_ADDRESS, DOMAIN, URL)
            'CREATE INDEX digital_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.type) WHERE e.type IN ["IP_ADDRESS", "DOMAIN", "URL"]',
            // Financial entities
            'CREATE INDEX financial_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.type) WHERE e.type IN ["ACCOUNT", "TRANSACTION"]',
        ];
        for (const index of specializedIndexes) {
            try {
                await session.run(index);
                console.log(`✅ Created specialized index: ${index.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create specialized index: ${error.message}`);
                }
            }
        }
        // === RELATIONSHIP TYPE SPECIFIC INDEXES ===
        const relationshipTypeIndexes = [
            // Communication relationships
            'CREATE INDEX comm_relationship_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type) WHERE r.type = "COMMUNICATES_WITH"',
            // Ownership relationships
            'CREATE INDEX ownership_relationship_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type) WHERE r.type = "OWNS"',
            // Work relationships
            'CREATE INDEX work_relationship_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type) WHERE r.type IN ["WORKS_FOR", "REPORTS_TO", "MANAGES"]',
            // Location relationships
            'CREATE INDEX location_relationship_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type) WHERE r.type = "LOCATED_AT"',
            // Financial relationships
            'CREATE INDEX financial_relationship_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type) WHERE r.type = "TRANSACTED_WITH"',
        ];
        for (const index of relationshipTypeIndexes) {
            try {
                await session.run(index);
                console.log(`✅ Created relationship type index: ${index.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create relationship type index: ${error.message}`);
                }
            }
        }
        // === PROPERTY-SPECIFIC INDEXES FOR COMMON QUERIES ===
        const propertyIndexes = [
            // Source-based indexes for data provenance
            'CREATE INDEX entity_source_idx IF NOT EXISTS FOR (e:Entity) ON (e.source)',
            'CREATE INDEX relationship_source_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.source)',
            // Confidence-based queries
            'CREATE INDEX high_confidence_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence) WHERE e.confidence >= 0.8',
            'CREATE INDEX high_confidence_rel_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.confidence) WHERE r.confidence >= 0.8',
            // Time-based relationship queries
            'CREATE INDEX active_relationship_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.until) WHERE r.until IS NULL OR r.until > datetime()',
        ];
        for (const index of propertyIndexes) {
            try {
                await session.run(index);
                console.log(`✅ Created property index: ${index.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create property index: ${error.message}`);
                }
            }
        }
        // === GRAPH TOPOLOGY INDEXES FOR ANALYTICS ===
        const topologyIndexes = [
            // High-degree nodes (entities with many connections)
            'CREATE INDEX high_degree_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.id) WHERE size((e)-[:RELATIONSHIP]-()) > 5',
            // Isolated entities (entities with no relationships)
            'CREATE INDEX isolated_entity_idx IF NOT EXISTS FOR (e:Entity) ON (e.id) WHERE size((e)-[:RELATIONSHIP]-()) = 0',
        ];
        for (const index of topologyIndexes) {
            try {
                await session.run(index);
                console.log(`✅ Created topology index: ${index.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create topology index: ${error.message}`);
                }
            }
        }
        console.log('✅ Entity type specialization setup completed successfully');
    },
    /**
     * Rollback migration
     * @param {Session} session Neo4j session
     */
    async down(session) {
        console.log('🔄 Rolling back entity type specialization...');
        const indexesToDrop = [
            'DROP INDEX person_entity_idx IF EXISTS',
            'DROP INDEX org_entity_idx IF EXISTS',
            'DROP INDEX comm_entity_idx IF EXISTS',
            'DROP INDEX location_entity_idx IF EXISTS',
            'DROP INDEX digital_entity_idx IF EXISTS',
            'DROP INDEX financial_entity_idx IF EXISTS',
            'DROP INDEX comm_relationship_idx IF EXISTS',
            'DROP INDEX ownership_relationship_idx IF EXISTS',
            'DROP INDEX work_relationship_idx IF EXISTS',
            'DROP INDEX entity_source_idx IF EXISTS',
            'DROP INDEX high_confidence_entity_idx IF EXISTS',
            'DROP INDEX high_degree_entity_idx IF EXISTS'
        ];
        for (const dropIndex of indexesToDrop) {
            try {
                await session.run(dropIndex);
                console.log(`✅ Dropped index: ${dropIndex.split(' ')[2]}`);
            }
            catch (error) {
                console.warn(`⚠️  Failed to drop index: ${error.message}`);
            }
        }
        const constraintsToDrop = [
            'DROP CONSTRAINT email_entity_format IF EXISTS',
            'DROP CONSTRAINT phone_entity_format IF EXISTS',
            'DROP CONSTRAINT ip_entity_format IF EXISTS'
        ];
        for (const dropConstraint of constraintsToDrop) {
            try {
                await session.run(dropConstraint);
                console.log(`✅ Dropped constraint: ${dropConstraint.split(' ')[2]}`);
            }
            catch (error) {
                console.warn(`⚠️  Failed to drop constraint: ${error.message}`);
            }
        }
        console.log('✅ Entity type specialization rollback completed');
    }
};
//# sourceMappingURL=002_entity_type_specialization.js.map