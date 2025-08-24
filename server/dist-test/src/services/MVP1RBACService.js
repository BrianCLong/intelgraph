"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MVP1RBACService = exports.Role = exports.ResourceType = exports.Permission = void 0;
const postgres_1 = require("../db/postgres");
const neo4j_1 = require("../db/neo4j");
const mvp1_features_1 = require("../config/mvp1-features");
const logger = logger.child({ name: 'MVP1RBACService' });
// Fine-grained permissions for MVP-1+
var Permission;
(function (Permission) {
    // Entity permissions
    Permission["ENTITY_READ"] = "entity:read";
    Permission["ENTITY_CREATE"] = "entity:create";
    Permission["ENTITY_UPDATE"] = "entity:update";
    Permission["ENTITY_DELETE"] = "entity:delete";
    Permission["ENTITY_BULK_IMPORT"] = "entity:bulk_import";
    // Investigation permissions
    Permission["INVESTIGATION_READ"] = "investigation:read";
    Permission["INVESTIGATION_CREATE"] = "investigation:create";
    Permission["INVESTIGATION_UPDATE"] = "investigation:update";
    Permission["INVESTIGATION_DELETE"] = "investigation:delete";
    Permission["INVESTIGATION_SHARE"] = "investigation:share";
    Permission["INVESTIGATION_ARCHIVE"] = "investigation:archive";
    // Relationship permissions
    Permission["RELATIONSHIP_READ"] = "relationship:read";
    Permission["RELATIONSHIP_CREATE"] = "relationship:create";
    Permission["RELATIONSHIP_UPDATE"] = "relationship:update";
    Permission["RELATIONSHIP_DELETE"] = "relationship:delete";
    // Analytics permissions
    Permission["ANALYTICS_READ"] = "analytics:read";
    Permission["ANALYTICS_RUN"] = "analytics:run";
    Permission["ANALYTICS_EXPORT"] = "analytics:export";
    // Export permissions
    Permission["EXPORT_CSV"] = "export:csv";
    Permission["EXPORT_JSON"] = "export:json";
    Permission["EXPORT_PDF"] = "export:pdf";
    // AI/Copilot permissions
    Permission["AI_QUERY"] = "ai:query";
    Permission["AI_SUGGEST"] = "ai:suggest";
    Permission["AI_ADMIN"] = "ai:admin";
    // User management permissions
    Permission["USER_READ"] = "user:read";
    Permission["USER_CREATE"] = "user:create";
    Permission["USER_UPDATE"] = "user:update";
    Permission["USER_DELETE"] = "user:delete";
    Permission["USER_IMPERSONATE"] = "user:impersonate";
    // Tenant management permissions
    Permission["TENANT_READ"] = "tenant:read";
    Permission["TENANT_CREATE"] = "tenant:create";
    Permission["TENANT_UPDATE"] = "tenant:update";
    Permission["TENANT_DELETE"] = "tenant:delete";
    // System permissions
    Permission["SYSTEM_ADMIN"] = "system:admin";
    Permission["SYSTEM_MONITOR"] = "system:monitor";
    Permission["SYSTEM_CONFIG"] = "system:config";
    // Audit permissions
    Permission["AUDIT_READ"] = "audit:read";
    Permission["AUDIT_EXPORT"] = "audit:export";
})(Permission || (exports.Permission = Permission = {}));
// Resource types for permission checking
var ResourceType;
(function (ResourceType) {
    ResourceType["ENTITY"] = "entity";
    ResourceType["INVESTIGATION"] = "investigation";
    ResourceType["RELATIONSHIP"] = "relationship";
    ResourceType["USER"] = "user";
    ResourceType["TENANT"] = "tenant";
    ResourceType["SYSTEM"] = "system";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
// Enhanced roles with fine-grained permissions
var Role;
(function (Role) {
    Role["VIEWER"] = "viewer";
    Role["ANALYST"] = "analyst";
    Role["EDITOR"] = "editor";
    Role["INVESTIGATOR"] = "investigator";
    Role["ADMIN"] = "admin";
    Role["SUPER_ADMIN"] = "super_admin"; // Cross-tenant admin
})(Role || (exports.Role = Role = {}));
class MVP1RBACService {
    constructor() {
        this.postgresClient = (0, postgres_1.getPostgresClient)();
        this.neo4jDriver = (0, neo4j_1.getNeo4jDriver)();
        // Role-based permission mapping
        this.rolePermissions = {
            [Role.VIEWER]: [
                Permission.ENTITY_READ,
                Permission.INVESTIGATION_READ,
                Permission.RELATIONSHIP_READ,
                Permission.ANALYTICS_READ,
                Permission.EXPORT_CSV
            ],
            [Role.ANALYST]: [
                ...this.rolePermissions[Role.VIEWER],
                Permission.ANALYTICS_RUN,
                Permission.ANALYTICS_EXPORT,
                Permission.AI_QUERY,
                Permission.EXPORT_JSON
            ],
            [Role.EDITOR]: [
                ...this.rolePermissions[Role.ANALYST],
                Permission.ENTITY_CREATE,
                Permission.ENTITY_UPDATE,
                Permission.RELATIONSHIP_CREATE,
                Permission.RELATIONSHIP_UPDATE,
                Permission.INVESTIGATION_CREATE,
                Permission.INVESTIGATION_UPDATE,
                Permission.AI_SUGGEST
            ],
            [Role.INVESTIGATOR]: [
                ...this.rolePermissions[Role.EDITOR],
                Permission.ENTITY_DELETE,
                Permission.RELATIONSHIP_DELETE,
                Permission.INVESTIGATION_DELETE,
                Permission.INVESTIGATION_SHARE,
                Permission.INVESTIGATION_ARCHIVE,
                Permission.ENTITY_BULK_IMPORT,
                Permission.EXPORT_PDF,
                Permission.AI_ADMIN
            ],
            [Role.ADMIN]: [
                ...this.rolePermissions[Role.INVESTIGATOR],
                Permission.USER_READ,
                Permission.USER_CREATE,
                Permission.USER_UPDATE,
                Permission.TENANT_READ,
                Permission.TENANT_UPDATE,
                Permission.AUDIT_READ,
                Permission.SYSTEM_MONITOR
            ],
            [Role.SUPER_ADMIN]: [
                ...Object.values(Permission) // All permissions
            ]
        };
    }
    /**
     * Check if user has permission for a specific action on a resource
     */
    async hasPermission(context) {
        try {
            // Skip RBAC if feature flag is disabled
            if (!(0, mvp1_features_1.isFeatureEnabled)('RBAC_FINE_GRAINED')) {
                return true;
            }
            const { user, resource, action } = context;
            // Super admin has all permissions
            if (user.role === Role.SUPER_ADMIN) {
                return true;
            }
            // Check if user is active
            if (!user.isActive) {
                return false;
            }
            // Get user's permissions based on role
            const userPermissions = this.getUserPermissions(user);
            if (!userPermissions.includes(action)) {
                return false;
            }
            // Resource-level permission checks
            if (resource) {
                return await this.checkResourcePermission(user, resource, action);
            }
            return true;
        }
        catch (error) {
            logger.error('Permission check failed:', error);
            return false;
        }
    }
    /**
     * Get all permissions for a user based on their role
     */
    getUserPermissions(user) {
        // Custom permissions override role permissions
        if (user.permissions && user.permissions.length > 0) {
            return user.permissions;
        }
        return this.rolePermissions[user.role] || [];
    }
    /**
     * Check resource-specific permissions (tenant isolation, ownership, etc.)
     */
    async checkResourcePermission(user, resource, action) {
        if (!resource)
            return true;
        // Tenant isolation check (except for super admin)
        if (user.role !== Role.SUPER_ADMIN && resource.tenantId && resource.tenantId !== user.tenantId) {
            return false;
        }
        // Resource ownership checks
        switch (resource.type) {
            case ResourceType.INVESTIGATION:
                return await this.checkInvestigationPermission(user, resource, action);
            case ResourceType.ENTITY:
                return await this.checkEntityPermission(user, resource, action);
            case ResourceType.USER:
                return await this.checkUserPermission(user, resource, action);
            default:
                return true;
        }
    }
    /**
     * Check investigation-specific permissions
     */
    async checkInvestigationPermission(user, resource, action) {
        if (!resource?.id)
            return true;
        try {
            const query = `
        SELECT 
          created_by, 
          assigned_to,
          shared_with,
          status
        FROM investigations 
        WHERE id = $1 AND tenant_id = $2
      `;
            const result = await this.postgresClient.query(query, [resource.id, user.tenantId]);
            if (result.rows.length === 0) {
                return false; // Investigation not found or not in user's tenant
            }
            const investigation = result.rows[0];
            // Creator has full access
            if (investigation.created_by === user.id) {
                return true;
            }
            // Assigned users have edit access
            const assignedUsers = investigation.assigned_to || [];
            if (assignedUsers.includes(user.id)) {
                return ![Permission.INVESTIGATION_DELETE, Permission.INVESTIGATION_ARCHIVE].includes(action);
            }
            // Shared users have read access only
            const sharedUsers = investigation.shared_with || [];
            if (sharedUsers.includes(user.id)) {
                return [Permission.INVESTIGATION_READ, Permission.ENTITY_READ, Permission.RELATIONSHIP_READ].includes(action);
            }
            // Admins can access all investigations in their tenant
            return [Role.ADMIN, Role.SUPER_ADMIN].includes(user.role);
        }
        catch (error) {
            logger.error('Investigation permission check failed:', error);
            return false;
        }
    }
    /**
     * Check entity-specific permissions
     */
    async checkEntityPermission(user, resource, action) {
        // Entity permissions typically follow investigation permissions
        if (resource?.investigationId) {
            return await this.checkInvestigationPermission(user, {
                type: ResourceType.INVESTIGATION,
                id: resource.investigationId,
                tenantId: resource.tenantId
            }, action);
        }
        return true;
    }
    /**
     * Check user management permissions
     */
    async checkUserPermission(user, resource, action) {
        // Users can only manage other users in their tenant (except super admin)
        if (user.role === Role.SUPER_ADMIN) {
            return true;
        }
        // Users can view themselves
        if (action === Permission.USER_READ && resource?.id === user.id) {
            return true;
        }
        // Only admins can manage users
        return user.role === Role.ADMIN;
    }
    /**
     * Record audit event (immutable append-only log)
     */
    async recordAuditEvent(event) {
        if (!(0, mvp1_features_1.isFeatureEnabled)('AUDIT_TRAIL')) {
            return;
        }
        try {
            const auditEvent = {
                ...event,
                timestamp: new Date()
            };
            // Store in PostgreSQL (primary audit store)
            await this.storeAuditEventPostgres(auditEvent);
            // Mirror to Neo4j for graph analysis (optional)
            await this.mirrorAuditEventNeo4j(auditEvent);
        }
        catch (error) {
            logger.error('Failed to record audit event:', error);
            // Don't throw - audit failure shouldn't break business operations
        }
    }
    /**
     * Store audit event in PostgreSQL (immutable)
     */
    async storeAuditEventPostgres(event) {
        const query = `
      INSERT INTO audit_events (
        user_id, user_email, tenant_id, action, resource_type, resource_id,
        resource_data, old_values, new_values, success, error_message,
        ip_address, user_agent, investigation_id, session_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;
        await this.postgresClient.query(query, [
            event.userId,
            event.userEmail,
            event.tenantId,
            event.action,
            event.resourceType,
            event.resourceId,
            JSON.stringify(event.resourceData),
            JSON.stringify(event.oldValues),
            JSON.stringify(event.newValues),
            event.success,
            event.errorMessage,
            event.ipAddress,
            event.userAgent,
            event.investigationId,
            event.sessionId,
            event.timestamp
        ]);
    }
    /**
     * Mirror audit event to Neo4j for relationship analysis
     */
    async mirrorAuditEventNeo4j(event) {
        const session = this.neo4jDriver.session();
        try {
            const query = `
        MERGE (u:User {id: $userId, tenantId: $tenantId})
        CREATE (a:AuditEvent {
          id: apoc.create.uuid(),
          userId: $userId,
          action: $action,
          resourceType: $resourceType,
          resourceId: $resourceId,
          success: $success,
          timestamp: datetime($timestamp),
          tenantId: $tenantId
        })
        CREATE (u)-[:PERFORMED]->(a)
        
        // Link to investigation if present
        WITH a
        WHERE $investigationId IS NOT NULL
        MATCH (i:Investigation {id: $investigationId, tenantId: $tenantId})
        CREATE (a)-[:RELATES_TO]->(i)
        
        RETURN a.id as auditId
      `;
            await session.run(query, {
                userId: event.userId,
                tenantId: event.tenantId,
                action: event.action,
                resourceType: event.resourceType,
                resourceId: event.resourceId,
                success: event.success,
                timestamp: event.timestamp.toISOString(),
                investigationId: event.investigationId
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Query audit trail with filters
     */
    async getAuditEvents(filters) {
        let query = `
      SELECT * FROM audit_events
      WHERE tenant_id = $1
    `;
        const params = [filters.tenantId];
        let paramIndex = 2;
        if (filters.userId) {
            query += ` AND user_id = $${paramIndex++}`;
            params.push(filters.userId);
        }
        if (filters.resourceType) {
            query += ` AND resource_type = $${paramIndex++}`;
            params.push(filters.resourceType);
        }
        if (filters.resourceId) {
            query += ` AND resource_id = $${paramIndex++}`;
            params.push(filters.resourceId);
        }
        if (filters.action) {
            query += ` AND action = $${paramIndex++}`;
            params.push(filters.action);
        }
        if (filters.startDate) {
            query += ` AND timestamp >= $${paramIndex++}`;
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND timestamp <= $${paramIndex++}`;
            params.push(filters.endDate);
        }
        if (filters.success !== undefined) {
            query += ` AND success = $${paramIndex++}`;
            params.push(filters.success);
        }
        query += ` ORDER BY timestamp DESC`;
        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            params.push(filters.limit);
        }
        if (filters.offset) {
            query += ` OFFSET $${paramIndex++}`;
            params.push(filters.offset);
        }
        const result = await this.postgresClient.query(query, params);
        return result.rows;
    }
    /**
     * Check multiple permissions at once (for performance)
     */
    async checkPermissions(user, permissions) {
        const results = {};
        for (const perm of permissions) {
            const key = `${perm.action}:${perm.resource?.type || 'global'}:${perm.resource?.id || 'all'}`;
            results[key] = await this.hasPermission({
                user,
                action: perm.action,
                resource: perm.resource
            });
        }
        return results;
    }
}
exports.MVP1RBACService = MVP1RBACService;
exports.default = MVP1RBACService;
//# sourceMappingURL=MVP1RBACService.js.map