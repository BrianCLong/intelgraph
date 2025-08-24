/**
 * Enterprise Security Service Tests - P1 Priority
 * Comprehensive test suite for security, RBAC, and compliance
 */
const EnterpriseSecurityService = require('../services/EnterpriseSecurityService');
describe('Enterprise Security Service - P1 Priority', () => {
    let securityService;
    let mockPostgresPool;
    let mockRedisClient;
    let mockLogger;
    let mockClient;
    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        mockPostgresPool = {
            connect: jest.fn(() => mockClient)
        };
        mockRedisClient = {
            incr: jest.fn(),
            expire: jest.fn(),
            setex: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            hset: jest.fn(),
            lpush: jest.fn(),
            ltrim: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        securityService = new EnterpriseSecurityService(mockPostgresPool, mockRedisClient, mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('RBAC System Initialization', () => {
        test('should initialize all system permissions', () => {
            const permissions = securityService.getAvailablePermissions();
            expect(permissions.length).toBeGreaterThan(20);
            expect(permissions.map(p => p.id)).toContain('INVESTIGATION_CREATE');
            expect(permissions.map(p => p.id)).toContain('ENTITY_READ');
            expect(permissions.map(p => p.id)).toContain('ANALYTICS_RUN');
            expect(permissions.map(p => p.id)).toContain('USER_MANAGEMENT');
            expect(permissions.map(p => p.id)).toContain('SENSITIVE_DATA_ACCESS');
        });
        test('should initialize system roles with correct permissions', () => {
            const roles = securityService.getAvailableRoles();
            expect(roles.length).toBeGreaterThan(5);
            const analyst = roles.find(r => r.id === 'ANALYST');
            expect(analyst.permissions).toContain('INVESTIGATION_CREATE');
            expect(analyst.permissions).toContain('ENTITY_READ');
            expect(analyst.dataClassifications).toContain('UNCLASSIFIED');
            const systemAdmin = roles.find(r => r.id === 'SYSTEM_ADMIN');
            expect(systemAdmin.permissions).toContain('USER_MANAGEMENT');
            expect(systemAdmin.dataClassifications).toContain('TOP_SECRET');
        });
        test('should configure role hierarchy correctly', () => {
            const roles = securityService.getAvailableRoles();
            const viewer = roles.find(r => r.id === 'VIEWER');
            const analyst = roles.find(r => r.id === 'ANALYST');
            const supervisor = roles.find(r => r.id === 'SUPERVISOR');
            expect(viewer.permissions.length).toBeLessThan(analyst.permissions.length);
            expect(analyst.permissions.length).toBeLessThan(supervisor.permissions.length);
        });
    });
    describe('Authentication System', () => {
        test('should authenticate valid user credentials', async () => {
            mockRedisClient.incr.mockResolvedValue(1);
            mockClient.query.mockResolvedValue({
                rows: [{
                        id: 'user123',
                        username: 'testuser',
                        email: 'test@example.com',
                        password_hash: '$argon2id$v=19$m=65536,t=3,p=4$hash', // mock hash
                        role: 'ANALYST',
                        status: 'ACTIVE',
                        failed_login_attempts: 0
                    }]
            });
            // Mock password verification (normally done by argon2)
            const mockVerify = jest.fn().mockResolvedValue(true);
            require('argon2').verify = mockVerify;
            const credentials = {
                username: 'testuser',
                password: 'correctpassword',
                clientInfo: {
                    ip: '192.168.1.100',
                    userAgent: 'TestAgent',
                    location: 'US'
                }
            };
            const result = await securityService.authenticate(credentials);
            expect(result.success).toBe(true);
            expect(result.user.username).toBe('testuser');
            expect(result.user.role).toBe('ANALYST');
            expect(result.session).toBeDefined();
            expect(result.token).toBeDefined();
        });
        test('should reject invalid credentials', async () => {
            mockRedisClient.incr.mockResolvedValue(1);
            mockClient.query.mockResolvedValue({
                rows: [{
                        id: 'user123',
                        username: 'testuser',
                        password_hash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
                        role: 'ANALYST',
                        status: 'ACTIVE',
                        failed_login_attempts: 0
                    }]
            });
            const mockVerify = jest.fn().mockResolvedValue(false);
            require('argon2').verify = mockVerify;
            const credentials = {
                username: 'testuser',
                password: 'wrongpassword',
                clientInfo: { ip: '192.168.1.100' }
            };
            await expect(securityService.authenticate(credentials))
                .rejects.toThrow('Invalid credentials');
        });
        test('should enforce rate limiting', async () => {
            mockRedisClient.incr.mockResolvedValue(11); // Exceeds limit
            const credentials = {
                username: 'testuser',
                password: 'password',
                clientInfo: { ip: '192.168.1.100' }
            };
            await expect(securityService.authenticate(credentials))
                .rejects.toThrow('Too many authentication attempts');
        });
        test('should reject disabled accounts', async () => {
            mockRedisClient.incr.mockResolvedValue(1);
            mockClient.query.mockResolvedValue({
                rows: [{
                        id: 'user123',
                        username: 'testuser',
                        status: 'DISABLED'
                    }]
            });
            const credentials = {
                username: 'testuser',
                password: 'password',
                clientInfo: { ip: '192.168.1.100' }
            };
            await expect(securityService.authenticate(credentials))
                .rejects.toThrow('Account disabled');
        });
    });
    describe('Session Management', () => {
        test('should create secure sessions', async () => {
            const user = {
                id: 'user123',
                username: 'testuser',
                role: 'ANALYST'
            };
            const clientInfo = {
                ip: '192.168.1.100',
                userAgent: 'TestAgent',
                location: 'US'
            };
            const session = await securityService.createSession(user, clientInfo);
            expect(session.id).toBeDefined();
            expect(session.userId).toBe(user.id);
            expect(session.username).toBe(user.username);
            expect(session.role).toBe(user.role);
            expect(session.createdAt).toBeDefined();
            expect(session.expiresAt).toBeDefined();
            expect(session.token).toBeDefined();
            expect(session.permissions).toBeDefined();
        });
        test('should verify valid sessions', async () => {
            const mockSession = {
                id: 'session123',
                userId: 'user123',
                expiresAt: new Date(Date.now() + 60000),
                lastActivity: new Date()
            };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
            const token = securityService.generateSessionToken('session123', 'user123');
            const verifiedSession = await securityService.verifySession(token);
            expect(verifiedSession.id).toBe('session123');
            expect(verifiedSession.userId).toBe('user123');
        });
        test('should reject expired sessions', async () => {
            const mockSession = {
                id: 'session123',
                userId: 'user123',
                expiresAt: new Date(Date.now() - 60000), // Expired
                lastActivity: new Date()
            };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
            const token = securityService.generateSessionToken('session123', 'user123');
            await expect(securityService.verifySession(token))
                .rejects.toThrow('Session expired');
        });
        test('should handle idle timeout', async () => {
            const mockSession = {
                id: 'session123',
                userId: 'user123',
                expiresAt: new Date(Date.now() + 60000),
                lastActivity: new Date(Date.now() - 40 * 60 * 1000) // 40 minutes ago
            };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
            const token = securityService.generateSessionToken('session123', 'user123');
            await expect(securityService.verifySession(token))
                .rejects.toThrow('Session timed out due to inactivity');
        });
    });
    describe('Permission System', () => {
        test('should grant access with valid permissions', async () => {
            const mockSession = {
                id: 'session123',
                username: 'testuser',
                permissions: ['ENTITY_READ', 'INVESTIGATION_READ'],
                dataClassifications: ['UNCLASSIFIED', 'INTERNAL'],
                expiresAt: new Date(Date.now() + 60000),
                lastActivity: new Date(),
                ipAddress: '192.168.1.100'
            };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
            const token = securityService.generateSessionToken('session123', 'user123');
            const result = await securityService.checkPermission(token, 'ENTITY_READ', { id: 'entity123', dataClassification: 'INTERNAL' });
            expect(result.allowed).toBe(true);
            expect(result.session).toBeDefined();
        });
        test('should deny access without required permissions', async () => {
            const mockSession = {
                id: 'session123',
                username: 'testuser',
                permissions: ['ENTITY_READ'],
                dataClassifications: ['UNCLASSIFIED'],
                expiresAt: new Date(Date.now() + 60000),
                lastActivity: new Date(),
                ipAddress: '192.168.1.100'
            };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
            const token = securityService.generateSessionToken('session123', 'user123');
            const result = await securityService.checkPermission(token, 'USER_MANAGEMENT');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('INSUFFICIENT_PERMISSIONS');
        });
        test('should deny access to higher classification data', async () => {
            const mockSession = {
                id: 'session123',
                username: 'testuser',
                permissions: ['ENTITY_READ'],
                dataClassifications: ['UNCLASSIFIED', 'INTERNAL'],
                expiresAt: new Date(Date.now() + 60000),
                lastActivity: new Date(),
                ipAddress: '192.168.1.100'
            };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
            const token = securityService.generateSessionToken('session123', 'user123');
            const result = await securityService.checkPermission(token, 'ENTITY_READ', { id: 'entity123', dataClassification: 'TOP_SECRET' });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('DATA_CLASSIFICATION_DENIED');
        });
    });
    describe('User Management', () => {
        test('should create new users with proper validation', async () => {
            const creatorSession = {
                token: 'valid-token',
                userId: 'admin123',
                username: 'admin'
            };
            // Mock permission check
            securityService.checkPermission = jest.fn().mockResolvedValue({ allowed: true });
            const userData = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'SecurePassword123!',
                role: 'ANALYST'
            };
            const user = await securityService.createUser(userData, creatorSession);
            expect(user.id).toBeDefined();
            expect(user.username).toBe('newuser');
            expect(user.email).toBe('newuser@example.com');
            expect(user.role).toBe('ANALYST');
        });
        test('should validate user data before creation', async () => {
            const creatorSession = { token: 'valid-token', userId: 'admin123' };
            securityService.checkPermission = jest.fn().mockResolvedValue({ allowed: true });
            const invalidUserData = {
                username: 'x', // Too short
                email: 'invalid-email',
                password: '123', // Weak password
                role: 'INVALID_ROLE'
            };
            await expect(securityService.createUser(invalidUserData, creatorSession))
                .rejects.toThrow();
        });
        test('should validate password strength', () => {
            const policy = {
                minLength: 12,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true
            };
            expect(securityService.validatePassword('WeakPass', policy)).toBe(false);
            expect(securityService.validatePassword('StrongPassword123!', policy)).toBe(true);
        });
    });
    describe('Audit Logging', () => {
        test('should log security events with required fields', async () => {
            const event = {
                type: 'LOGIN_SUCCESS',
                user: 'testuser',
                session_id: 'session123',
                ip: '192.168.1.100',
                resource: 'authentication'
            };
            const auditEvent = await securityService.logSecurityEvent(event);
            expect(auditEvent.id).toBeDefined();
            expect(auditEvent.timestamp).toBeDefined();
            expect(auditEvent.type).toBe('LOGIN_SUCCESS');
            expect(auditEvent.user).toBe('testuser');
            expect(auditEvent.ip_address).toBe('192.168.1.100');
            expect(auditEvent.outcome).toBe('SUCCESS');
        });
        test('should determine compliance flags correctly', () => {
            const event = { type: 'LOGIN_SUCCESS', severity: 'HIGH' };
            const flags = securityService.determineComplianceFlags(event);
            expect(flags).toContain('SOC2_ACCESS_LOGGING');
            expect(flags).toContain('FISMA_SECURITY_EVENT');
        });
        test('should track metrics for audit events', async () => {
            const initialMetrics = securityService.getSecurityMetrics();
            await securityService.logSecurityEvent({
                type: 'ACCESS_GRANTED',
                user: 'testuser'
            });
            const updatedMetrics = securityService.getSecurityMetrics();
            expect(updatedMetrics.auditEvents).toBe(initialMetrics.auditEvents + 1);
        });
    });
    describe('API Token Management', () => {
        test('should generate secure API tokens', async () => {
            const token = await securityService.generateApiToken('user123', ['ENTITY_READ', 'ANALYTICS_RUN'], '24h');
            expect(token.tokenId).toBeDefined();
            expect(token.token).toContain('.');
            expect(token.permissions).toEqual(['ENTITY_READ', 'ANALYTICS_RUN']);
            expect(token.expiresAt).toBeInstanceOf(Date);
        });
        test('should verify valid API tokens', async () => {
            require('argon2').verify = jest.fn().mockResolvedValue(true);
            const generatedToken = await securityService.generateApiToken('user123', ['ENTITY_READ']);
            securityService.getApiToken = jest.fn().mockResolvedValue(securityService.apiTokens.get(generatedToken.tokenId));
            const verifiedToken = await securityService.verifyApiToken(generatedToken.token);
            expect(verifiedToken.userId).toBe('user123');
            expect(verifiedToken.permissions).toContain('ENTITY_READ');
            expect(verifiedToken.status).toBe('ACTIVE');
        });
        test('should reject expired API tokens', async () => {
            const expiredToken = 'token123.secret456';
            securityService.apiTokens.set('token123', {
                userId: 'user123',
                expiresAt: new Date(Date.now() - 60000), // Expired
                status: 'ACTIVE'
            });
            await expect(securityService.verifyApiToken(expiredToken))
                .rejects.toThrow('Token expired');
        });
    });
    describe('Compliance Reporting', () => {
        test('should generate SOC2 compliance reports', async () => {
            const framework = 'SOC2';
            const dateRange = {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate: new Date()
            };
            securityService.getAuditEvents = jest.fn().mockResolvedValue([
                { type: 'LOGIN_SUCCESS', compliance_violations: [] },
                { type: 'ACCESS_GRANTED', compliance_violations: [] }
            ]);
            const report = await securityService.generateComplianceReport(framework, dateRange);
            expect(report.framework).toBe('SOC2');
            expect(report.name).toBe('SOC 2 Type II');
            expect(report.summary.totalEvents).toBe(2);
            expect(report.summary.complianceScore).toBeGreaterThan(0);
        });
        test('should calculate compliance scores accurately', async () => {
            const auditEvents = [
                { type: 'LOGIN_SUCCESS', compliance_violations: [] },
                { type: 'LOGIN_FAILED', compliance_violations: [] },
                { type: 'ACCESS_DENIED', compliance_violations: ['POLICY_VIOLATION'] }
            ];
            const score = await securityService.calculateComplianceScore('SOC2', auditEvents);
            expect(score).toBeLessThan(100); // Should deduct for violations
            expect(score).toBeGreaterThanOrEqual(0);
        });
    });
    describe('Security Monitoring', () => {
        test('should detect brute force attacks', async () => {
            securityService.getRecentFailedLogins = jest.fn().mockResolvedValue([
                { timestamp: new Date(), user: 'testuser' },
                { timestamp: new Date(), user: 'testuser' },
                { timestamp: new Date(), user: 'testuser' },
                { timestamp: new Date(), user: 'testuser' },
                { timestamp: new Date(), user: 'testuser' }
            ]);
            securityService.triggerSecurityAlert = jest.fn();
            await securityService.analyzeSecurityPatterns({
                type: 'LOGIN_FAILED',
                user: 'testuser',
                ip_address: '192.168.1.100'
            });
            expect(securityService.triggerSecurityAlert).toHaveBeenCalledWith(expect.objectContaining({
                type: 'BRUTE_FORCE_DETECTED',
                user: 'testuser'
            }));
        });
        test('should trigger security alerts for violations', async () => {
            const alert = {
                type: 'SUSPICIOUS_LOGIN',
                severity: 'HIGH',
                user: 'testuser',
                details: { reason: 'Unusual location' }
            };
            securityService.storeSecurityAlert = jest.fn();
            const result = await securityService.triggerSecurityAlert(alert);
            expect(result.id).toBeDefined();
            expect(result.type).toBe('SUSPICIOUS_LOGIN');
            expect(result.severity).toBe('HIGH');
            expect(result.status).toBe('ACTIVE');
        });
    });
    describe('Metrics and Performance', () => {
        test('should track security metrics accurately', () => {
            const metrics = securityService.getSecurityMetrics();
            expect(metrics.totalLogins).toBeGreaterThanOrEqual(0);
            expect(metrics.successfulLogins).toBeGreaterThanOrEqual(0);
            expect(metrics.failedLogins).toBeGreaterThanOrEqual(0);
            expect(metrics.accessDenials).toBeGreaterThanOrEqual(0);
            expect(metrics.auditEvents).toBeGreaterThanOrEqual(0);
            expect(metrics.successRate).toBeDefined();
        });
        test('should calculate success rate correctly', () => {
            // Simulate some login attempts
            securityService.securityMetrics.totalLogins = 100;
            securityService.securityMetrics.successfulLogins = 95;
            const metrics = securityService.getSecurityMetrics();
            expect(metrics.successRate).toBe('95.00');
        });
    });
    describe('Email Validation', () => {
        test('should validate email addresses correctly', () => {
            expect(securityService.isValidEmail('valid@example.com')).toBe(true);
            expect(securityService.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
            expect(securityService.isValidEmail('invalid-email')).toBe(false);
            expect(securityService.isValidEmail('no-at-symbol.com')).toBe(false);
            expect(securityService.isValidEmail('@missing-local.com')).toBe(false);
        });
    });
    describe('Time Parsing', () => {
        test('should parse time strings correctly', () => {
            expect(securityService.parseTimeToMs('30s')).toBe(30000);
            expect(securityService.parseTimeToMs('5m')).toBe(300000);
            expect(securityService.parseTimeToMs('2h')).toBe(7200000);
            expect(securityService.parseTimeToMs('1d')).toBe(86400000);
            expect(securityService.parseTimeToMs('invalid')).toBe(24 * 60 * 60 * 1000); // Default
        });
    });
});
//# sourceMappingURL=enterpriseSecurity.test.js.map