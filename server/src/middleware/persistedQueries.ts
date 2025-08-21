/**
 * Persisted Queries Middleware
 * 
 * Enforces persisted query allowlist in production and provides
 * development-friendly mode for local development.
 */

import { Request, Response, NextFunction } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import logger from '../config/logger';

const logger = logger.child({ name: 'persistedQueries' });

interface PersistedQueriesConfig {
  manifestDirectory?: string;
  enforceInProduction: boolean;
  allowIntrospection: boolean;
  allowPlayground: boolean;
}

interface GraphQLRequest {
  query?: string;
  operationName?: string;
  variables?: Record<string, any>;
  extensions?: {
    persistedQuery?: {
      version: number;
      sha256Hash: string;
    };
  };
  id?: string; // Direct query ID
}

export class PersistedQueriesMiddleware {
  private manifests: Map<string, Record<string, string>> = new Map();
  private config: PersistedQueriesConfig;
  private isProduction: boolean;

  constructor(config: Partial<PersistedQueriesConfig> = {}) {
    this.isProduction = process.env.NODE_ENV === 'production';

    this.config = {
      manifestDirectory: config.manifestDirectory || join(process.cwd(), 'persisted-operations'),
      enforceInProduction: config.enforceInProduction ?? true,
      allowIntrospection: config.allowIntrospection ?? !this.isProduction,
      allowPlayground: config.allowPlayground ?? !this.isProduction
    };
  }

  /**
   * Load persisted queries manifest for a tenant
   */
  private loadManifest(tenantId: string): Record<string, string> {
    if (this.manifests.has(tenantId)) {
      return this.manifests.get(tenantId)!;
    }

    const path = join(this.config.manifestDirectory!, `${tenantId}.json`);
    try {
      if (existsSync(path)) {
        const content = readFileSync(path, 'utf8');
        const manifest = JSON.parse(content);
        this.manifests.set(tenantId, manifest);
        logger.info(`Persisted queries manifest loaded`, { tenantId, operations: Object.keys(manifest).length });
        return manifest;
      }
      logger.warn(`Persisted queries manifest not found`, { tenantId });
      this.manifests.set(tenantId, {});
      return {};
    } catch (error) {
      logger.error(`Failed to load persisted queries manifest`, { tenantId, error: error instanceof Error ? error.message : 'Unknown error' });
      this.manifests.set(tenantId, {});
      return {};
    }
  }

  /**
   * Express middleware for persisted query enforcement
   */
  middleware = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip non-GraphQL requests
      if (!this.isGraphQLRequest(req)) {
        return next();
      }

      // Development mode - allow all queries but log warnings
      if (!this.isProduction && !this.config.enforceInProduction) {
        this.handleDevelopmentMode(req);
        return next();
      }

      // Production mode - enforce allowlist
      try {
        this.enforcePersistedQueries(req, res, next);
      } catch (error) {
        logger.error(`Persisted query enforcement failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}, Path: ${req.path}`);
        
        res.status(500).json({
          errors: [{
            message: 'Internal server error',
            extensions: { code: 'INTERNAL_ERROR' }
          }]
        });
      }
    };
  };

  /**
   * Check if request is a GraphQL request
   */
  private isGraphQLRequest(req: Request): boolean {
    return req.path === '/graphql' || req.path.includes('graphql');
  }

  /**
   * Handle development mode (allow all but warn about non-persisted)
   */
  private handleDevelopmentMode(req: Request): void {
    const body = req.body as GraphQLRequest;
    const tenantId = (req.headers['x-tenant-id'] as string) || 'unknown';
    const manifest = this.loadManifest(tenantId);

    if (body.query && !this.isQueryInManifest(body.query, manifest)) {
      logger.warn(`Non-persisted query in development mode. Operation Name: ${body.operationName}, Query Hash: ${this.hashQuery(body.query).substring(0, 8)}, Tenant: ${tenantId}`);
    }
  }

  /**
   * Enforce persisted queries in production
   */
  private enforcePersistedQueries(req: Request, res: Response, next: NextFunction): void {
    const body = req.body as GraphQLRequest;
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return this.rejectRequest(res, 'Tenant header required');
    }
    const manifest = this.loadManifest(tenantId);
    if (Object.keys(manifest).length === 0) {
      return this.rejectRequest(res, 'Unknown tenant', { tenantId });
    }

    // Handle introspection queries
    if (this.isIntrospectionQuery(body.query)) {
      if (!this.config.allowIntrospection) {
        return this.rejectRequest(res, 'Introspection is disabled');
      }
      return next();
    }

    // Handle Apollo Persisted Queries protocol
    if (body.extensions?.persistedQuery) {
      const hash = body.extensions.persistedQuery.sha256Hash;
      if (manifest[hash]) {
        req.body = { ...body, query: manifest[hash] };
        return next();
      }
      return this.rejectRequest(res, 'Persisted query not found', { hash, tenantId });
    }

    // Handle direct query ID
    if (body.id && manifest[body.id]) {
      req.body = { ...body, query: manifest[body.id] };
      return next();
    }

    // Handle raw queries - only allowed if in manifest
    if (body.query) {
      const queryHash = this.hashQuery(body.query);
      if (manifest[queryHash]) {
        return next();
      }
      return this.rejectRequest(res, 'Query not in persisted operations allowlist', {
        operationName: body.operationName,
        queryHash: queryHash.substring(0, 8),
        tenantId
      });
    }

    // No valid query found
    this.rejectRequest(res, 'No valid query provided');
  }

  /**
   * Check if query is in the manifest
   */
  private isQueryInManifest(query: string, manifest: Record<string, string>): boolean {
    const hash = this.hashQuery(query);
    return !!manifest[hash];
  }

  /**
   * Check if query is an introspection query
   */
  private isIntrospectionQuery(query?: string): boolean {
    if (!query) return false;
    return query.includes('__schema') || query.includes('__type');
  }

  /**
   * Hash a query string for manifest lookup
   */
  private hashQuery(query: string): string {
    return createHash('sha256').update(query.trim()).digest('hex');
  }

  /**
   * Reject a request with appropriate error
   */
  private rejectRequest(res: Response, message: string, metadata?: Record<string, any>): void {
    logger.warn(`Persisted query request rejected. Message: ${message}, Metadata: ${JSON.stringify(metadata)}`);
    
    res.status(403).json({
      errors: [{
        message,
        extensions: {
          code: 'PERSISTED_QUERY_NOT_FOUND',
          ...metadata
        }
      }]
    });
  }

  /**
   * Get middleware statistics
   */
  getStats(): {
    manifestLoaded: boolean;
    operationCount: number;
    isProduction: boolean;
    enforcing: boolean;
  } {
    const operationCount = Array.from(this.manifests.values()).reduce((acc, m) => acc + Object.keys(m).length, 0);
    return {
      manifestLoaded: this.manifests.size > 0,
      operationCount,
      isProduction: this.isProduction,
      enforcing: this.isProduction && this.config.enforceInProduction
    };
  }

  /**
   * Reload manifest (useful for development)
   */
  reloadManifest(): void {
    this.manifests.clear();
  }
}

// Default instance for easy usage
export const persistedQueries = new PersistedQueriesMiddleware();

// Factory function for custom configuration
export function createPersistedQueriesMiddleware(config: Partial<PersistedQueriesConfig> = {}) {
  return new PersistedQueriesMiddleware(config);
}
