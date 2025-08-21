/**
 * IntelGraph Authentication Middleware
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { logger } from '../utils/logger.js';
import { redisClient } from '../db/redis.js';
import { postgresPool } from '../db/postgres.js';

interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  tenant_id?: string;
  role?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
  permissions: string[];
}

// JWKS client for OIDC token verification
const jwksClientInstance = jwksClient({
  jwksUri: process.env.OIDC_JWKS_URI || 'https://auth.intelgraph.com/.well-known/jwks.json',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

async function getSigningKey(kid: string): Promise<string> {
  const key = await jwksClientInstance.getSigningKey(kid);
  return key.getPublicKey();
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // Check token blacklist
    const isBlacklisted = await redisClient.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({
        error: 'Token has been revoked',
        code: 'AUTH_TOKEN_REVOKED'
      });
      return;
    }

    // Decode token header to get key ID
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) {
      res.status(401).json({
        error: 'Invalid token format',
        code: 'AUTH_TOKEN_INVALID'
      });
      return;
    }

    // Get public key for verification
    const signingKey = await getSigningKey(decodedHeader.header.kid);
    
    // Verify token
    const payload = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      audience: process.env.OIDC_AUDIENCE || 'intelgraph-api',
      issuer: process.env.OIDC_ISSUER || 'https://auth.intelgraph.com'
    }) as JWTPayload;

    // Check if user exists and is active
    const user = await getUserFromDatabase(payload.sub, payload.email);
    if (!user) {
      res.status(401).json({
        error: 'User not found or inactive',
        code: 'AUTH_USER_NOT_FOUND'
      });
      return;
    }

    // Attach user to request
    (req as any).user = user;
    (req as any).token = token;

    // Update last active timestamp
    await updateUserLastActive(user.id);

    // Log successful authentication
    logger.info({
      message: 'User authenticated successfully',
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();

  } catch (error) {
    logger.error({
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : String(error),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token has expired',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'AUTH_TOKEN_INVALID'
      });
    } else {
      res.status(401).json({
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  }
}

async function getUserFromDatabase(
  externalId: string,
  email: string
): Promise<AuthenticatedUser | null> {
  try {
    // Try to find user by external ID first
    let user = await postgresPool.findOne('users', {
      external_id: externalId,
      is_active: true
    });

    // Fallback to email if external ID not found (for migration scenarios)
    if (!user) {
      user = await postgresPool.findOne('users', {
        email: email,
        is_active: true
      });
    }

    if (!user) {
      return null;
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.id, user.role);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenant_id,
      role: user.role,
      permissions
    };

  } catch (error) {
    logger.error({
      message: 'Failed to fetch user from database',
      externalId,
      email,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function getUserPermissions(userId: string, role: string): Promise<string[]> {
  try {
    // Get permissions from cache first
    const cacheKey = `user:permissions:${userId}`;
    const cachedPermissions = await redisClient.get<string[]>(cacheKey);
    
    if (cachedPermissions) {
      return cachedPermissions;
    }

    // Base permissions by role
    const basePermissions: Record<string, string[]> = {
      'viewer': [
        'entity:read',
        'relationship:read',
        'investigation:read',
        'copilot:query'
      ],
      'analyst': [
        'entity:read', 'entity:create', 'entity:update',
        'relationship:read', 'relationship:create', 'relationship:update',
        'investigation:read', 'investigation:create', 'investigation:update',
        'analytics:run',
        'copilot:query'
      ],
      'investigator': [
        'entity:read', 'entity:create', 'entity:update',
        'relationship:read', 'relationship:create', 'relationship:update',
        'investigation:read', 'investigation:create', 'investigation:update',
        'analytics:run', 'analytics:export',
        'copilot:query',
        'data:export'
      ],
      'supervisor': [
        'entity:read', 'entity:create', 'entity:update', 'entity:delete',
        'relationship:read', 'relationship:create', 'relationship:update', 'relationship:delete',
        'investigation:read', 'investigation:create', 'investigation:update', 'investigation:delete',
        'analytics:run', 'analytics:export',
        'copilot:query',
        'data:export',
        'audit:read',
        'user:read'
      ],
      'admin': [
        '*:*' // Admin has all permissions
      ]
    };

    const permissions = basePermissions[role] || basePermissions['viewer'];

    // Cache permissions for 15 minutes
    await redisClient.set(cacheKey, permissions, 900);

    return permissions;

  } catch (error) {
    logger.error({
      message: 'Failed to get user permissions',
      userId,
      role,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return minimal permissions on error
    return ['entity:read'];
  }
}

async function updateUserLastActive(userId: string): Promise<void> {
  try {
    await postgresPool.update('users', 
      { last_active_at: new Date() },
      { id: userId }
    );
  } catch (error) {
    // Don't fail auth if we can't update last active time
    logger.warn({
      message: 'Failed to update user last active time',
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Middleware to check specific permissions
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthenticatedUser;
    
    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Admin wildcard check
    if (user.permissions.includes('*:*')) {
      next();
      return;
    }

    // Specific permission check
    if (user.permissions.includes(permission)) {
      next();
      return;
    }

    // Wildcard permission check (e.g., "entity:*" allows "entity:read")
    const [resource, action] = permission.split(':');
    const wildcardPermission = `${resource}:*`;
    
    if (user.permissions.includes(wildcardPermission)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Insufficient permissions',
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
      required: permission
    });
  };
}

// Token revocation endpoint
export async function revokeToken(req: Request, res: Response): Promise<void> {
  try {
    const token = (req as any).token;
    const user = (req as any).user;
    
    if (!token) {
      res.status(400).json({
        error: 'No token to revoke',
        code: 'AUTH_NO_TOKEN'
      });
      return;
    }

    // Add token to blacklist with expiration matching token expiration
    const decoded = jwt.decode(token) as JWTPayload;
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const ttlSeconds = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
    
    await redisClient.set(`blacklist:${token}`, 'revoked', ttlSeconds);

    logger.info({
      message: 'Token revoked successfully',
      userId: user.id,
      tokenExp: expirationTime
    });

    res.json({
      message: 'Token revoked successfully'
    });

  } catch (error) {
    logger.error({
      message: 'Failed to revoke token',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to revoke token',
      code: 'AUTH_REVOKE_FAILED'
    });
  }
}