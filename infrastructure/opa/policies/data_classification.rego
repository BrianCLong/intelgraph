package intelgraph.data_classification

import rego.v1

# IntelGraph Data Classification and Access Control Policy
# MIT License - Copyright (c) 2025 IntelGraph

# Data classification levels
classification_levels := {
    "public": 0,
    "internal": 1,
    "confidential": 2,
    "restricted": 3,
    "classified": 4
}

# User clearance levels based on roles
user_clearance := {
    "viewer": 1,
    "analyst": 2,
    "investigator": 3,
    "supervisor": 4,
    "admin": 4
}

# Check if user has sufficient clearance for data classification
sufficient_clearance if {
    user_level := user_clearance[input.user.role]
    data_level := classification_levels[input.resource.classification]
    user_level >= data_level
}

# PII (Personally Identifiable Information) access rules
pii_access_allowed if {
    not contains_pii
}

pii_access_allowed if {
    contains_pii
    input.user.role in ["investigator", "supervisor", "admin"]
    input.request.pii_justification != ""
}

contains_pii if {
    "pii" in input.resource.data_types
}

contains_pii if {
    some field in input.resource.fields
    field in ["ssn", "email", "phone", "address", "name"]
}

# Geographic data restrictions (export controls)
geographic_access_allowed if {
    not restricted_geography
}

geographic_access_allowed if {
    restricted_geography
    input.user.citizenship in allowed_countries
}

restricted_geography if {
    "geospatial" in input.resource.data_types
    input.resource.classification in ["restricted", "classified"]
}

allowed_countries := ["US", "CA", "GB", "AU", "NZ"]  # Five Eyes

# Temporal access controls
temporal_access_allowed if {
    not time_restricted_data
}

temporal_access_allowed if {
    time_restricted_data
    current_time := time.now_ns()
    current_time >= input.resource.access_start_time
    current_time <= input.resource.access_end_time
}

time_restricted_data if {
    input.resource.access_start_time != null
}

# Data retention and deletion controls
retention_compliant if {
    not has_retention_policy
}

retention_compliant if {
    has_retention_policy
    current_time := time.now_ns()
    retention_deadline := input.resource.created_at + input.resource.retention_period
    current_time <= retention_deadline
}

has_retention_policy if {
    input.resource.retention_period != null
    input.resource.retention_period > 0
}

# Master data access decision
allow if {
    sufficient_clearance
    pii_access_allowed
    geographic_access_allowed
    temporal_access_allowed
    retention_compliant
    not data_under_investigation
}

# Special case: data under active investigation
data_under_investigation if {
    "under_investigation" in input.resource.tags
}

allow if {
    sufficient_clearance
    pii_access_allowed
    geographic_access_allowed
    temporal_access_allowed
    retention_compliant
    data_under_investigation
    input.user.role in ["investigator", "supervisor", "admin"]
    investigation_authorized
}

investigation_authorized if {
    input.request.investigation_id != ""
    input.user.id in input.request.investigation.assigned_users
}

# Data export restrictions
export_allowed if {
    allow  # Must pass all other checks first
    input.action == "data:export"
    export_jurisdiction_compliant
    export_format_approved
}

export_jurisdiction_compliant if {
    input.resource.export_restrictions == null
}

export_jurisdiction_compliant if {
    input.resource.export_restrictions != null
    input.request.destination_country in input.resource.export_restrictions.allowed_countries
}

export_format_approved if {
    input.request.export_format in ["csv", "json", "pdf"]
    input.request.export_format != "raw"  # Prevent raw data export
}

# Audit requirements for sensitive data access
audit_required if {
    input.resource.classification in ["restricted", "classified"]
}

audit_required if {
    contains_pii
}

audit_required if {
    input.action == "data:export"
}

# Generate audit context for logging
audit_context := {
    "classification": input.resource.classification,
    "contains_pii": contains_pii,
    "user_clearance": user_clearance[input.user.role],
    "action_taken": input.action,
    "justification": input.request.justification,
    "timestamp": time.now_ns()
} if audit_required