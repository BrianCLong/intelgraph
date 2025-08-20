// IntelGraph Neo4j Initial Schema Migration
// MIT License - Copyright (c) 2025 IntelGraph

// Create unique constraints for entities
CREATE CONSTRAINT entity_id_unique IF NOT EXISTS 
FOR (e:Entity) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT entity_tenant_isolation IF NOT EXISTS 
FOR (e:Entity) REQUIRE (e.id, e.tenantId) IS UNIQUE;

// Create constraints for relationships
CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS 
FOR ()-[r:RELATES_TO]-() REQUIRE r.id IS UNIQUE;

// Create constraints for investigations
CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS 
FOR (i:Investigation) REQUIRE i.id IS UNIQUE;

// Create constraints for users
CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT user_email_tenant_unique IF NOT EXISTS 
FOR (u:User) REQUIRE (u.email, u.tenantId) IS UNIQUE;

// Create constraints for sources
CREATE CONSTRAINT source_id_unique IF NOT EXISTS 
FOR (s:Source) REQUIRE s.id IS UNIQUE;

// Performance indexes for entities
CREATE INDEX entity_type_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.type);

CREATE INDEX entity_tenant_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.tenantId);

CREATE INDEX entity_created_at_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.createdAt);

CREATE INDEX entity_confidence_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.confidence);

CREATE INDEX entity_valid_from_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.validFrom);

CREATE INDEX entity_valid_to_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.validTo);

// Performance indexes for relationships
CREATE INDEX relationship_type_idx IF NOT EXISTS 
FOR ()-[r:RELATES_TO]-() ON (r.type);

CREATE INDEX relationship_confidence_idx IF NOT EXISTS 
FOR ()-[r:RELATES_TO]-() ON (r.confidence);

CREATE INDEX relationship_tenant_idx IF NOT EXISTS 
FOR ()-[r:RELATES_TO]-() ON (r.tenantId);

CREATE INDEX relationship_created_at_idx IF NOT EXISTS 
FOR ()-[r:RELATES_TO]-() ON (r.createdAt);

// Performance indexes for investigations
CREATE INDEX investigation_status_idx IF NOT EXISTS 
FOR (i:Investigation) ON (i.status);

CREATE INDEX investigation_tenant_idx IF NOT EXISTS 
FOR (i:Investigation) ON (i.tenantId);

CREATE INDEX investigation_created_at_idx IF NOT EXISTS 
FOR (i:Investigation) ON (i.createdAt);

CREATE INDEX investigation_priority_idx IF NOT EXISTS 
FOR (i:Investigation) ON (i.priority);

// Performance indexes for users
CREATE INDEX user_tenant_idx IF NOT EXISTS 
FOR (u:User) ON (u.tenantId);

CREATE INDEX user_role_idx IF NOT EXISTS 
FOR (u:User) ON (u.role);

// Full-text search indexes
CREATE FULLTEXT INDEX entity_search_idx IF NOT EXISTS 
FOR (e:Entity) ON EACH [e.name, e.description];

CREATE FULLTEXT INDEX investigation_search_idx IF NOT EXISTS 
FOR (i:Investigation) ON EACH [i.name, i.description];

// Composite indexes for common query patterns
CREATE INDEX entity_type_tenant_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.type, e.tenantId);

CREATE INDEX entity_tenant_created_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.tenantId, e.createdAt);

CREATE INDEX relationship_type_tenant_idx IF NOT EXISTS 
FOR ()-[r:RELATES_TO]-() ON (r.type, r.tenantId);

// Temporal indexes for bitemporal queries
CREATE INDEX entity_temporal_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.validFrom, e.validTo);

CREATE INDEX relationship_temporal_idx IF NOT EXISTS 
FOR ()-[r:RELATES_TO]-() ON (r.validFrom, r.validTo);

// Security and audit indexes
CREATE INDEX entity_created_by_idx IF NOT EXISTS 
FOR (e:Entity) ON (e.createdBy);

CREATE INDEX relationship_created_by_idx IF NOT EXISTS 
FOR ()-[r:RELATES_TO]-() ON (r.createdBy);