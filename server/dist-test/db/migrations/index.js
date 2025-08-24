/**
 * Neo4j Database Migration System
 * Handles schema migrations, constraints, indexes, and data transformations
 */
const fs = require('fs').promises;
const path = require('path');
const { getNeo4jDriver, getPostgresPool } = require('../../config/database');
const logger = require('../../utils/logger');
class MigrationManager {
    constructor() {
        this.migrationsPath = path.join(__dirname, 'neo4j');
        this.appliedMigrations = new Set();
    }
    /**
     * Initialize migration system
     * Creates migration tracking in Postgres
     */
    async initialize() {
        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            // Create migrations table in Postgres for tracking
            await client.query(`
        CREATE TABLE IF NOT EXISTS neo4j_migrations (
          version VARCHAR(20) PRIMARY KEY,
          description TEXT NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          checksum VARCHAR(64),
          execution_time_ms INTEGER
        )
      `);
            logger.info('Migration system initialized');
        }
        finally {
            client.release();
        }
    }
    /**
     * Get list of applied migrations
     */
    async getAppliedMigrations() {
        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT version FROM neo4j_migrations ORDER BY version');
            this.appliedMigrations = new Set(result.rows.map(r => r.version));
            return this.appliedMigrations;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get available migration files
     */
    async getAvailableMigrations() {
        try {
            const files = await fs.readdir(this.migrationsPath);
            return files
                .filter(f => f.endsWith('.js'))
                .map(f => f.replace('.js', ''))
                .sort();
        }
        catch (error) {
            logger.warn('No migration directory found, creating...');
            await fs.mkdir(this.migrationsPath, { recursive: true });
            return [];
        }
    }
    /**
     * Run pending migrations
     */
    async migrate() {
        await this.initialize();
        await this.getAppliedMigrations();
        const availableMigrations = await this.getAvailableMigrations();
        const pendingMigrations = availableMigrations.filter(version => !this.appliedMigrations.has(version));
        if (pendingMigrations.length === 0) {
            logger.info('No pending migrations');
            return;
        }
        logger.info(`Found ${pendingMigrations.length} pending migrations`);
        for (const version of pendingMigrations) {
            await this.runMigration(version);
        }
        logger.info('All migrations completed successfully');
    }
    /**
     * Run a specific migration
     */
    async runMigration(version) {
        const startTime = Date.now();
        const migrationPath = path.join(this.migrationsPath, `${version}.js`);
        try {
            logger.info(`Running migration ${version}...`);
            // Load migration module
            delete require.cache[require.resolve(migrationPath)];
            const migration = require(migrationPath);
            // Validate migration structure
            if (!migration.description || !migration.up) {
                throw new Error(`Invalid migration ${version}: missing description or up function`);
            }
            // Run the migration
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                await migration.up(session);
                await session.close();
            }
            catch (migrationError) {
                await session.close();
                throw migrationError;
            }
            // Record successful migration
            const executionTime = Date.now() - startTime;
            const pool = getPostgresPool();
            const client = await pool.connect();
            try {
                await client.query(`INSERT INTO neo4j_migrations (version, description, execution_time_ms) 
           VALUES ($1, $2, $3)`, [version, migration.description, executionTime]);
            }
            finally {
                client.release();
            }
            logger.info(`✅ Migration ${version} completed in ${executionTime}ms`);
        }
        catch (error) {
            logger.error(`❌ Migration ${version} failed:`, error.message);
            throw error;
        }
    }
    /**
     * Create a new migration file
     */
    async createMigration(name) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
        const version = `${timestamp}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const filename = `${version}.js`;
        const filepath = path.join(this.migrationsPath, filename);
        const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  description: '${name}',
  
  /**
   * Apply migration
   * @param {Session} session Neo4j session
   */
  async up(session) {
    // Add your Cypher queries here
    // Example:
    // await session.run('CREATE INDEX example_index IF NOT EXISTS FOR (n:Example) ON (n.property)');
  },
  
  /**
   * Rollback migration (optional)
   * @param {Session} session Neo4j session
   */
  async down(session) {
    // Add rollback logic here (optional)
    // Example:
    // await session.run('DROP INDEX example_index IF EXISTS');
  }
};
`;
        await fs.mkdir(this.migrationsPath, { recursive: true });
        await fs.writeFile(filepath, template);
        logger.info(`Created migration: ${filename}`);
        return version;
    }
    /**
     * Get migration status
     */
    async status() {
        await this.getAppliedMigrations();
        const availableMigrations = await this.getAvailableMigrations();
        const status = availableMigrations.map(version => ({
            version,
            applied: this.appliedMigrations.has(version),
            status: this.appliedMigrations.has(version) ? '✅ Applied' : '⏳ Pending'
        }));
        return status;
    }
}
// Export singleton instance
const migrationManager = new MigrationManager();
module.exports = {
    MigrationManager,
    migrationManager
};
//# sourceMappingURL=index.js.map