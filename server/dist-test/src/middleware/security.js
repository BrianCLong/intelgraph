"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.requestLogger = exports.corsConfig = exports.securityHeaders = exports.validateRequest = exports.apiKeyAuth = exports.ipWhitelist = exports.requestSizeLimiter = exports.graphqlRateLimiter = exports.aiRateLimiter = exports.authRateLimiter = exports.strictRateLimiter = exports.createRateLimiter = void 0;
/**
 * Security middleware for IntelGraph API
 */
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const middleware_js_1 = require("../monitoring/middleware.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * General API rate limiter
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            (0, middleware_js_1.trackError)('rate_limiting', 'RateLimitExceeded');
            logger_js_1.default.warn(`Rate limit exceeded. IP: ${req.ip}, User Agent: ${req.get('User-Agent')}, Path: ${req.path}, Method: ${req.method}`);
            res.status(429).json({
                error: message,
                retryAfter: Math.ceil(windowMs / 1000),
                timestamp: new Date().toISOString()
            });
        }
    });
};
exports.createRateLimiter = createRateLimiter;
/**
 * Strict rate limiter for sensitive endpoints
 */
exports.strictRateLimiter = (0, exports.createRateLimiter)(15 * 60 * 1000, // 15 minutes
20, // 20 requests max
'Too many requests to sensitive endpoint');
/**
 * Auth rate limiter for login attempts
 */
exports.authRateLimiter = (0, exports.createRateLimiter)(15 * 60 * 1000, // 15 minutes
5, // 5 attempts max
'Too many authentication attempts');
/**
 * AI/ML processing rate limiter
 */
exports.aiRateLimiter = (0, exports.createRateLimiter)(60 * 1000, // 1 minute
10, // 10 requests max
'Too many AI processing requests');
/**
 * GraphQL rate limiter
 */
exports.graphqlRateLimiter = (0, exports.createRateLimiter)(60 * 1000, // 1 minute
50, // 50 queries max
'Too many GraphQL requests');
/**
 * Request size limiter middleware
 */
const requestSizeLimiter = (maxSize = '10mb') => {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const maxBytes = typeof maxSize === 'string'
            ? parseInt(maxSize.replace(/\D/g, '')) * (maxSize.includes('mb') ? 1024 * 1024 : 1024)
            : maxSize;
        if (contentLength > maxBytes) {
            (0, middleware_js_1.trackError)('security', 'RequestTooLarge');
            logger_js_1.default.warn(`Request size exceeded limit. IP: ${req.ip}, Content Length: ${contentLength}, Max Bytes: ${maxBytes}, Path: ${req.path}`);
            return res.status(413).json({
                error: 'Request entity too large',
                maxSize: maxSize,
                received: contentLength
            });
        }
        next();
    };
};
exports.requestSizeLimiter = requestSizeLimiter;
/**
 * IP whitelist middleware for admin endpoints
 */
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection?.remoteAddress;
        // Allow localhost in development
        const devIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
        const allAllowedIPs = [...allowedIPs, ...devIPs];
        if (!allAllowedIPs.includes(clientIP)) {
            (0, middleware_js_1.trackError)('security', 'UnauthorizedIP');
            logger_js_1.default.warn(`Unauthorized IP access attempt. IP: ${clientIP}, Path: ${req.path}, User Agent: ${req.get('User-Agent')}`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'IP not authorized'
            });
        }
        next();
    };
};
exports.ipWhitelist = ipWhitelist;
/**
 * API key validation middleware
 */
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
    if (!apiKey) {
        (0, middleware_js_1.trackError)('security', 'MissingAPIKey');
        return res.status(401).json({
            error: 'API key required',
            message: 'Include X-API-Key header or api_key query parameter'
        });
    }
    if (!validKeys.includes(apiKey)) {
        (0, middleware_js_1.trackError)('security', 'InvalidAPIKey');
        logger_js_1.default.warn(`Invalid API key used. IP: ${req.ip}, Path: ${req.path}, Key Prefix: ${apiKey.substring(0, 8)}...`);
        return res.status(401).json({
            error: 'Invalid API key'
        });
    }
    req.apiKey = apiKey;
    next();
};
exports.apiKeyAuth = apiKeyAuth;
/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
    // Check for suspicious patterns
    const suspiciousPatterns = [
        /\.\.\//g, // Path traversal
        /<script/gi, // XSS
        /union.*select/gi, // SQL injection
        /javascript:/gi, // XSS
        /eval\(/gi, // Code injection
    ];
    const requestStr = JSON.stringify({
        url: req.url,
        query: req.query,
        body: req.body
    });
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestStr)) {
            (0, middleware_js_1.trackError)('security', 'SuspiciousRequest');
            logger_js_1.default.warn(`Suspicious request pattern detected. IP: ${req.ip}, Path: ${req.path}, Pattern: ${pattern.toString()}, User Agent: ${req.get('User-Agent')}`);
            return res.status(400).json({
                error: 'Invalid request format'
            });
        }
    }
    next();
};
exports.validateRequest = validateRequest;
/**
 * Security headers middleware
 */
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});
/**
 * CORS configuration for specific origins
 */
exports.corsConfig = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://intelgraph.app'
        ];
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            (0, middleware_js_1.trackError)('security', 'UnauthorizedOrigin');
            logger_js_1.default.warn(`Unauthorized CORS origin. Origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
};
/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        logger_js_1.default[logLevel](`HTTP Request. Method: ${req.method}, URL: ${req.url}, Status Code: ${res.statusCode}, Duration: ${duration}, IP: ${req.ip}, User Agent: ${req.get('User-Agent')}, Content Length: ${res.get('Content-Length')}`);
    });
    next();
};
exports.requestLogger = requestLogger;
/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    (0, middleware_js_1.trackError)('middleware', err.name || 'UnknownError');
    logger_js_1.default.error(`Middleware error. Error: ${err.message}, Stack: ${err.stack}, URL: ${req.url}, Method: ${req.method}, IP: ${req.ip}`);
    // Don't expose internal errors in production
    const isDev = process.env.NODE_ENV === 'development';
    res.status(err.status || 500).json({
        error: isDev ? err.message : 'Internal server error',
        ...(isDev && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=security.js.map