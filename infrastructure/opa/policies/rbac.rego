package intelgraph.rbac

import rego.v1

# IntelGraph Role-Based Access Control Policy
# MIT License - Copyright (c) 2025 IntelGraph

# Default deny
default allow := false

# Role hierarchy (higher roles inherit permissions from lower roles)
role_hierarchy := {
    "admin": ["supervisor", "investigator", "analyst", "viewer"],
    "supervisor": ["investigator", "analyst", "viewer"],
    "investigator": ["analyst", "viewer"],
    "analyst": ["viewer"],
    "viewer": []
}

# Check if user has required role or higher
has_role(user_role, required_role) if {
    user_role == required_role
}

has_role(user_role, required_role) if {
    user_role in role_hierarchy
    required_role in role_hierarchy[user_role]
}

# Tenant isolation - users can only access their tenant data
same_tenant if {
    input.user.tenant_id == input.resource.tenant_id
}

# Entity permissions
allow if {
    input.action == "entity:read"
    same_tenant
    has_role(input.user.role, "viewer")
}

allow if {
    input.action == "entity:create"
    same_tenant
    has_role(input.user.role, "analyst")
    not input.resource.restricted
}

allow if {
    input.action == "entity:update"
    same_tenant
    has_role(input.user.role, "analyst")
    input.user.id == input.resource.created_by
}

allow if {
    input.action == "entity:update"
    same_tenant
    has_role(input.user.role, "investigator")
}

allow if {
    input.action == "entity:delete"
    same_tenant
    has_role(input.user.role, "supervisor")
}

# Investigation permissions
allow if {
    input.action == "investigation:read"
    same_tenant
    has_role(input.user.role, "viewer")
    investigation_access_granted
}

investigation_access_granted if {
    # User created the investigation
    input.user.id == input.resource.created_by
}

investigation_access_granted if {
    # User is assigned to the investigation
    input.user.id in input.resource.assigned_to
}

investigation_access_granted if {
    # User has supervisor+ role
    has_role(input.user.role, "supervisor")
}

allow if {
    input.action == "investigation:create"
    same_tenant
    has_role(input.user.role, "analyst")
}

allow if {
    input.action == "investigation:update"
    same_tenant
    has_role(input.user.role, "analyst")
    investigation_access_granted
}

allow if {
    input.action == "investigation:delete"
    same_tenant
    has_role(input.user.role, "supervisor")
}

# Relationship permissions
allow if {
    input.action == "relationship:read"
    same_tenant
    has_role(input.user.role, "viewer")
}

allow if {
    input.action == "relationship:create"
    same_tenant
    has_role(input.user.role, "analyst")
}

allow if {
    input.action == "relationship:update"
    same_tenant
    has_role(input.user.role, "analyst")
    input.user.id == input.resource.created_by
}

allow if {
    input.action == "relationship:update"
    same_tenant
    has_role(input.user.role, "investigator")
}

allow if {
    input.action == "relationship:delete"
    same_tenant
    has_role(input.user.role, "supervisor")
}

# Analytics permissions
allow if {
    input.action == "analytics:run"
    same_tenant
    has_role(input.user.role, "analyst")
}

allow if {
    input.action == "analytics:export"
    same_tenant
    has_role(input.user.role, "investigator")
}

# AI Copilot permissions
allow if {
    input.action == "copilot:query"
    same_tenant
    has_role(input.user.role, "analyst")
    not sensitive_data_access_required
}

sensitive_data_access_required if {
    "pii" in input.resource.data_classifications
}

sensitive_data_access_required if {
    "classified" in input.resource.data_classifications
}

allow if {
    input.action == "copilot:query"
    same_tenant
    has_role(input.user.role, "investigator")
}

# Admin permissions
allow if {
    input.action in ["user:create", "user:update", "user:delete", "tenant:manage"]
    same_tenant
    has_role(input.user.role, "admin")
}

# Audit log access (read-only for compliance)
allow if {
    input.action == "audit:read"
    same_tenant
    has_role(input.user.role, "supervisor")
}

# Data export permissions with justification requirement
allow if {
    input.action == "data:export"
    same_tenant
    has_role(input.user.role, "investigator")
    input.request.justification != ""
    count(input.request.justification) > 10
}

# Emergency access override (requires multi-factor approval)
allow if {
    input.action == "emergency:override"
    same_tenant
    has_role(input.user.role, "admin")
    input.request.emergency_approval == true
    count(input.request.approvers) >= 2
}