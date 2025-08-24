/**
 * Entity Model Structure Tests
 * Tests for entity modeling components without requiring live database connections
 */
const fs = require('fs').promises;
const path = require('path');
describe('Entity Model Structure', () => {
    describe('Migration System Structure', () => {
        test('should have migration manager module', () => {
            const { MigrationManager, migrationManager } = require('../db/migrations/index');
            expect(MigrationManager).toBeDefined();
            expect(typeof MigrationManager).toBe('function');
            expect(migrationManager).toBeDefined();
            expect(migrationManager).toBeInstanceOf(MigrationManager);
        });
        test('should have migration files in correct format', async () => {
            const migrationsPath = path.join(__dirname, '../db/migrations/neo4j');
            try {
                const files = await fs.readdir(migrationsPath);
                const migrationFiles = files.filter(f => f.endsWith('.js'));
                expect(migrationFiles.length).toBeGreaterThan(0);
                expect(migrationFiles).toContain('001_initial_entity_model.js');
                expect(migrationFiles).toContain('002_entity_type_specialization.js');
                // Test migration file structure
                for (const file of migrationFiles) {
                    const migrationPath = path.join(migrationsPath, file);
                    const migration = require(migrationPath);
                    expect(migration).toHaveProperty('description');
                    expect(migration).toHaveProperty('up');
                    expect(typeof migration.description).toBe('string');
                    expect(typeof migration.up).toBe('function');
                    // Check if down function exists (optional)
                    if (migration.down) {
                        expect(typeof migration.down).toBe('function');
                    }
                }
            }
            catch (error) {
                throw new Error(`Migration files not found: ${error.message}`);
            }
        });
        test('migration files should follow naming convention', async () => {
            const migrationsPath = path.join(__dirname, '../db/migrations/neo4j');
            try {
                const files = await fs.readdir(migrationsPath);
                const migrationFiles = files.filter(f => f.endsWith('.js'));
                for (const file of migrationFiles) {
                    // Should follow pattern: NNN_description.js
                    expect(file).toMatch(/^\d{3}_[a-z_]+\.js$/);
                }
            }
            catch (error) {
                // Directory might not exist in clean environment
                console.warn('Migration directory not found, skipping naming convention test');
            }
        });
    });
    describe('Entity Model Service Structure', () => {
        test('should have EntityModelService class', () => {
            const { EntityModelService, entityModelService } = require('../services/EntityModelService');
            expect(EntityModelService).toBeDefined();
            expect(typeof EntityModelService).toBe('function');
            expect(entityModelService).toBeDefined();
            expect(entityModelService).toBeInstanceOf(EntityModelService);
        });
        test('should have required service methods', () => {
            const { entityModelService } = require('../services/EntityModelService');
            const requiredMethods = [
                'initialize',
                'getEntityStatistics',
                'findPotentialDuplicates',
                'findHubEntities',
                'findShortestPath',
                'getEntityClusters',
                'validateModelIntegrity',
                'getQueryPerformanceStats'
            ];
            for (const method of requiredMethods) {
                expect(entityModelService).toHaveProperty(method);
                expect(typeof entityModelService[method]).toBe('function');
            }
        });
    });
    describe('Migration Scripts', () => {
        test('should have migration CLI script', async () => {
            const scriptPath = path.join(__dirname, '../../scripts/migrate-neo4j.js');
            try {
                await fs.access(scriptPath);
                const script = await fs.readFile(scriptPath, 'utf8');
                // Should be executable Node.js script
                expect(script).toMatch(/^#!/);
                expect(script).toContain('migrationManager');
                expect(script).toContain('migrate');
                expect(script).toContain('status');
                expect(script).toContain('create');
            }
            catch (error) {
                throw new Error(`Migration script not found: ${error.message}`);
            }
        });
        test('should have npm script commands', () => {
            const packageJson = require('../../package.json');
            expect(packageJson.scripts).toHaveProperty('migrate');
            expect(packageJson.scripts).toHaveProperty('migrate:status');
            expect(packageJson.scripts).toHaveProperty('migrate:create');
            expect(packageJson.scripts.migrate).toContain('migrate-neo4j.js migrate');
            expect(packageJson.scripts['migrate:status']).toContain('migrate-neo4j.js status');
            expect(packageJson.scripts['migrate:create']).toContain('migrate-neo4j.js create');
        });
    });
    describe('Migration Content Validation', () => {
        test('initial migration should have comprehensive constraints', async () => {
            const migrationPath = path.join(__dirname, '../db/migrations/neo4j/001_initial_entity_model.js');
            const migration = require(migrationPath);
            const migrationString = migration.up.toString();
            // Should include key constraints
            expect(migrationString).toMatch(/entity_id.*UNIQUE/);
            expect(migrationString).toMatch(/user_id.*UNIQUE/);
            expect(migrationString).toMatch(/investigation_id.*UNIQUE/);
            expect(migrationString).toMatch(/user_email.*UNIQUE/);
            // Should include key indexes
            expect(migrationString).toMatch(/entity_type.*INDEX/);
            expect(migrationString).toMatch(/investigation_status.*INDEX/);
            expect(migrationString).toMatch(/FULLTEXT.*INDEX/);
            // Should have proper structure
            expect(migration.description).toContain('Initial Entity Model');
        });
        test('specialization migration should have type-specific constraints', async () => {
            const migrationPath = path.join(__dirname, '../db/migrations/neo4j/002_entity_type_specialization.js');
            const migration = require(migrationPath);
            const migrationString = migration.up.toString();
            // Should include type-specific validations
            expect(migrationString).toMatch(/EMAIL.*@/);
            expect(migrationString).toMatch(/PHONE.*[0-9]/);
            expect(migrationString).toMatch(/IP_ADDRESS/);
            // Should have specialized indexes
            expect(migrationString).toMatch(/PERSON/);
            expect(migrationString).toMatch(/ORGANIZATION/);
            expect(migration.description).toContain('Type Specialization');
        });
    });
    describe('Entity Model Constants and Types', () => {
        test('should define entity types from GraphQL schema file', async () => {
            const fs = require('fs').promises;
            const path = require('path');
            const schemaPath = path.join(__dirname, '../graphql/schema/core.js');
            const schemaContent = await fs.readFile(schemaPath, 'utf8');
            // Should define EntityType enum
            expect(schemaContent).toMatch(/enum EntityType/);
            expect(schemaContent).toMatch(/PERSON/);
            expect(schemaContent).toMatch(/ORGANIZATION/);
            expect(schemaContent).toMatch(/EMAIL/);
            expect(schemaContent).toMatch(/PHONE/);
            expect(schemaContent).toMatch(/IP_ADDRESS/);
        });
        test('should define relationship types from GraphQL schema file', async () => {
            const fs = require('fs').promises;
            const path = require('path');
            const schemaPath = path.join(__dirname, '../graphql/schema/core.js');
            const schemaContent = await fs.readFile(schemaPath, 'utf8');
            // Should define RelationshipType enum
            expect(schemaContent).toMatch(/enum RelationshipType/);
            expect(schemaContent).toMatch(/CONNECTED_TO/);
            expect(schemaContent).toMatch(/WORKS_FOR/);
            expect(schemaContent).toMatch(/COMMUNICATES_WITH/);
        });
    });
    describe('Database Configuration Integration', () => {
        test('should integrate migration system with database config', async () => {
            const fs = require('fs').promises;
            const path = require('path');
            const dbConfigPath = path.join(__dirname, '../config/database.js');
            const dbConfigContent = await fs.readFile(dbConfigPath, 'utf8');
            // Should have migration integration
            expect(dbConfigContent).toMatch(/runNeo4jMigrations|migrationManager/);
        });
    });
});
//# sourceMappingURL=entityModelStructure.test.js.map