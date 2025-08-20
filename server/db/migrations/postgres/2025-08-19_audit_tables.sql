-- MVP-1+ Audit Trail Tables
-- Immutable append-only audit log for compliance and security

-- Create audit_events table for immutable audit trail
CREATE TABLE IF NOT EXISTS audit_events (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    resource_data JSONB,
    old_values JSONB,
    new_values JSONB,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    investigation_id VARCHAR(255),
    session_id VARCHAR(255),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_audit_events_user_id (user_id),
    INDEX idx_audit_events_tenant_id (tenant_id),
    INDEX idx_audit_events_timestamp (timestamp DESC),
    INDEX idx_audit_events_action (action),
    INDEX idx_audit_events_resource_type (resource_type),
    INDEX idx_audit_events_investigation_id (investigation_id),
    INDEX idx_audit_events_composite (tenant_id, timestamp DESC, user_id)
);

-- Create feature flags table for MVP-1+ features
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    tenant_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_feature_flags_key (flag_key),
    INDEX idx_feature_flags_tenant (tenant_id)
);

-- Insert default MVP-1+ feature flags
INSERT INTO feature_flags (flag_key, enabled, description) VALUES
    ('RBAC_FINE_GRAINED', true, 'Enable fine-grained role-based access control'),
    ('AUDIT_TRAIL', true, 'Enable audit trail recording'),
    ('COPILOT_SERVICE', true, 'Enable AI Copilot service integration'),
    ('ANALYTICS_PANEL', true, 'Enable analytics panel and reporting'),
    ('PDF_EXPORT', true, 'Enable PDF export functionality'),
    ('OPENTELEMETRY', true, 'Enable OpenTelemetry observability')
ON CONFLICT (flag_key) DO UPDATE SET 
    enabled = EXCLUDED.enabled,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Ensure investigations table exists with required columns
CREATE TABLE IF NOT EXISTS investigations (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    created_by VARCHAR(255) NOT NULL,
    assigned_to JSONB DEFAULT '[]'::jsonb,
    shared_with JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_investigations_tenant (tenant_id),
    INDEX idx_investigations_created_by (created_by),
    INDEX idx_investigations_status (status)
);

-- Grant necessary permissions
GRANT SELECT, INSERT ON audit_events TO postgres;
GRANT SELECT, INSERT, UPDATE ON feature_flags TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON investigations TO postgres;

-- Add comments for documentation
COMMENT ON TABLE audit_events IS 'Immutable audit trail for MVP-1+ compliance and security monitoring';
COMMENT ON TABLE feature_flags IS 'Feature flag configuration for MVP-1+ rollout control';
COMMENT ON TABLE investigations IS 'Investigation management with RBAC support';