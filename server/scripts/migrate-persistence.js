#!/usr/bin/env node

/**
 * Migration Script for Production Persistence
 * Applies PostgreSQL schema and Neo4j constraints
 */

const { Pool } = require('pg');
const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

// Environment configuration
const POSTGRES_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || 
  'postgresql://intelgraph:devpassword@localhost:5432/intelgraph_dev';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';

async function runPostgresMigrations() {
  console.log('🔄 Running PostgreSQL migrations...');
  
  const pool = new Pool({ connectionString: POSTGRES_URL });
  const client = await pool.connect();
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_core_persistence.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Check if migration already applied
    const { rows } = await client.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      ['001_core_persistence']
    );
    
    if (rows.length > 0) {
      console.log('✅ PostgreSQL migration 001_core_persistence already applied');
      return;
    }
    
    // Apply migration
    await client.query('BEGIN');
    await client.query(migration);
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1)',
      ['001_core_persistence']
    );
    await client.query('COMMIT');
    
    console.log('✅ PostgreSQL migration 001_core_persistence applied successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ PostgreSQL migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function runNeo4jConstraints() {
  console.log('🔄 Running Neo4j constraints...');
  
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );
  
  const session = driver.session();
  
  try {
    // Read constraints file
    const constraintsPath = path.join(__dirname, '..', 'migrations', 'neo4j_constraints.cypher');
    const constraints = fs.readFileSync(constraintsPath, 'utf8');
    
    // Split by lines and filter out comments/empty lines
    const statements = constraints
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt);
    
    // Execute each constraint/index
    for (const statement of statements) {
      try {
        await session.run(statement);
        console.log(`✅ Neo4j: ${statement.split('\n')[0]}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Neo4j: ${statement.split('\n')[0]} (already exists)`);
        } else {
          console.error(`❌ Neo4j statement failed: ${statement}`);
          console.error('Error:', error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Neo4j constraints and indexes applied successfully');
    
  } finally {
    await session.close();
    await driver.close();
  }
}

async function testConnections() {
  console.log('🧪 Testing database connections...');
  
  // Test PostgreSQL
  try {
    const pool = new Pool({ connectionString: POSTGRES_URL });
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('✅ PostgreSQL connection:', {
      time: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    });
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    throw error;
  }
  
  // Test Neo4j
  try {
    const driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );
    
    await driver.verifyConnectivity();
    
    const session = driver.session();
    const result = await session.run('CALL dbms.components() YIELD name, versions, edition');
    console.log('✅ Neo4j connection:', {
      name: result.records[0].get('name'),
      version: result.records[0].get('versions')[0],
      edition: result.records[0].get('edition')
    });
    
    await session.close();
    await driver.close();
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting IntelGraph persistence migration...\n');
  
  try {
    await testConnections();
    console.log('');
    
    await runPostgresMigrations();
    console.log('');
    
    await runNeo4jConstraints();
    console.log('');
    
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the outbox worker: npm run worker:outbox');
    console.log('2. Test GraphQL operations: curl http://localhost:4000/graphql');
    console.log('3. Monitor metrics: curl http://localhost:4000/metrics');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runPostgresMigrations, runNeo4jConstraints, testConnections };