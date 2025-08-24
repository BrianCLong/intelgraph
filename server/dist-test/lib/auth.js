"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = exports.generateToken = exports.verifyToken = exports.getContext = void 0;
const graphql_1 = require("graphql");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const postgres_js_1 = require("../db/postgres.js");
const uuid_1 = require("uuid");
const logger = logger.child({ name: 'auth' });
const JWT_SECRET = process.env.JWT_SECRET ||
    "dev_jwt_secret_12345_very_long_secret_for_development";
const getContext = async ({ req, }) => {
    const requestId = (0, uuid_1.v4)();
    try {
        const token = extractToken(req);
        if (!token) {
            logger.info({ requestId }, "Unauthenticated request");
            return { isAuthenticated: false, requestId };
        }
        const user = await (0, exports.verifyToken)(token);
        logger.info({ requestId, userId: user.id }, "Authenticated request");
        return { user, isAuthenticated: true, requestId };
    }
    catch (error) {
        logger.warn({ requestId, error: error.message }, "Authentication failed");
        return { isAuthenticated: false, requestId };
    }
};
exports.getContext = getContext;
const verifyToken = async (token) => {
    try {
        // For development, accept a simple test token
        if (process.env.NODE_ENV === "development" && token === "dev-token") {
            return {
                id: "dev-user-1",
                email: "developer@intelgraph.com",
                username: "developer",
                role: "ADMIN",
            };
        }
        // Verify JWT token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Get user from database
        const pool = (0, postgres_js_1.getPostgresPool)();
        const result = await pool.query("SELECT id, email, username, role FROM users WHERE id = $1", [decoded.userId]);
        if (result.rows.length === 0) {
            throw new Error("User not found");
        }
        return result.rows[0];
    }
    catch (error) {
        throw new graphql_1.GraphQLError("Invalid or expired token", {
            extensions: {
                code: "UNAUTHENTICATED",
                http: { status: 401 },
            },
        });
    }
};
exports.verifyToken = verifyToken;
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
    }, JWT_SECRET, { expiresIn: "1h" });
};
exports.generateToken = generateToken;
const requireAuth = (context) => {
    if (!context.isAuthenticated || !context.user) {
        throw new graphql_1.GraphQLError("Authentication required", {
            extensions: {
                code: "UNAUTHENTICATED",
                http: { status: 401 },
            },
        });
    }
    return context.user;
};
exports.requireAuth = requireAuth;
const requireRole = (context, requiredRole) => {
    const user = (0, exports.requireAuth)(context);
    if (user.role !== requiredRole && user.role !== "ADMIN") {
        throw new graphql_1.GraphQLError("Insufficient permissions", {
            extensions: {
                code: "FORBIDDEN",
                http: { status: 403 },
            },
        });
    }
    return user;
};
exports.requireRole = requireRole;
function extractToken(req) {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    return null;
}
//# sourceMappingURL=auth.js.map