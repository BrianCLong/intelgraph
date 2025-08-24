"use strict";
/**
 * Production Security Configuration for IntelGraph
 *
 * This module configures all security middleware and policies for production deployment.
 * Based on NIST security guidelines and GraphQL security best practices.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecurityConfig = exports.graphqlSecurityConfig = exports.applyProductionSecurity = exports.requireRole = exports.productionAuthMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const security_js_1 = require("../middleware/security.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Production JWT Authentication Middleware
 * Replaces the simulation auth with proper JWT validation
 */
const productionAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        logger_js_1.default.warn(`Authentication failed: No token provided. IP: ${req.ip}, Path: ${req.path}`);
        res.status(401).json({
            error: 'Authentication required',
            message: 'No access token provided'
        });
        return;
    }
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger_js_1.default.error('JWT_SECRET environment variable not set');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Check token expiration
        if (decoded.exp < Date.now() / 1000) {
            logger_js_1.default.warn(`Authentication failed: Token expired. User: ${decoded.email}, IP: ${req.ip}`);
            res.status(401).json({
                error: 'Token expired',
                message: 'Access token has expired'
            });
            return;
        }
        // Attach user data to request
        req.user = decoded;
        logger_js_1.default.info(`Authentication successful. User: ${decoded.email}, Role: ${decoded.role}, IP: ${req.ip}`);
        next();
    }
    catch (error) {
        logger_js_1.default.warn(`Authentication failed: Invalid token. IP: ${req.ip}, Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        res.status(401).json({
            error: 'Invalid token',
            message: 'Access token is invalid or malformed'
        });
        return;
    }
};
exports.productionAuthMiddleware = productionAuthMiddleware;
/**
 * Role-based authorization middleware
 */
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const userRole = req.user.role;
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        if (!roles.includes(userRole) && userRole !== 'admin') {
            logger_js_1.default.warn(`Authorization failed: Insufficient permissions. User: ${req.user.email}, Role: ${userRole}, Required: ${roles.join(', ')}, IP: ${req.ip}`);
            res.status(403).json({
                error: 'Insufficient permissions',
                message: `Required role: ${roles.join(' or ')}`
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Apply all production security middleware to Express app
 */
const applyProductionSecurity = (app) => {
    logger_js_1.default.info('Applying production security configuration');
    // 1. Security Headers - Apply first
    app.use(security_js_1.securityHeaders);
    // 2. CORS Configuration - Strict origins in production
    const corsOptions = {
        ...security_js_1.corsConfig,
        origin: (origin, callback) => {
            const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.intelgraph.com'];
            // In production, be stricter about origins
            if (process.env.NODE_ENV === 'production') {
                if (!origin || !allowedOrigins.includes(origin)) {
                    logger_js_1.default.warn(`CORS blocked: Unauthorized origin ${origin}`);
                    return callback(new Error('Not allowed by CORS'));
                }
            }
            callback(null, true);
        }
    };
    app.use((0, cors_1.default)(corsOptions));
    // 3. Request Logging
    app.use(security_js_1.requestLogger);
    // 4. Request Validation - Check for malicious patterns
    app.use(security_js_1.validateRequest);
    // 5. Request Size Limiting
    app.use((0, security_js_1.requestSizeLimiter)('10mb'));
    // 6. Rate Limiting Configuration
    const rateLimitConfig = {
        // General API rate limit
        general: (0, security_js_1.createRateLimiter)(15 * 60 * 1000, // 15 minutes
        process.env.NODE_ENV === 'production' ? 500 : 1000, // Stricter in prod
        'Too many requests from this IP'),
        // GraphQL specific limits
        graphql: (0, security_js_1.createRateLimiter)(60 * 1000, // 1 minute
        process.env.NODE_ENV === 'production' ? 30 : 100, // Stricter in prod
        'Too many GraphQL requests'),
        // Authentication endpoints
        auth: security_js_1.authRateLimiter,
        // AI/ML endpoints
        ai: security_js_1.aiRateLimiter,
        // Admin endpoints
        admin: security_js_1.strictRateLimiter
    };
    // Apply rate limiting to specific routes
    app.use('/api/auth', rateLimitConfig.auth);
    app.use('/graphql', rateLimitConfig.graphql);
    app.use('/api/ai', rateLimitConfig.ai);
    app.use('/api/admin', rateLimitConfig.admin);
    app.use(rateLimitConfig.general); // General rate limit for all other routes
    logger_js_1.default.info('Production security middleware applied successfully');
};
exports.applyProductionSecurity = applyProductionSecurity;
/**
 * GraphQL Security Configuration
 */
exports.graphqlSecurityConfig = {
    // Disable introspection in production
    introspection: process.env.NODE_ENV !== 'production',
    // Disable playground in production  
    playground: process.env.NODE_ENV !== 'production',
    // Query complexity analysis
    validationRules: [
    // Depth limiting (already configured in app.ts)
    // Query complexity limiting would go here
    ],
    // Context security
    context: ({ req }) => ({
        user: req.user,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    })
};
/**
 * Environment-specific security settings
 */
const getSecurityConfig = () => {
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';
    return {
        // JWT Configuration
        jwt: {
            secret: process.env.JWT_SECRET,
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            expiresIn: isProd ? '15m' : '24h', // Shorter in production
            refreshExpiresIn: isProd ? '7d' : '30d'
        },
        // Rate Limiting
        rateLimits: {
            general: isProd ? 500 : 1000,
            graphql: isProd ? 30 : 100,
            auth: isProd ? 3 : 10,
            ai: isProd ? 5 : 20
        },
        // CORS
        cors: {
            origins: isProd
                ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.intelgraph.com'])
                : ['http://localhost:3000', 'http://localhost:5173'],
            credentials: true
        },
        // Security Headers
        hsts: isProd ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        } : false,
        // Feature Flags
        features: {
            persistedQueries: isProd, // Only in production
            queryComplexityAnalysis: isProd,
            auditLogging: true,
            ipWhitelisting: isProd
        }
    };
};
exports.getSecurityConfig = getSecurityConfig;
//# sourceMappingURL=production-security.js.map