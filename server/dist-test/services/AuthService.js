"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_js_1 = require("../config/database.js");
const index_js_1 = __importDefault(require("../config/index.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Define permissions for each role
const ROLE_PERMISSIONS = {
    ADMIN: [
        '*', // Admin has all permissions
    ],
    ANALYST: [
        'investigation:create',
        'investigation:read',
        'investigation:update',
        'entity:create',
        'entity:read',
        'entity:update',
        'entity:delete',
        'relationship:create',
        'relationship:read',
        'relationship:update',
        'relationship:delete',
        'tag:create',
        'tag:read',
        'tag:delete',
        'graph:read',
        'graph:export',
        'ai:request',
    ],
    VIEWER: [
        'investigation:read',
        'entity:read',
        'relationship:read',
        'tag:read',
        'graph:read',
        'graph:export',
    ],
};
class AuthService {
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    async register(userData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const existingUser = await client.query('SELECT id FROM users WHERE email = $1 OR username = $2', [userData.email, userData.username]);
            if (existingUser.rows.length > 0) {
                throw new Error('User with this email or username already exists');
            }
            const passwordHash = await argon2_1.default.hash(userData.password);
            const userResult = await client.query(`
        INSERT INTO users (email, username, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, username, first_name, last_name, role, is_active, created_at
      `, [
                userData.email,
                userData.username,
                passwordHash,
                userData.firstName,
                userData.lastName,
                userData.role || 'ANALYST'
            ]);
            const user = userResult.rows[0];
            const { token, refreshToken } = await this.generateTokens(user, client);
            await client.query('COMMIT');
            return {
                user: this.formatUser(user),
                token,
                refreshToken,
                expiresIn: 24 * 60 * 60
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Error registering user:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async login(email, password, ipAddress, userAgent) {
        const client = await this.pool.connect();
        try {
            const userResult = await client.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
            if (userResult.rows.length === 0) {
                throw new Error('Invalid credentials');
            }
            const user = userResult.rows[0];
            const validPassword = await argon2_1.default.verify(user.password_hash, password);
            if (!validPassword) {
                throw new Error('Invalid credentials');
            }
            await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
            const { token, refreshToken } = await this.generateTokens(user, client);
            return {
                user: this.formatUser(user),
                token,
                refreshToken,
                expiresIn: 24 * 60 * 60
            };
        }
        catch (error) {
            logger_js_1.default.error('Error logging in user:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async generateTokens(user, client) {
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, index_js_1.default.jwt.secret, {
            expiresIn: index_js_1.default.jwt.expiresIn
        });
        const refreshToken = (0, uuid_1.v4)();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await client.query(`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, refreshToken, expiresAt]);
        return { token, refreshToken };
    }
    async verifyToken(token) {
        try {
            if (!token)
                return null;
            const decoded = jsonwebtoken_1.default.verify(token, index_js_1.default.jwt.secret);
            const client = await this.pool.connect();
            const userResult = await client.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
            client.release();
            if (userResult.rows.length === 0) {
                return null;
            }
            return this.formatUser(userResult.rows[0]);
        }
        catch (error) {
            logger_js_1.default.warn('Invalid token:', error.message);
            return null;
        }
    }
    hasPermission(user, permission) {
        if (!user || !user.role)
            return false;
        const userPermissions = ROLE_PERMISSIONS[user.role.toUpperCase()];
        if (!userPermissions)
            return false;
        if (userPermissions.includes('*'))
            return true; // Admin or super role
        return userPermissions.includes(permission);
    }
    formatUser(user) {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name} ${user.last_name}`,
            role: user.role,
            isActive: user.is_active,
            lastLogin: user.last_login,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
//# sourceMappingURL=AuthService.js.map