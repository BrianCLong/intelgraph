-- IntelGraph PostgreSQL Initial Schema Migration
-- MIT License - Copyright (c) 2025 IntelGraph

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create enum types
CREATE TYPE entity_type AS ENUM (
    'PERSON', 'ORGANIZATION', 'LOCATION', 'EVENT', 'DOCUMENT',
    'IP_ADDRESS', 'DOMAIN', 'EMAIL', 'PHONE', 'VEHICLE', 'ACCOUNT', 'CUSTOM'
);

CREATE TYPE relationship_type AS ENUM (
    'CONNECTED_TO', 'OWNS', 'WORKS_FOR', 'LOCATED_AT', 'PARTICIPATED_IN',
    'COMMUNICATES_WITH', 'RELATED_TO', 'CUSTOM'
);

CREATE TYPE source_type AS ENUM (
    'DOCUMENT', 'DATABASE', 'API', 'MANUAL_ENTRY', 'INFERENCE', 'EXTERNAL_FEED'
);

CREATE TYPE investigation_status AS ENUM (
    'DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'
);

CREATE TYPE priority AS ENUM (
    'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);

CREATE TYPE user_role AS ENUM (
    'ANALYST', 'INVESTIGATOR', 'SUPERVISOR', 'ADMIN', 'VIEWER'
);

CREATE TYPE hypothesis_status AS ENUM (
    'PROPOSED', 'INVESTIGATING', 'SUPPORTED', 'REFUTED', 'INCONCLUSIVE'
);

-- Tenants table for multi-tenancy
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ANALYST',
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- For OIDC integration
    permissions JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(email, tenant_id)
);

-- Sources table for provenance tracking
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type source_type NOT NULL,
    url TEXT,
    metadata JSONB DEFAULT '{}',
    reliability DECIMAL(3,2) CHECK (reliability >= 0 AND reliability <= 1),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investigations table
CREATE TABLE investigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status investigation_status NOT NULL DEFAULT 'DRAFT',
    priority priority NOT NULL DEFAULT 'MEDIUM',
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID[] DEFAULT '{}', -- Array of user IDs
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', name || ' ' || COALESCE(description, ''))
    ) STORED
);

-- Entity metadata table (PostgreSQL stores metadata, Neo4j stores graph structure)
CREATE TABLE entity_metadata (
    id UUID PRIMARY KEY,
    neo4j_id BIGINT, -- Reference to Neo4j internal ID
    type entity_type NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    INDEX(tenant_id, type),
    INDEX(created_at),
    INDEX(valid_from, valid_to)
);

-- Relationship metadata table
CREATE TABLE relationship_metadata (
    id UUID PRIMARY KEY,
    neo4j_id BIGINT, -- Reference to Neo4j internal ID
    type relationship_type NOT NULL,
    source_entity_id UUID NOT NULL,
    target_entity_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    INDEX(tenant_id, type),
    INDEX(source_entity_id),
    INDEX(target_entity_id),
    INDEX(created_at),
    INDEX(valid_from, valid_to)
);

-- Entity-Source mapping for provenance
CREATE TABLE entity_sources (
    entity_id UUID NOT NULL,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY(entity_id, source_id)
);

-- Relationship-Source mapping for provenance
CREATE TABLE relationship_sources (
    relationship_id UUID NOT NULL,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY(relationship_id, source_id)
);

-- Investigation entities
CREATE TABLE investigation_entities (
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    added_by UUID NOT NULL REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY(investigation_id, entity_id)
);

-- Investigation relationships
CREATE TABLE investigation_relationships (
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    relationship_id UUID NOT NULL,
    added_by UUID NOT NULL REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY(investigation_id, relationship_id)
);

-- Hypotheses
CREATE TABLE hypotheses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    status hypothesis_status NOT NULL DEFAULT 'PROPOSED',
    evidence_entity_ids UUID[] DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline events
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entity_ids UUID[] DEFAULT '{}',
    source_id UUID REFERENCES sources(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX(investigation_id, timestamp),
    INDEX(timestamp)
);

-- Data ingestion jobs
CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    connector_type VARCHAR(100) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    config JSONB NOT NULL,
    progress JSONB DEFAULT '{"processed": 0, "total": 0, "errors": 0}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entity resolution scores
CREATE TABLE entity_resolution_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_a_id UUID NOT NULL,
    entity_b_id UUID NOT NULL,
    score DECIMAL(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
    algorithm VARCHAR(100) NOT NULL,
    features JSONB,
    explanation JSONB,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(entity_a_id, entity_b_id, algorithm),
    INDEX(score DESC),
    INDEX(tenant_id, score DESC)
);

-- Audit log for all operations
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX(tenant_id, created_at),
    INDEX(user_id, created_at),
    INDEX(action, created_at),
    INDEX(resource_type, resource_id)
);

-- Analytics cache for expensive computations
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(500) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    algorithm VARCHAR(100) NOT NULL,
    parameters JSONB NOT NULL,
    result JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX(tenant_id, algorithm),
    INDEX(expires_at)
);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investigations_updated_at BEFORE UPDATE ON investigations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_metadata_updated_at BEFORE UPDATE ON entity_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationship_metadata_updated_at BEFORE UPDATE ON relationship_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hypotheses_updated_at BEFORE UPDATE ON hypotheses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingestion_jobs_updated_at BEFORE UPDATE ON ingestion_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Full-text search indexes
CREATE INDEX investigations_search_idx ON investigations USING gin(search_vector);
CREATE INDEX entity_metadata_tenant_type_idx ON entity_metadata(tenant_id, type);
CREATE INDEX relationship_metadata_tenant_type_idx ON relationship_metadata(tenant_id, type);

-- Performance indexes for common queries
CREATE INDEX investigations_status_tenant_idx ON investigations(status, tenant_id);
CREATE INDEX investigations_assigned_to_idx ON investigations USING gin(assigned_to);
CREATE INDEX users_tenant_role_idx ON users(tenant_id, role);
CREATE INDEX audit_log_composite_idx ON audit_log(tenant_id, user_id, created_at DESC);

-- Partial indexes for active records
CREATE INDEX entity_metadata_active_idx ON entity_metadata(tenant_id, type) WHERE is_deleted = FALSE;
CREATE INDEX relationship_metadata_active_idx ON relationship_metadata(tenant_id, type) WHERE is_deleted = FALSE;

-- Indexes for temporal queries
CREATE INDEX entity_metadata_temporal_idx ON entity_metadata(valid_from, valid_to) WHERE valid_to IS NOT NULL;
CREATE INDEX relationship_metadata_temporal_idx ON relationship_metadata(valid_from, valid_to) WHERE valid_to IS NOT NULL;