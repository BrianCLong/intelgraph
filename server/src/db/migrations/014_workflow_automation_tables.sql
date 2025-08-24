-- Workflow Automation Engine Tables
-- Supports visual workflow design, execution tracking, and human task management

-- Workflow definitions table
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT false,
    triggers JSONB NOT NULL DEFAULT '[]', -- Array of workflow triggers
    steps JSONB NOT NULL DEFAULT '[]', -- Array of workflow steps
    settings JSONB DEFAULT '{"errorHandling": "stop", "logging": "minimal", "concurrency": 1}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique active versions per workflow name
    CONSTRAINT unique_active_workflow_version EXCLUDE (name WITH =, version WITH =) WHERE (is_active = true)
);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    workflow_version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled', 'paused'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    started_by UUID REFERENCES users(id),
    trigger_type VARCHAR(50) NOT NULL, -- 'event', 'schedule', 'manual', 'webhook'
    trigger_data JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}', -- Execution context and variables
    current_step VARCHAR(255),
    steps JSONB NOT NULL DEFAULT '[]', -- Array of step executions
    error JSONB, -- Error details if execution failed
    
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'paused'))
);

-- Human tasks table for workflow steps requiring human intervention
CREATE TABLE IF NOT EXISTS human_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assignees JSONB NOT NULL DEFAULT '[]', -- Array of user IDs
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
    form_data JSONB,
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled'))
);

-- Workflow templates for quick workflow creation
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'data-processing', 'approval', 'incident-response', etc.
    definition JSONB NOT NULL, -- Complete workflow definition
    tags JSONB DEFAULT '[]',
    is_built_in BOOLEAN DEFAULT false,
    preview TEXT, -- Base64 image or URL
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow triggers for external system integration
CREATE TABLE IF NOT EXISTS workflow_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) NOT NULL, -- 'event', 'schedule', 'webhook', 'condition'
    trigger_config JSONB NOT NULL, -- Type-specific configuration
    is_enabled BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow execution logs for detailed tracking
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id VARCHAR(255),
    log_level VARCHAR(20) NOT NULL, -- 'DEBUG', 'INFO', 'WARN', 'ERROR'
    message TEXT NOT NULL,
    details JSONB,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_execution_logs_execution_id (execution_id),
    INDEX idx_execution_logs_level (log_level),
    INDEX idx_execution_logs_logged_at (logged_at DESC)
);

-- Workflow metrics for analytics
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    executions_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_duration_seconds NUMERIC(10,2),
    min_duration_seconds NUMERIC(10,2),
    max_duration_seconds NUMERIC(10,2),
    
    UNIQUE(workflow_id, metric_date)
);

-- Scheduled workflow jobs
CREATE TABLE IF NOT EXISTS scheduled_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_execution_id UUID REFERENCES workflow_executions(id),
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_scheduled_workflows_next_run (next_run_at) WHERE is_active = true
);

-- Webhook endpoints for workflow triggers
CREATE TABLE IF NOT EXISTS workflow_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    endpoint_path VARCHAR(500) NOT NULL,
    secret_key VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    request_count BIGINT DEFAULT 0,
    last_request_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(endpoint_path)
);

-- Workflow version history
CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    definition JSONB NOT NULL, -- Complete workflow definition snapshot
    change_summary TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(workflow_id, version)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_active ON workflow_definitions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_created_by ON workflow_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_name ON workflow_definitions(name);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_by ON workflow_executions(started_by);

CREATE INDEX IF NOT EXISTS idx_human_tasks_execution_id ON human_tasks(execution_id);
CREATE INDEX IF NOT EXISTS idx_human_tasks_assignees ON human_tasks USING GIN(assignees);
CREATE INDEX IF NOT EXISTS idx_human_tasks_status ON human_tasks(status);
CREATE INDEX IF NOT EXISTS idx_human_tasks_due_date ON human_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_builtin ON workflow_templates(is_built_in);

CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_enabled ON workflow_triggers(is_enabled) WHERE is_enabled = true;

-- Update triggers
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflow_definitions_updated_at
    BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_updated_at();

CREATE TRIGGER update_workflow_templates_updated_at
    BEFORE UPDATE ON workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_updated_at();

-- Functions for workflow analytics
CREATE OR REPLACE FUNCTION get_workflow_stats(
    workflow_id_param UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    avg_duration_minutes NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_duration_minutes,
        ROUND(
            COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0),
            2
        ) as success_rate
    FROM workflow_executions
    WHERE (workflow_id_param IS NULL OR workflow_id = workflow_id_param)
    AND started_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
    AND completed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get workflow execution timeline
CREATE OR REPLACE FUNCTION get_workflow_execution_timeline(
    workflow_id_param UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    execution_date DATE,
    executions_count BIGINT,
    success_count BIGINT,
    failure_count BIGINT,
    avg_duration_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(started_at) as execution_date,
        COUNT(*) as executions_count,
        COUNT(*) FILTER (WHERE status = 'completed') as success_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failure_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
    FROM workflow_executions
    WHERE workflow_id = workflow_id_param
    AND started_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
    GROUP BY DATE(started_at)
    ORDER BY execution_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next scheduled run time
CREATE OR REPLACE FUNCTION calculate_next_run_time(
    cron_expr VARCHAR(100),
    timezone_name VARCHAR(50) DEFAULT 'UTC'
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    next_run TIMESTAMP WITH TIME ZONE;
BEGIN
    -- This is a simplified implementation
    -- In production, you'd use a proper cron parser library
    
    CASE 
        WHEN cron_expr = '0 0 * * *' THEN -- Daily at midnight
            next_run := DATE_TRUNC('day', CURRENT_TIMESTAMP AT TIME ZONE timezone_name) + INTERVAL '1 day';
        WHEN cron_expr = '0 0 * * 0' THEN -- Weekly on Sunday
            next_run := DATE_TRUNC('week', CURRENT_TIMESTAMP AT TIME ZONE timezone_name) + INTERVAL '1 week';
        WHEN cron_expr = '0 0 1 * *' THEN -- Monthly on 1st
            next_run := DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE timezone_name) + INTERVAL '1 month';
        ELSE
            -- Default to next hour for unsupported cron expressions
            next_run := DATE_TRUNC('hour', CURRENT_TIMESTAMP AT TIME ZONE timezone_name) + INTERVAL '1 hour';
    END CASE;
    
    RETURN next_run AT TIME ZONE timezone_name;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update workflow metrics daily
CREATE OR REPLACE FUNCTION update_workflow_metrics_daily()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed executions
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO workflow_metrics (
            workflow_id, 
            metric_date, 
            executions_count, 
            success_count, 
            failure_count,
            avg_duration_seconds,
            min_duration_seconds,
            max_duration_seconds
        ) VALUES (
            NEW.workflow_id,
            DATE(NEW.started_at),
            1,
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)),
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)),
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))
        )
        ON CONFLICT (workflow_id, metric_date) 
        DO UPDATE SET
            executions_count = workflow_metrics.executions_count + 1,
            success_count = workflow_metrics.success_count + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            failure_count = workflow_metrics.failure_count + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            avg_duration_seconds = (
                workflow_metrics.avg_duration_seconds * workflow_metrics.executions_count + 
                EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))
            ) / (workflow_metrics.executions_count + 1),
            min_duration_seconds = LEAST(
                workflow_metrics.min_duration_seconds,
                EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))
            ),
            max_duration_seconds = GREATEST(
                workflow_metrics.max_duration_seconds,
                EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))
            );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_execution_metrics_trigger
    AFTER UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_metrics_daily();

-- Cleanup old execution logs
CREATE OR REPLACE FUNCTION cleanup_old_workflow_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS void AS $$
BEGIN
    DELETE FROM workflow_execution_logs 
    WHERE logged_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS LATEST_ROW_COUNT = ROW_COUNT;
    IF LATEST_ROW_COUNT > 0 THEN
        RAISE NOTICE 'Cleaned up % old workflow execution log entries', LATEST_ROW_COUNT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert built-in workflow templates
INSERT INTO workflow_templates (id, name, description, category, definition, tags, is_built_in) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440020',
    'Data Processing Pipeline',
    'Automated pipeline for processing and analyzing incoming data',
    'data-processing',
    '{
        "name": "Data Processing Pipeline",
        "description": "Automated pipeline for processing and analyzing incoming data",
        "version": "1.0.0",
        "isActive": false,
        "triggers": [
            {
                "id": "trigger-1",
                "type": "event",
                "config": {"eventType": "data.received"},
                "isEnabled": true
            }
        ],
        "steps": [
            {
                "id": "step-1",
                "name": "Validate Data",
                "type": "action",
                "config": {
                    "actionType": "validation",
                    "actionConfig": {"schema": "data_schema", "strict": true}
                },
                "position": {"x": 100, "y": 100},
                "connections": [{"targetStepId": "step-2"}],
                "isEnabled": true
            },
            {
                "id": "step-2", 
                "name": "Process Data",
                "type": "action",
                "config": {
                    "actionType": "ml",
                    "actionConfig": {"model": "entity_resolution", "confidence": 0.8}
                },
                "position": {"x": 100, "y": 200},
                "connections": [{"targetStepId": "step-3"}],
                "isEnabled": true
            },
            {
                "id": "step-3",
                "name": "Store Results", 
                "type": "action",
                "config": {
                    "actionType": "database",
                    "actionConfig": {"operation": "insert", "table": "processed_data"}
                },
                "position": {"x": 100, "y": 300},
                "connections": [],
                "isEnabled": true
            }
        ],
        "settings": {
            "errorHandling": "retry",
            "logging": "detailed",
            "concurrency": 1
        }
    }',
    '["data", "processing", "ml", "automation"]',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440021',
    'Incident Response Workflow',
    'Automated incident response and escalation workflow',
    'security',
    '{
        "name": "Incident Response Workflow",
        "description": "Automated incident response and escalation workflow", 
        "version": "1.0.0",
        "isActive": false,
        "triggers": [
            {
                "id": "trigger-1",
                "type": "event", 
                "config": {"eventType": "incident.detected"},
                "isEnabled": true
            }
        ],
        "steps": [
            {
                "id": "step-1",
                "name": "Create Ticket",
                "type": "action",
                "config": {
                    "actionType": "jira",
                    "actionConfig": {
                        "project": "INCIDENT",
                        "issueType": "Incident", 
                        "priority": "High"
                    }
                },
                "position": {"x": 100, "y": 100},
                "connections": [{"targetStepId": "step-2"}],
                "isEnabled": true
            },
            {
                "id": "step-2",
                "name": "Notify Team",
                "type": "action", 
                "config": {
                    "actionType": "slack",
                    "actionConfig": {
                        "channel": "#incidents",
                        "message": "New incident: {{incident.title}}"
                    }
                },
                "position": {"x": 200, "y": 100},
                "connections": [{"targetStepId": "step-3"}],
                "isEnabled": true
            },
            {
                "id": "step-3",
                "name": "Assess Severity",
                "type": "human",
                "config": {
                    "assignees": ["incident-manager"],
                    "formConfig": {
                        "fields": [
                            {"name": "severity", "type": "select", "options": ["Low", "Medium", "High", "Critical"]}
                        ]
                    }
                },
                "position": {"x": 150, "y": 200},
                "connections": [],
                "isEnabled": true
            }
        ],
        "settings": {
            "errorHandling": "continue",
            "logging": "detailed", 
            "concurrency": 2
        }
    }',
    '["security", "incident", "response", "escalation"]',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440022',
    'Approval Workflow',
    'Multi-stage approval process for requests and changes',
    'approval',
    '{
        "name": "Approval Workflow",
        "description": "Multi-stage approval process for requests and changes",
        "version": "1.0.0", 
        "isActive": false,
        "triggers": [
            {
                "id": "trigger-1",
                "type": "event",
                "config": {"eventType": "approval.requested"},
                "isEnabled": true
            }
        ],
        "steps": [
            {
                "id": "step-1",
                "name": "Manager Approval",
                "type": "human",
                "config": {
                    "assignees": ["manager"],
                    "formConfig": {
                        "fields": [
                            {"name": "decision", "type": "select", "options": ["Approve", "Reject"]},
                            {"name": "comments", "type": "textarea"}
                        ]
                    }
                },
                "position": {"x": 100, "y": 100},
                "connections": [
                    {
                        "targetStepId": "step-2", 
                        "condition": "custom",
                        "customCondition": {
                            "field": "decision",
                            "operator": "eq", 
                            "value": "Approve"
                        }
                    }
                ],
                "isEnabled": true
            },
            {
                "id": "step-2",
                "name": "Final Approval",
                "type": "action",
                "config": {
                    "actionType": "api",
                    "actionConfig": {
                        "endpoint": "/api/requests/approve",
                        "method": "POST"
                    }
                },
                "position": {"x": 100, "y": 200},
                "connections": [],
                "isEnabled": true
            }
        ],
        "settings": {
            "errorHandling": "stop",
            "logging": "detailed",
            "concurrency": 1
        }
    }',
    '["approval", "workflow", "governance", "process"]',
    true
)
ON CONFLICT (id) DO NOTHING;