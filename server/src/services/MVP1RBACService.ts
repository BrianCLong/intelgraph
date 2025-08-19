import { getPostgresClient } from '../db/postgres';
import { getNeo4jDriver } from '../db/neo4j';
import { isFeatureEnabled } from '../config/mvp1-features';
import pino from 'pino';

const logger = pino();

// Fine-grained permissions for MVP-1+
export enum Permission {
  // Entity permissions
  ENTITY_READ = 'entity:read',
  ENTITY_CREATE = 'entity:create',
  ENTITY_UPDATE = 'entity:update',
  ENTITY_DELETE = 'entity:delete',
  ENTITY_BULK_IMPORT = 'entity:bulk_import',
  
  // Investigation permissions
  INVESTIGATION_READ = 'investigation:read',
  INVESTIGATION_CREATE = 'investigation:create',
  INVESTIGATION_UPDATE = 'investigation:update',
  INVESTIGATION_DELETE = 'investigation:delete',
  INVESTIGATION_SHARE = 'investigation:share',
  INVESTIGATION_ARCHIVE = 'investigation:archive',
  
  // Relationship permissions
  RELATIONSHIP_READ = 'relationship:read',
  RELATIONSHIP_CREATE = 'relationship:create',
  RELATIONSHIP_UPDATE = 'relationship:update',
  RELATIONSHIP_DELETE = 'relationship:delete',
  
  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_RUN = 'analytics:run',
  ANALYTICS_EXPORT = 'analytics:export',
  
  // Export permissions
  EXPORT_CSV = 'export:csv',
  EXPORT_JSON = 'export:json',
  EXPORT_PDF = 'export:pdf',
  
  // AI/Copilot permissions
  AI_QUERY = 'ai:query',
  AI_SUGGEST = 'ai:suggest',
  AI_ADMIN = 'ai:admin',
  
  // User management permissions
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_IMPERSONATE = 'user:impersonate',
  
  // Tenant management permissions
  TENANT_READ = 'tenant:read',
  TENANT_CREATE = 'tenant:create',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  
  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
  SYSTEM_CONFIG = 'system:config',
  
  // Audit permissions
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export'
}

// Resource types for permission checking
export enum ResourceType {
  ENTITY = 'entity',
  INVESTIGATION = 'investigation',
  RELATIONSHIP = 'relationship',
  USER = 'user',
  TENANT = 'tenant',
  SYSTEM = 'system'
}

// Enhanced roles with fine-grained permissions
export enum Role {
  VIEWER = 'viewer',           // Read-only access
  ANALYST = 'analyst',         // Read + basic analysis
  EDITOR = 'editor',           // Read + Write operations
  INVESTIGATOR = 'investigator', // Full investigation access
  ADMIN = 'admin',            // Full access within tenant
  SUPER_ADMIN = 'super_admin' // Cross-tenant admin
}

interface User {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  permissions?: Permission[];
  isActive: boolean;
}

interface PermissionContext {
  user: User;
  resource?: {
    type: ResourceType;
    id?: string;
    tenantId?: string;
    investigationId?: string;
    ownerId?: string;
  };
  action: Permission;
}

interface AuditEvent {
  id?: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  action: string;
  resourceType: ResourceType;
  resourceId?: string;
  resourceData?: any;
  oldValues?: any;
  newValues?: any;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  investigationId?: string;
  sessionId?: string;
}

export class MVP1RBACService {
  private postgresClient = getPostgresClient();
  private neo4jDriver = getNeo4jDriver();

  // Role-based permission mapping
  private readonly rolePermissions: Record<Role, Permission[]> = {
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

  /**
   * Check if user has permission for a specific action on a resource
   */
  async hasPermission(context: PermissionContext): Promise<boolean> {
    try {
      // Skip RBAC if feature flag is disabled
      if (!isFeatureEnabled('RBAC_FINE_GRAINED')) {
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

    } catch (error) {
      logger.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user based on their role
   */
  private getUserPermissions(user: User): Permission[] {
    // Custom permissions override role permissions
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions;
    }

    return this.rolePermissions[user.role] || [];
  }

  /**
   * Check resource-specific permissions (tenant isolation, ownership, etc.)
   */
  private async checkResourcePermission(
    user: User, 
    resource: PermissionContext['resource'], 
    action: Permission
  ): Promise<boolean> {
    if (!resource) return true;

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
  private async checkInvestigationPermission(
    user: User, 
    resource: PermissionContext['resource'], 
    action: Permission
  ): Promise<boolean> {
    if (!resource?.id) return true;

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

    } catch (error) {
      logger.error('Investigation permission check failed:', error);
      return false;
    }
  }

  /**
   * Check entity-specific permissions
   */
  private async checkEntityPermission(
    user: User, 
    resource: PermissionContext['resource'], 
    action: Permission
  ): Promise<boolean> {
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
  private async checkUserPermission(
    user: User, 
    resource: PermissionContext['resource'], 
    action: Permission
  ): Promise<boolean> {
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
  async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!isFeatureEnabled('AUDIT_TRAIL')) {
      return;
    }

    try {
      const auditEvent: AuditEvent = {
        ...event,
        timestamp: new Date()
      };

      // Store in PostgreSQL (primary audit store)
      await this.storeAuditEventPostgres(auditEvent);

      // Mirror to Neo4j for graph analysis (optional)
      await this.mirrorAuditEventNeo4j(auditEvent);

    } catch (error) {
      logger.error('Failed to record audit event:', error);
      // Don't throw - audit failure shouldn't break business operations
    }
  }

  /**
   * Store audit event in PostgreSQL (immutable)
   */
  private async storeAuditEventPostgres(event: AuditEvent): Promise<void> {
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
  private async mirrorAuditEventNeo4j(event: AuditEvent): Promise<void> {
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

    } finally {
      await session.close();
    }
  }

  /**
   * Query audit trail with filters
   */
  async getAuditEvents(filters: {
    userId?: string;
    tenantId: string;
    resourceType?: ResourceType;
    resourceId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AuditEvent[]> {
    let query = `
      SELECT * FROM audit_events
      WHERE tenant_id = $1
    `;
    
    const params: any[] = [filters.tenantId];
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
  async checkPermissions(
    user: User,
    permissions: Array<{
      action: Permission;
      resource?: PermissionContext['resource'];
    }>
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

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

export default MVP1RBACService;