-- IntelGraph Core Persistence Schema
-- Replaces demo resolvers with production PostgreSQL + Neo4j

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Entities: canonical metadata + provenance
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  labels TEXT[] NOT NULL DEFAULT '{}',
  props JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entities_tenant_kind ON entities (tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_entities_gin ON entities USING GIN (props);
CREATE INDEX IF NOT EXISTS idx_entities_created_at ON entities (created_at DESC);

-- Relationships: store canonical copy + metadata
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  src_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  dst_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rels_tenant_type ON relationships (tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_rels_src_dst ON relationships (src_id, dst_id);

-- Investigations: project/case management
CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  props JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investigations_tenant ON investigations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations (status);

-- Provenance/audit (minimal MVP)
CREATE TABLE IF NOT EXISTS provenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('entity','relationship','investigation')),
  subject_id UUID NOT NULL,
  source TEXT NOT NULL,              -- URI or registry key
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provenance_subject ON provenance (subject_type, subject_id);

-- Outbox for Neo4j sync (eventual consistency)
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,               -- e.g., 'entity.upsert', 'relationship.upsert', 'entity.delete'
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events (processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox_events (created_at);