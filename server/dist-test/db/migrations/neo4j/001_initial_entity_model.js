/**
 * Migration: Initial Entity Model Setup
 * Created: 2025-01-14T20:00:00Z
 * Description: Sets up comprehensive entity modeling with constraints, indexes, and relationships
 */
module.exports = {
    description: 'Initial Entity Model Setup - Constraints, Indexes, and Relationships',
    /**
     * Apply migration
     * @param {Session} session Neo4j session
     */
    async up(session) {
        console.log('🔄 Setting up Neo4j entity model...');
        // === NODE CONSTRAINTS ===
        // Unique constraints for primary keys
        const nodeConstraints = [
            'CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
            'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
            'CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE',
            // Email constraints
            'CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
            'CREATE CONSTRAINT user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE',
            // Required field constraints
            'CREATE CONSTRAINT entity_type_exists IF NOT EXISTS FOR (e:Entity) REQUIRE e.type IS NOT NULL',
            'CREATE CONSTRAINT entity_label_exists IF NOT EXISTS FOR (e:Entity) REQUIRE e.label IS NOT NULL',
            'CREATE CONSTRAINT investigation_title_exists IF NOT EXISTS FOR (i:Investigation) REQUIRE i.title IS NOT NULL',
            'CREATE CONSTRAINT user_email_exists IF NOT EXISTS FOR (u:User) REQUIRE u.email IS NOT NULL',
        ];
        for (const constraint of nodeConstraints) {
            try {
                await session.run(constraint);
                console.log(`✅ Created constraint: ${constraint.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create constraint: ${error.message}`);
                }
            }
        }
        // === RELATIONSHIP CONSTRAINTS ===
        const relationshipConstraints = [
            'CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE',
            'CREATE CONSTRAINT created_by_id_unique IF NOT EXISTS FOR ()-[r:CREATED_BY]-() REQUIRE r.id IS UNIQUE',
            'CREATE CONSTRAINT belongs_to_id_unique IF NOT EXISTS FOR ()-[r:BELONGS_TO]-() REQUIRE r.id IS UNIQUE',
            'CREATE CONSTRAINT assigned_to_id_unique IF NOT EXISTS FOR ()-[r:ASSIGNED_TO]-() REQUIRE r.id IS UNIQUE',
        ];
        for (const constraint of relationshipConstraints) {
            try {
                await session.run(constraint);
                console.log(`✅ Created relationship constraint: ${constraint.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create relationship constraint: ${error.message}`);
                }
            }
        }
        // === PERFORMANCE INDEXES ===
        const performanceIndexes = [
            // Entity indexes
            'CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.type)',
            'CREATE INDEX entity_investigation_idx IF NOT EXISTS FOR (e:Entity) ON (e.investigationId)',
            'CREATE INDEX entity_created_by_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdBy)',
            'CREATE INDEX entity_created_at_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
            'CREATE INDEX entity_updated_at_idx IF NOT EXISTS FOR (e:Entity) ON (e.updatedAt)',
            'CREATE INDEX entity_confidence_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence)',
            // Investigation indexes
            'CREATE INDEX investigation_status_idx IF NOT EXISTS FOR (i:Investigation) ON (i.status)',
            'CREATE INDEX investigation_priority_idx IF NOT EXISTS FOR (i:Investigation) ON (i.priority)',
            'CREATE INDEX investigation_created_by_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdBy)',
            'CREATE INDEX investigation_created_at_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdAt)',
            'CREATE INDEX investigation_updated_at_idx IF NOT EXISTS FOR (i:Investigation) ON (i.updatedAt)',
            // User indexes  
            'CREATE INDEX user_role_idx IF NOT EXISTS FOR (u:User) ON (u.role)',
            'CREATE INDEX user_active_idx IF NOT EXISTS FOR (u:User) ON (u.isActive)',
            'CREATE INDEX user_last_login_idx IF NOT EXISTS FOR (u:User) ON (u.lastLogin)',
            // Relationship indexes
            'CREATE INDEX relationship_type_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type)',
            'CREATE INDEX relationship_investigation_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.investigationId)',
            'CREATE INDEX relationship_created_at_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.createdAt)',
            'CREATE INDEX relationship_confidence_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.confidence)',
        ];
        for (const index of performanceIndexes) {
            try {
                await session.run(index);
                console.log(`✅ Created index: ${index.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create index: ${error.message}`);
                }
            }
        }
        // === FULL-TEXT SEARCH INDEXES ===
        const fulltextIndexes = [
            'CREATE FULLTEXT INDEX entity_search_idx IF NOT EXISTS FOR (e:Entity) ON EACH [e.label, e.description]',
            'CREATE FULLTEXT INDEX investigation_search_idx IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description]',
            'CREATE FULLTEXT INDEX user_search_idx IF NOT EXISTS FOR (u:User) ON EACH [u.firstName, u.lastName, u.username, u.email]',
        ];
        for (const index of fulltextIndexes) {
            try {
                await session.run(index);
                console.log(`✅ Created fulltext index: ${index.split(' ')[3]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create fulltext index: ${error.message}`);
                }
            }
        }
        // === COMPOSITE INDEXES FOR COMPLEX QUERIES ===
        const compositeIndexes = [
            'CREATE INDEX entity_type_investigation_idx IF NOT EXISTS FOR (e:Entity) ON (e.type, e.investigationId)',
            'CREATE INDEX entity_confidence_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence, e.type)',
            'CREATE INDEX investigation_status_priority_idx IF NOT EXISTS FOR (i:Investigation) ON (i.status, i.priority)',
            'CREATE INDEX relationship_type_confidence_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type, r.confidence)',
        ];
        for (const index of compositeIndexes) {
            try {
                await session.run(index);
                console.log(`✅ Created composite index: ${index.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create composite index: ${error.message}`);
                }
            }
        }
        // === RANGE INDEXES FOR NUMERIC AND DATE QUERIES ===
        const rangeIndexes = [
            'CREATE RANGE INDEX entity_confidence_range_idx IF NOT EXISTS FOR (e:Entity) ON (e.confidence)',
            'CREATE RANGE INDEX entity_created_range_idx IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
            'CREATE RANGE INDEX relationship_confidence_range_idx IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.confidence)',
            'CREATE RANGE INDEX investigation_created_range_idx IF NOT EXISTS FOR (i:Investigation) ON (i.createdAt)',
        ];
        for (const index of rangeIndexes) {
            try {
                await session.run(index);
                console.log(`✅ Created range index: ${index.split(' ')[3]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('An equivalent')) {
                    console.warn(`⚠️  Failed to create range index: ${error.message}`);
                }
            }
        }
        console.log('✅ Neo4j entity model setup completed successfully');
    },
    /**
     * Rollback migration (optional)
     * @param {Session} session Neo4j session
     */
    async down(session) {
        console.log('🔄 Rolling back entity model setup...');
        // Drop indexes first (constraints depend on them)
        const indexesToDrop = [
            'DROP INDEX entity_search_idx IF EXISTS',
            'DROP INDEX investigation_search_idx IF EXISTS',
            'DROP INDEX user_search_idx IF EXISTS',
            'DROP INDEX entity_type_idx IF EXISTS',
            'DROP INDEX entity_investigation_idx IF EXISTS',
            'DROP INDEX entity_created_by_idx IF EXISTS',
            'DROP INDEX entity_created_at_idx IF EXISTS',
            'DROP INDEX investigation_status_idx IF EXISTS',
            'DROP INDEX investigation_priority_idx IF EXISTS',
            'DROP INDEX user_role_idx IF EXISTS',
            'DROP INDEX relationship_type_idx IF EXISTS',
            'DROP INDEX entity_type_investigation_idx IF EXISTS',
            'DROP INDEX entity_confidence_range_idx IF EXISTS'
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
        // Drop constraints
        const constraintsToDrop = [
            'DROP CONSTRAINT entity_id_unique IF EXISTS',
            'DROP CONSTRAINT user_id_unique IF EXISTS',
            'DROP CONSTRAINT investigation_id_unique IF EXISTS',
            'DROP CONSTRAINT user_email_unique IF EXISTS',
            'DROP CONSTRAINT relationship_id_unique IF EXISTS'
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
        console.log('✅ Entity model rollback completed');
    }
};
//# sourceMappingURL=001_initial_entity_model.js.map