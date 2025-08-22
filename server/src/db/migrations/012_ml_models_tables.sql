-- ML Models and Training Data Tables
-- Supports versioning, performance tracking, and feedback collection

-- Model versions table
CREATE TABLE IF NOT EXISTS ml_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(100) NOT NULL, -- 'entity_resolution', 'classification', etc.
    metrics JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    model_path TEXT NOT NULL,
    hyperparameters JSONB DEFAULT '{}',
    training_data_hash VARCHAR(64), -- SHA-256 hash of training data
    notes TEXT,
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_active_model_per_type EXCLUDE (model_type WITH =) WHERE (is_active = true)
);

-- Entity resolution feedback table
CREATE TABLE IF NOT EXISTS entity_resolution_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity1_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    entity2_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    is_match BOOLEAN NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'automated', 'validated'
    model_version_id UUID REFERENCES ml_model_versions(id),
    features JSONB DEFAULT '{}', -- Calculated features at time of feedback
    notes TEXT,
    
    CONSTRAINT unique_entity_pair_feedback UNIQUE (entity1_id, entity2_id, user_id, created_at)
);

-- Training batches table
CREATE TABLE IF NOT EXISTS ml_training_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name VARCHAR(200) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    training_examples_count INTEGER DEFAULT 0,
    validation_examples_count INTEGER DEFAULT 0,
    hyperparameters JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}', -- Training and validation metrics
    error_message TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_training_batches_status (status),
    INDEX idx_training_batches_model_type (model_type),
    INDEX idx_training_batches_created_at (created_at)
);

-- Model performance tracking
CREATE TABLE IF NOT EXISTS ml_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id UUID NOT NULL REFERENCES ml_model_versions(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- 'accuracy', 'precision', 'recall', 'f1_score', etc.
    metric_value DECIMAL(10,6) NOT NULL,
    evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    test_set_size INTEGER,
    test_set_hash VARCHAR(64), -- Hash of test data used
    evaluation_context JSONB DEFAULT '{}', -- Additional context like dataset info
    
    INDEX idx_model_performance_version (model_version_id),
    INDEX idx_model_performance_metric (metric_name),
    INDEX idx_model_performance_date (evaluation_date)
);

-- Feature importance tracking
CREATE TABLE IF NOT EXISTS ml_feature_importance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id UUID NOT NULL REFERENCES ml_model_versions(id) ON DELETE CASCADE,
    feature_name VARCHAR(200) NOT NULL,
    importance_score DECIMAL(10,6) NOT NULL,
    importance_rank INTEGER,
    calculation_method VARCHAR(100), -- 'gini', 'permutation', 'shap', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_feature_importance_model (model_version_id),
    INDEX idx_feature_importance_score (importance_score DESC)
);

-- Entity similarity cache
CREATE TABLE IF NOT EXISTS entity_similarity_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity1_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    entity2_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    similarity_score DECIMAL(10,6) NOT NULL,
    model_version_id UUID REFERENCES ml_model_versions(id),
    calculation_method VARCHAR(100) NOT NULL, -- 'ml_model', 'semantic', 'lexical', etc.
    features_used JSONB DEFAULT '{}',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    
    CONSTRAINT unique_entity_pair_similarity UNIQUE (entity1_id, entity2_id, model_version_id, calculation_method),
    INDEX idx_similarity_cache_entities (entity1_id, entity2_id),
    INDEX idx_similarity_cache_score (similarity_score DESC),
    INDEX idx_similarity_cache_expires (expires_at)
);

-- Batch processing jobs
CREATE TABLE IF NOT EXISTS ml_batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(100) NOT NULL, -- 'entity_resolution', 'bulk_similarity', etc.
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
    input_data JSONB NOT NULL,
    output_data JSONB,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_batch_jobs_status (status),
    INDEX idx_batch_jobs_type (job_type),
    INDEX idx_batch_jobs_created (created_at),
    INDEX idx_batch_jobs_user (created_by)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_type_active ON ml_model_versions(model_type, is_active);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_created ON ml_model_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entity_resolution_feedback_entities ON entity_resolution_feedback(entity1_id, entity2_id);
CREATE INDEX IF NOT EXISTS idx_entity_resolution_feedback_match ON entity_resolution_feedback(is_match);
CREATE INDEX IF NOT EXISTS idx_entity_resolution_feedback_user ON entity_resolution_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_resolution_feedback_created ON entity_resolution_feedback(created_at DESC);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_ml_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ml_model_versions_updated_at
    BEFORE UPDATE ON ml_model_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_ml_updated_at();

CREATE TRIGGER update_ml_batch_jobs_updated_at
    BEFORE UPDATE ON ml_batch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_ml_updated_at();

-- Cleanup old cache entries
CREATE OR REPLACE FUNCTION cleanup_similarity_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM entity_similarity_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to get active model for type
CREATE OR REPLACE FUNCTION get_active_model(model_type_param VARCHAR(100))
RETURNS UUID AS $$
DECLARE
    model_id UUID;
BEGIN
    SELECT id INTO model_id
    FROM ml_model_versions
    WHERE model_type = model_type_param AND is_active = true
    LIMIT 1;
    
    RETURN model_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate model performance over time
CREATE OR REPLACE FUNCTION get_model_performance_trend(
    model_version_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    metric_name VARCHAR(100),
    metric_value DECIMAL(10,6),
    evaluation_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.metric_name,
        mp.metric_value,
        mp.evaluation_date
    FROM ml_model_performance mp
    WHERE mp.model_version_id = model_version_id_param
    AND mp.evaluation_date >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
    ORDER BY mp.evaluation_date ASC, mp.metric_name;
END;
$$ LANGUAGE plpgsql;