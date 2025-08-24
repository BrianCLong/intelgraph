-- Search Engine Tables for IntelGraph MLFP
-- Supports saved searches, search templates, and search analytics

-- Saved Searches Table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query JSONB NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT saved_searches_name_user_unique UNIQUE(name, user_id)
);

-- Search Templates Table
CREATE TABLE IF NOT EXISTS search_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template TEXT NOT NULL,
    params JSONB DEFAULT '{}',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT search_templates_name_user_unique UNIQUE(name, user_id, category)
);

-- Search Analytics Table
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID,
    query_text TEXT NOT NULL,
    search_type VARCHAR(50) DEFAULT 'fulltext',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    result_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    clicked BOOLEAN DEFAULT false,
    clicked_results JSONB DEFAULT '[]',
    refinements JSONB DEFAULT '[]',
    filters_applied JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

-- Search Index Status Table
CREATE TABLE IF NOT EXISTS search_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    mappings JSONB NOT NULL DEFAULT '{}',
    settings JSONB NOT NULL DEFAULT '{}',
    aliases JSONB DEFAULT '[]',
    document_count BIGINT DEFAULT 0,
    size_in_bytes BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unknown',
    last_indexed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Query Performance Metrics Table
CREATE TABLE IF NOT EXISTS query_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    query_type VARCHAR(50) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    result_count INTEGER NOT NULL,
    index_name VARCHAR(255),
    filters_complexity INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_query_performance_hash (query_hash),
    INDEX idx_query_performance_type (query_type),
    INDEX idx_query_performance_time (execution_time_ms)
);

-- Popular Search Terms Table
CREATE TABLE IF NOT EXISTS popular_search_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term VARCHAR(255) NOT NULL,
    normalized_term VARCHAR(255) NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    CONSTRAINT popular_terms_unique UNIQUE(normalized_term, tenant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_public ON saved_searches(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_saved_searches_tags ON saved_searches USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_saved_searches_execution_count ON saved_searches(execution_count DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_updated_at ON saved_searches(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_templates_user_id ON search_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_search_templates_category ON search_templates(category);
CREATE INDEX IF NOT EXISTS idx_search_templates_public ON search_templates(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_tenant_id ON search_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_text ON search_analytics USING GIN(to_tsvector('english', query_text));
CREATE INDEX IF NOT EXISTS idx_search_analytics_session_id ON search_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_search_indices_name ON search_indices(name);
CREATE INDEX IF NOT EXISTS idx_search_indices_status ON search_indices(status);
CREATE INDEX IF NOT EXISTS idx_search_indices_updated_at ON search_indices(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_popular_terms_tenant ON popular_search_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_popular_terms_count ON popular_search_terms(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_popular_terms_normalized ON popular_search_terms(normalized_term);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_fts ON saved_searches USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_search_templates_fts ON search_templates USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || template)
);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_search_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_search_indices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER trigger_saved_searches_updated_at
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_searches_updated_at();

DROP TRIGGER IF EXISTS trigger_search_templates_updated_at ON search_templates;
CREATE TRIGGER trigger_search_templates_updated_at
    BEFORE UPDATE ON search_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_search_templates_updated_at();

DROP TRIGGER IF EXISTS trigger_search_indices_updated_at ON search_indices;
CREATE TRIGGER trigger_search_indices_updated_at
    BEFORE UPDATE ON search_indices
    FOR EACH ROW
    EXECUTE FUNCTION update_search_indices_updated_at();

-- Function to update popular search terms
CREATE OR REPLACE FUNCTION update_popular_search_term(
    p_term TEXT,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    normalized_term TEXT;
BEGIN
    -- Normalize the search term (lowercase, trim whitespace)
    normalized_term := LOWER(TRIM(p_term));
    
    -- Insert or update the popular search term
    INSERT INTO popular_search_terms (term, normalized_term, search_count, tenant_id, last_searched)
    VALUES (p_term, normalized_term, 1, p_tenant_id, CURRENT_TIMESTAMP)
    ON CONFLICT (normalized_term, tenant_id)
    DO UPDATE SET
        search_count = popular_search_terms.search_count + 1,
        last_searched = CURRENT_TIMESTAMP,
        term = CASE 
            WHEN LENGTH(EXCLUDED.term) > LENGTH(popular_search_terms.term) 
            THEN EXCLUDED.term 
            ELSE popular_search_terms.term 
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    p_query TEXT,
    p_tenant_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    frequency INTEGER,
    last_used TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pst.term,
        pst.search_count,
        pst.last_searched
    FROM popular_search_terms pst
    WHERE 
        (p_tenant_id IS NULL OR pst.tenant_id = p_tenant_id OR pst.tenant_id IS NULL)
        AND pst.normalized_term ILIKE '%' || LOWER(TRIM(p_query)) || '%'
    ORDER BY 
        pst.search_count DESC,
        pst.last_searched DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_search_analytics(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM search_analytics
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default search templates
INSERT INTO search_templates (name, description, template, params, user_id, category, is_public)
SELECT 
    'Threat Intelligence Search',
    'Search for threat intelligence indicators and malware',
    'type:threat AND (malware OR vulnerability OR attack) AND date:{{date_range}}',
    '{"date_range": "last_30_days"}',
    (SELECT id FROM users WHERE email = 'system@intelgraph.com' LIMIT 1),
    'security',
    true
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'system@intelgraph.com')
ON CONFLICT (name, user_id, category) DO NOTHING;

INSERT INTO search_templates (name, description, template, params, user_id, category, is_public)
SELECT 
    'Entity Relationship Analysis',
    'Find entities and their relationships',
    'entity:"{{entity_name}}" AND related:true',
    '{"entity_name": ""}',
    (SELECT id FROM users WHERE email = 'system@intelgraph.com' LIMIT 1),
    'analysis',
    true
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'system@intelgraph.com')
ON CONFLICT (name, user_id, category) DO NOTHING;

INSERT INTO search_templates (name, description, template, params, user_id, category, is_public)
SELECT 
    'Case Document Search',
    'Search documents within a specific case',
    'type:document AND case:"{{case_id}}" AND date:{{date_range}}',
    '{"case_id": "", "date_range": "last_7_days"}',
    (SELECT id FROM users WHERE email = 'system@intelgraph.com' LIMIT 1),
    'cases',
    true
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'system@intelgraph.com')
ON CONFLICT (name, user_id, category) DO NOTHING;

INSERT INTO search_templates (name, description, template, params, user_id, category, is_public)
SELECT 
    'Recent High-Confidence Events',
    'Find recent events with high confidence scores',
    'type:event AND confidence:0.8_to_1.0 AND date:last_{{days}}_days ORDER BY date DESC',
    '{"days": "7"}',
    (SELECT id FROM users WHERE email = 'system@intelgraph.com' LIMIT 1),
    'events',
    true
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'system@intelgraph.com')
ON CONFLICT (name, user_id, category) DO NOTHING;

INSERT INTO search_templates (name, description, template, params, user_id, category, is_public)
SELECT 
    'Geospatial Analysis',
    'Search for entities within a geographic area',
    'location:within_{{distance}}_of_{{coordinates}} AND type:{{entity_type}}',
    '{"distance": "10km", "coordinates": "", "entity_type": ""}',
    (SELECT id FROM users WHERE email = 'system@intelgraph.com' LIMIT 1),
    'geospatial',
    true
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'system@intelgraph.com')
ON CONFLICT (name, user_id, category) DO NOTHING;