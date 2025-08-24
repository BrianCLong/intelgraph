-- Analytics Dashboard System Tables
-- Supports dynamic dashboard creation, widget management, and data visualization

-- Dashboard main table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    layout VARCHAR(50) DEFAULT 'grid', -- 'grid', 'flex', 'custom'
    theme VARCHAR(50) DEFAULT 'light', -- 'light', 'dark', 'auto'
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    tags JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_control JSONB DEFAULT '{"viewers": [], "editors": [], "owners": []}',
    settings JSONB DEFAULT '{"autoRefresh": true, "refreshInterval": 300, "timezone": "UTC"}'
);

-- Dashboard widgets table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'chart', 'metric', 'table', 'graph', 'map', 'text'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}', -- Widget-specific configuration
    data_source JSONB NOT NULL DEFAULT '{}', -- Data source configuration
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 4}', -- Grid position and size
    refresh_interval INTEGER, -- Refresh interval in seconds
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard templates for quick setup
CREATE TABLE IF NOT EXISTS dashboard_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'executive', 'operational', 'analytical', 'investigative'
    widgets JSONB NOT NULL DEFAULT '[]', -- Pre-configured widgets
    tags JSONB DEFAULT '[]',
    is_built_in BOOLEAN DEFAULT false,
    preview TEXT, -- Base64 image or URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chart configurations for reusable chart definitions
CREATE TABLE IF NOT EXISTS chart_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'time-series', 'categorical', 'comparison', 'distribution'
    data_source VARCHAR(50) NOT NULL, -- 'postgres', 'neo4j', 'api'
    query_template TEXT NOT NULL, -- SQL/Cypher query with parameters
    parameters JSONB DEFAULT '{}', -- Default parameters
    visualization_config JSONB DEFAULT '{}', -- Chart.js/D3 configuration
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data source definitions
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'postgres', 'neo4j', 'api', 'file'
    connection_config JSONB NOT NULL, -- Connection parameters
    schema_info JSONB DEFAULT '{}', -- Available tables/collections/endpoints
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard access logs for analytics
CREATE TABLE IF NOT EXISTS dashboard_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    access_type VARCHAR(50) NOT NULL, -- 'view', 'edit', 'export', 'share'
    ip_address INET,
    user_agent TEXT,
    session_duration INTEGER, -- Duration in seconds for view events
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Widget data cache for performance
CREATE TABLE IF NOT EXISTS widget_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
    cache_key VARCHAR(255) NOT NULL,
    cached_data JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    data_hash VARCHAR(64), -- SHA-256 hash for change detection
    
    UNIQUE(widget_id, cache_key)
);

-- Scheduled reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    schedule_cron VARCHAR(100) NOT NULL, -- Cron expression
    format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'csv', 'json', 'email'
    recipients JSONB DEFAULT '[]', -- Email addresses or user IDs
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report execution history
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    file_path TEXT, -- Path to generated report file
    file_size BIGINT,
    error_message TEXT,
    execution_time_ms INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboards_public ON dashboards(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_dashboards_updated_at ON dashboards(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboards_tags ON dashboards USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(type);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_visible ON dashboard_widgets(is_visible) WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_dashboard_templates_category ON dashboard_templates(category);
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_builtin ON dashboard_templates(is_built_in);

CREATE INDEX IF NOT EXISTS idx_chart_configurations_type ON chart_configurations(type);
CREATE INDEX IF NOT EXISTS idx_chart_configurations_category ON chart_configurations(category);
CREATE INDEX IF NOT EXISTS idx_chart_configurations_public ON chart_configurations(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_dashboard_access_logs_dashboard ON dashboard_access_logs(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_access_logs_user ON dashboard_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_access_logs_created_at ON dashboard_access_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_widget_data_cache_widget ON widget_data_cache(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_expires ON widget_data_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_dashboard ON scheduled_reports(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_report_executions_scheduled ON report_executions(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);

-- Update triggers
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dashboards_updated_at
    BEFORE UPDATE ON dashboards
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER update_dashboard_widgets_updated_at
    BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER update_dashboard_templates_updated_at
    BEFORE UPDATE ON dashboard_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER update_chart_configurations_updated_at
    BEFORE UPDATE ON chart_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER update_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

-- Cleanup functions
CREATE OR REPLACE FUNCTION cleanup_expired_widget_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM widget_data_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS LATEST_ROW_COUNT = ROW_COUNT;
    IF LATEST_ROW_COUNT > 0 THEN
        RAISE NOTICE 'Cleaned up % expired widget cache entries', LATEST_ROW_COUNT;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_access_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    DELETE FROM dashboard_access_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS LATEST_ROW_COUNT = ROW_COUNT;
    IF LATEST_ROW_COUNT > 0 THEN
        RAISE NOTICE 'Cleaned up % old dashboard access log entries', LATEST_ROW_COUNT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Dashboard analytics functions
CREATE OR REPLACE FUNCTION get_dashboard_usage_stats(dashboard_id_param UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_views BIGINT,
    unique_viewers BIGINT,
    avg_session_duration NUMERIC,
    last_accessed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT user_id) as unique_viewers,
        AVG(session_duration) as avg_session_duration,
        MAX(created_at) as last_accessed
    FROM dashboard_access_logs
    WHERE dashboard_id = dashboard_id_param
    AND access_type = 'view'
    AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Insert built-in dashboard templates
INSERT INTO dashboard_templates (id, name, description, category, widgets, tags, is_built_in) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Executive Overview',
    'High-level KPIs and metrics for leadership team',
    'executive',
    '[
        {
            "type": "metric",
            "title": "Total Entities",
            "config": {"format": "number", "showTrend": true},
            "dataSource": {"type": "sql", "query": "SELECT COUNT(*) as value FROM entities"},
            "position": {"x": 0, "y": 0, "w": 3, "h": 2}
        },
        {
            "type": "metric",
            "title": "Active Cases",
            "config": {"format": "number", "color": "#10B981"},
            "dataSource": {"type": "sql", "query": "SELECT COUNT(*) as value FROM cases WHERE status = ''active''"},
            "position": {"x": 3, "y": 0, "w": 3, "h": 2}
        },
        {
            "type": "chart",
            "title": "Entity Growth Trend",
            "config": {"chartType": "line", "timeRange": {"days": 30}},
            "dataSource": {"type": "sql", "query": "SELECT DATE_TRUNC(''day'', created_at) as date, COUNT(*) as count FROM entities WHERE created_at >= NOW() - INTERVAL ''30 days'' GROUP BY DATE_TRUNC(''day'', created_at) ORDER BY date"},
            "position": {"x": 0, "y": 2, "w": 6, "h": 3}
        }
    ]',
    '["executive", "overview", "kpi"]',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440002', 
    'Investigation Dashboard',
    'Detailed analytics for active investigations',
    'investigative',
    '[
        {
            "type": "table",
            "title": "Recent Cases",
            "config": {"sortable": true, "filterable": true},
            "dataSource": {"type": "sql", "query": "SELECT title, status, priority, created_at FROM cases ORDER BY created_at DESC LIMIT 20"},
            "position": {"x": 0, "y": 0, "w": 6, "h": 4}
        },
        {
            "type": "chart",
            "title": "Case Status Distribution", 
            "config": {"chartType": "pie"},
            "dataSource": {"type": "sql", "query": "SELECT status, COUNT(*) as count FROM cases GROUP BY status"},
            "position": {"x": 6, "y": 0, "w": 3, "h": 4}
        },
        {
            "type": "graph",
            "title": "Entity Relationship Network",
            "config": {"layout": "force", "nodeLimit": 100},
            "dataSource": {"type": "cypher", "query": "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100"},
            "position": {"x": 0, "y": 4, "w": 9, "h": 5}
        }
    ]',
    '["investigation", "cases", "network"]',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Operational Metrics',
    'System performance and operational analytics',
    'operational', 
    '[
        {
            "type": "metric",
            "title": "System Load",
            "config": {"format": "percentage", "threshold": 80},
            "dataSource": {"type": "sql", "query": "SELECT 45.2 as value"},
            "position": {"x": 0, "y": 0, "w": 2, "h": 2}
        },
        {
            "type": "metric", 
            "title": "Active Users",
            "config": {"format": "number"},
            "dataSource": {"type": "sql", "query": "SELECT COUNT(DISTINCT user_id) as value FROM dashboard_access_logs WHERE created_at >= NOW() - INTERVAL ''1 hour''"},
            "position": {"x": 2, "y": 0, "w": 2, "h": 2}
        },
        {
            "type": "chart",
            "title": "Query Performance",
            "config": {"chartType": "line", "yAxis": "Response Time (ms)"},
            "dataSource": {"type": "sql", "query": "SELECT DATE_TRUNC(''hour'', created_at) as time, AVG(execution_time_ms) as avg_time FROM report_executions WHERE created_at >= NOW() - INTERVAL ''24 hours'' GROUP BY DATE_TRUNC(''hour'', created_at) ORDER BY time"},
            "position": {"x": 0, "y": 2, "w": 6, "h": 3}
        }
    ]',
    '["operational", "performance", "monitoring"]',
    true
)
ON CONFLICT (id) DO NOTHING;