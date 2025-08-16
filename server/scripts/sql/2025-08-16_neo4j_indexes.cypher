// Neo4j Performance Indexing Script
// Creates indexes and constraints for improved query performance

// ===== ENTITY INDEXES =====

// Primary entity lookup by ID
CREATE CONSTRAINT entity_id_unique IF NOT EXISTS
FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// Tenant isolation - critical for multi-tenant queries
CREATE INDEX entity_tenant_idx IF NOT EXISTS
FOR (e:Entity) ON (e.tenantId);

// Entity type lookups
CREATE INDEX entity_type_idx IF NOT EXISTS  
FOR (e:Entity) ON (e.type);

// Composite index for tenant + type queries (common pattern)
CREATE INDEX entity_tenant_type_idx IF NOT EXISTS
FOR (e:Entity) ON (e.tenantId, e.type);

// Text search on entity names/titles
CREATE INDEX entity_name_idx IF NOT EXISTS
FOR (e:Entity) ON (e.name);

// Timestamp indexes for temporal queries
CREATE INDEX entity_created_idx IF NOT EXISTS
FOR (e:Entity) ON (e.createdAt);

CREATE INDEX entity_updated_idx IF NOT EXISTS
FOR (e:Entity) ON (e.updatedAt);

// ===== RELATIONSHIP INDEXES =====

// Relationship type performance
CREATE INDEX rel_type_idx IF NOT EXISTS
FOR ()-[r:RELATIONSHIP]->() ON (r.type);

// Tenant scoping for relationships
CREATE INDEX rel_tenant_idx IF NOT EXISTS
FOR ()-[r:RELATIONSHIP]->() ON (r.tenantId);

// Composite tenant + type for relationships
CREATE INDEX rel_tenant_type_idx IF NOT EXISTS
FOR ()-[r:RELATIONSHIP]->() ON (r.tenantId, r.type);

// Relationship timestamps
CREATE INDEX rel_created_idx IF NOT EXISTS
FOR ()-[r:RELATIONSHIP]->() ON (r.createdAt);

// ===== INVESTIGATION INDEXES =====

// Investigation constraints and indexes
CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS
FOR (i:Investigation) REQUIRE i.id IS UNIQUE;

CREATE INDEX investigation_tenant_idx IF NOT EXISTS
FOR (i:Investigation) ON (i.tenantId);

CREATE INDEX investigation_created_idx IF NOT EXISTS
FOR (i:Investigation) ON (i.createdAt);

// ===== USER INDEXES =====

// User constraints
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT user_email_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.email IS UNIQUE;

// User tenant mapping
CREATE INDEX user_tenant_idx IF NOT EXISTS
FOR (u:User) ON (u.tenantId);

// ===== EMBEDDING INDEXES =====
// For semantic search performance

CREATE INDEX entity_embedding_idx IF NOT EXISTS
FOR (e:Entity) ON (e.embedding) 
OPTIONS {indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine'
}};

// ===== FULL-TEXT SEARCH INDEXES =====

// Entity content search
CREATE FULLTEXT INDEX entity_fulltext_idx IF NOT EXISTS
FOR (e:Entity) ON EACH [e.name, e.description, e.content];

// Investigation search
CREATE FULLTEXT INDEX investigation_fulltext_idx IF NOT EXISTS  
FOR (i:Investigation) ON EACH [i.name, i.description];

// ===== PERFORMANCE HINTS =====

// Show all indexes
SHOW INDEXES;

// Show all constraints  
SHOW CONSTRAINTS;

// Query to verify index usage (run after creating indexes)
// PROFILE MATCH (e:Entity {tenantId: $tenantId}) WHERE e.type = $type RETURN e;