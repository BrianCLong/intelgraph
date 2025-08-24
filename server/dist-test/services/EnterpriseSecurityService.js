/**
 * Enterprise Security Service - P1 Priority
 * Comprehensive Security Framework with RBAC, Audit, and Compliance
 */
const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
class EnterpriseSecurityService extends EventEmitter {
    constructor(postgresPool, redisClient, logger) {
        super();
        this.postgresPool = postgresPool;
        this.redisClient = redisClient;
        this.logger = logger;
        this.permissions = new Map();
        this.roles = new Map();
        this.policies = new Map();
        this.auditLog = [];
        this.securityRules = new Map();
        this.complianceFrameworks = new Map();
        this.sessionManager = new Map();
        this.apiTokens = new Map();
        this.securityMetrics = {
            totalLogins: 0,
            failedLogins: 0,
            successfulLogins: 0,
            accessDenials: 0,
            securityViolations: 0,
            auditEvents: 0,
            activeSessions: 0,
            passwordResets: 0,
        };
        this.initializeRBAC();
        this.initializeComplianceFrameworks();
        this.initializeSecurityRules();
        this.startSecurityMonitoring();
    }
    initializeRBAC() {
        // Define system permissions
        const permissions = [
            // Investigation permissions
            {
                id: "INVESTIGATION_CREATE",
                name: "Create Investigation",
                category: "INVESTIGATION",
            },
            {
                id: "INVESTIGATION_READ",
                name: "View Investigation",
                category: "INVESTIGATION",
            },
            {
                id: "INVESTIGATION_UPDATE",
                name: "Edit Investigation",
                category: "INVESTIGATION",
            },
            {
                id: "INVESTIGATION_DELETE",
                name: "Delete Investigation",
                category: "INVESTIGATION",
            },
            {
                id: "INVESTIGATION_SHARE",
                name: "Share Investigation",
                category: "INVESTIGATION",
            },
            {
                id: "INVESTIGATION_EXPORT",
                name: "Export Investigation",
                category: "INVESTIGATION",
            },
            // Entity permissions
            { id: "ENTITY_CREATE", name: "Create Entity", category: "ENTITY" },
            { id: "ENTITY_READ", name: "View Entity", category: "ENTITY" },
            { id: "ENTITY_UPDATE", name: "Edit Entity", category: "ENTITY" },
            { id: "ENTITY_DELETE", name: "Delete Entity", category: "ENTITY" },
            { id: "ENTITY_LINK", name: "Link Entities", category: "ENTITY" },
            // Analytics permissions
            { id: "ANALYTICS_RUN", name: "Run Analytics", category: "ANALYTICS" },
            {
                id: "ANALYTICS_VIEW_RESULTS",
                name: "View Analytics Results",
                category: "ANALYTICS",
            },
            {
                id: "ML_MODEL_ACCESS",
                name: "Access ML Models",
                category: "ANALYTICS",
            },
            { id: "SIMULATION_RUN", name: "Run Simulations", category: "ANALYTICS" },
            // System administration
            { id: "USER_MANAGEMENT", name: "Manage Users", category: "ADMIN" },
            { id: "ROLE_MANAGEMENT", name: "Manage Roles", category: "ADMIN" },
            { id: "SYSTEM_CONFIG", name: "System Configuration", category: "ADMIN" },
            { id: "AUDIT_LOG_ACCESS", name: "Access Audit Logs", category: "ADMIN" },
            { id: "SECURITY_SETTINGS", name: "Security Settings", category: "ADMIN" },
            // Advanced features
            {
                id: "FEDERATED_SEARCH",
                name: "Federated Search",
                category: "ADVANCED",
            },
            { id: "AI_EXTRACTION", name: "AI Extraction", category: "ADVANCED" },
            { id: "COPILOT_ACCESS", name: "Copilot Access", category: "ADVANCED" },
            { id: "API_ACCESS", name: "API Access", category: "ADVANCED" },
            // Data permissions
            { id: "DATA_EXPORT", name: "Export Data", category: "DATA" },
            { id: "DATA_IMPORT", name: "Import Data", category: "DATA" },
            {
                id: "SENSITIVE_DATA_ACCESS",
                name: "Access Sensitive Data",
                category: "DATA",
            },
            { id: "PII_ACCESS", name: "Access PII", category: "DATA" },
        ];
        permissions.forEach((permission) => {
            this.permissions.set(permission.id, permission);
        });
        // Define system roles
        const roles = [
            {
                id: "ANALYST",
                name: "Intelligence Analyst",
                description: "Standard analyst with investigation and analysis capabilities",
                permissions: [
                    "INVESTIGATION_CREATE",
                    "INVESTIGATION_READ",
                    "INVESTIGATION_UPDATE",
                    "INVESTIGATION_SHARE",
                    "ENTITY_CREATE",
                    "ENTITY_READ",
                    "ENTITY_UPDATE",
                    "ENTITY_LINK",
                    "ANALYTICS_RUN",
                    "ANALYTICS_VIEW_RESULTS",
                    "SIMULATION_RUN",
                    "FEDERATED_SEARCH",
                    "AI_EXTRACTION",
                    "DATA_EXPORT",
                ],
                dataClassifications: ["UNCLASSIFIED", "INTERNAL"],
                maxConcurrentSessions: 3,
            },
            {
                id: "SENIOR_ANALYST",
                name: "Senior Intelligence Analyst",
                description: "Senior analyst with advanced capabilities",
                permissions: [
                    "INVESTIGATION_CREATE",
                    "INVESTIGATION_READ",
                    "INVESTIGATION_UPDATE",
                    "INVESTIGATION_DELETE",
                    "INVESTIGATION_SHARE",
                    "INVESTIGATION_EXPORT",
                    "ENTITY_CREATE",
                    "ENTITY_READ",
                    "ENTITY_UPDATE",
                    "ENTITY_DELETE",
                    "ENTITY_LINK",
                    "ANALYTICS_RUN",
                    "ANALYTICS_VIEW_RESULTS",
                    "ML_MODEL_ACCESS",
                    "SIMULATION_RUN",
                    "FEDERATED_SEARCH",
                    "AI_EXTRACTION",
                    "COPILOT_ACCESS",
                    "DATA_EXPORT",
                    "DATA_IMPORT",
                    "SENSITIVE_DATA_ACCESS",
                ],
                dataClassifications: ["UNCLASSIFIED", "INTERNAL", "CONFIDENTIAL"],
                maxConcurrentSessions: 5,
            },
            {
                id: "SUPERVISOR",
                name: "Investigation Supervisor",
                description: "Supervisory role with team management capabilities",
                permissions: [
                    "INVESTIGATION_CREATE",
                    "INVESTIGATION_READ",
                    "INVESTIGATION_UPDATE",
                    "INVESTIGATION_DELETE",
                    "INVESTIGATION_SHARE",
                    "INVESTIGATION_EXPORT",
                    "ENTITY_CREATE",
                    "ENTITY_READ",
                    "ENTITY_UPDATE",
                    "ENTITY_DELETE",
                    "ENTITY_LINK",
                    "ANALYTICS_RUN",
                    "ANALYTICS_VIEW_RESULTS",
                    "ML_MODEL_ACCESS",
                    "SIMULATION_RUN",
                    "FEDERATED_SEARCH",
                    "AI_EXTRACTION",
                    "COPILOT_ACCESS",
                    "API_ACCESS",
                    "DATA_EXPORT",
                    "DATA_IMPORT",
                    "SENSITIVE_DATA_ACCESS",
                    "PII_ACCESS",
                    "AUDIT_LOG_ACCESS",
                ],
                dataClassifications: [
                    "UNCLASSIFIED",
                    "INTERNAL",
                    "CONFIDENTIAL",
                    "RESTRICTED",
                ],
                maxConcurrentSessions: 5,
            },
            {
                id: "SYSTEM_ADMIN",
                name: "System Administrator",
                description: "Full system administration privileges",
                permissions: [
                    "USER_MANAGEMENT",
                    "ROLE_MANAGEMENT",
                    "SYSTEM_CONFIG",
                    "AUDIT_LOG_ACCESS",
                    "SECURITY_SETTINGS",
                    "INVESTIGATION_CREATE",
                    "INVESTIGATION_READ",
                    "INVESTIGATION_UPDATE",
                    "INVESTIGATION_DELETE",
                    "INVESTIGATION_SHARE",
                    "INVESTIGATION_EXPORT",
                    "ENTITY_CREATE",
                    "ENTITY_READ",
                    "ENTITY_UPDATE",
                    "ENTITY_DELETE",
                    "ENTITY_LINK",
                    "ANALYTICS_RUN",
                    "ANALYTICS_VIEW_RESULTS",
                    "ML_MODEL_ACCESS",
                    "SIMULATION_RUN",
                    "FEDERATED_SEARCH",
                    "AI_EXTRACTION",
                    "COPILOT_ACCESS",
                    "API_ACCESS",
                    "DATA_EXPORT",
                    "DATA_IMPORT",
                    "SENSITIVE_DATA_ACCESS",
                    "PII_ACCESS",
                ],
                dataClassifications: [
                    "UNCLASSIFIED",
                    "INTERNAL",
                    "CONFIDENTIAL",
                    "RESTRICTED",
                    "TOP_SECRET",
                ],
                maxConcurrentSessions: 10,
            },
            {
                id: "VIEWER",
                name: "Read-Only Viewer",
                description: "Read-only access to investigations and entities",
                permissions: [
                    "INVESTIGATION_READ",
                    "ENTITY_READ",
                    "ANALYTICS_VIEW_RESULTS",
                ],
                dataClassifications: ["UNCLASSIFIED", "INTERNAL"],
                maxConcurrentSessions: 2,
            },
            {
                id: "API_SERVICE",
                name: "API Service Account",
                description: "Service account for API integrations",
                permissions: [
                    "API_ACCESS",
                    "FEDERATED_SEARCH",
                    "AI_EXTRACTION",
                    "ENTITY_READ",
                    "INVESTIGATION_READ",
                    "ANALYTICS_RUN",
                ],
                dataClassifications: ["UNCLASSIFIED", "INTERNAL"],
                maxConcurrentSessions: 50,
            },
        ];
        roles.forEach((role) => {
            this.roles.set(role.id, role);
        });
    }
    initializeComplianceFrameworks() {
        this.complianceFrameworks.set("SOC2", {
            name: "SOC 2 Type II",
            requirements: [
                "ACCESS_LOGGING",
                "USER_PROVISIONING",
                "DATA_ENCRYPTION",
                "INCIDENT_RESPONSE",
                "VULNERABILITY_MANAGEMENT",
            ],
            auditRequirements: {
                retentionPeriod: 365, // days
                requiredFields: [
                    "user",
                    "action",
                    "timestamp",
                    "resource",
                    "outcome",
                    "ip_address",
                ],
                realTimeMonitoring: true,
            },
        });
        this.complianceFrameworks.set("FISMA", {
            name: "Federal Information Security Modernization Act",
            requirements: [
                "MULTI_FACTOR_AUTH",
                "ENCRYPTION_AT_REST",
                "ENCRYPTION_IN_TRANSIT",
                "ACCESS_CONTROL",
                "AUDIT_LOGGING",
                "INCIDENT_RESPONSE",
            ],
            auditRequirements: {
                retentionPeriod: 2555, // 7 years
                requiredFields: [
                    "user",
                    "action",
                    "timestamp",
                    "resource",
                    "outcome",
                    "classification",
                    "ip_address",
                ],
                realTimeMonitoring: true,
            },
        });
        this.complianceFrameworks.set("GDPR", {
            name: "General Data Protection Regulation",
            requirements: [
                "DATA_MINIMIZATION",
                "CONSENT_MANAGEMENT",
                "RIGHT_TO_ERASURE",
                "DATA_PORTABILITY",
                "BREACH_NOTIFICATION",
                "PRIVACY_BY_DESIGN",
            ],
            auditRequirements: {
                retentionPeriod: 2555, // 7 years
                requiredFields: [
                    "user",
                    "action",
                    "timestamp",
                    "data_subject",
                    "legal_basis",
                ],
                personalDataTracking: true,
            },
        });
        this.complianceFrameworks.set("NIST", {
            name: "NIST Cybersecurity Framework",
            requirements: ["IDENTIFY", "PROTECT", "DETECT", "RESPOND", "RECOVER"],
            controls: {
                "AC-2": "Account Management",
                "AC-3": "Access Enforcement",
                "AU-2": "Audit Events",
                "AU-3": "Content of Audit Records",
                "IA-2": "Identification and Authentication",
            },
        });
    }
    initializeSecurityRules() {
        // Password policy
        this.securityRules.set("PASSWORD_POLICY", {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            maxAge: 90, // days
            historyCount: 12,
            lockoutAttempts: 5,
            lockoutDuration: 15, // minutes
        });
        // Session management
        this.securityRules.set("SESSION_POLICY", {
            maxDuration: 8 * 60 * 60 * 1000, // 8 hours
            idleTimeout: 30 * 60 * 1000, // 30 minutes
            requireReauth: 24 * 60 * 60 * 1000, // 24 hours
            concurrentSessionLimit: 3,
        });
        // Access control
        this.securityRules.set("ACCESS_CONTROL", {
            requireMFA: ["SYSTEM_ADMIN", "SUPERVISOR"],
            dataClassificationEnforcement: true,
            locationBasedAccess: true,
            timeBasedAccess: true,
        });
        // API security
        this.securityRules.set("API_SECURITY", {
            rateLimiting: {
                perMinute: 100,
                perHour: 1000,
                perDay: 10000,
            },
            requireApiKey: true,
            ipWhitelisting: true,
            tokenExpiration: 24 * 60 * 60 * 1000, // 24 hours
        });
    }
    startSecurityMonitoring() {
        // Real-time security monitoring
        setInterval(() => {
            this.monitorSecurityThreats();
            this.cleanupExpiredSessions();
            this.rotateAuditLogs();
        }, 60000); // Every minute
        // Daily security tasks
        setInterval(() => {
            this.generateSecurityReport();
            this.checkComplianceStatus();
            this.updateThreatIntelligence();
        }, 24 * 60 * 60 * 1000); // Daily
    }
    // Authentication methods
    async authenticate(credentials) {
        const { username, password, mfaToken, clientInfo } = credentials;
        try {
            // Rate limiting check
            const rateLimitKey = `auth_attempts:${clientInfo.ip}`;
            const attempts = await this.redisClient.incr(rateLimitKey);
            if (attempts === 1) {
                await this.redisClient.expire(rateLimitKey, 300); // 5 minutes
            }
            if (attempts > 10) {
                this.securityMetrics.accessDenials++;
                await this.logSecurityEvent({
                    type: "RATE_LIMIT_EXCEEDED",
                    user: username,
                    ip: clientInfo.ip,
                    severity: "HIGH",
                });
                throw new Error("Too many authentication attempts");
            }
            // Get user from database
            const user = await this.getUserByUsername(username);
            if (!user) {
                this.securityMetrics.failedLogins++;
                await this.logSecurityEvent({
                    type: "LOGIN_FAILED",
                    user: username,
                    reason: "USER_NOT_FOUND",
                    ip: clientInfo.ip,
                });
                throw new Error("Invalid credentials");
            }
            // Check account status
            if (user.status !== "ACTIVE") {
                this.securityMetrics.accessDenials++;
                await this.logSecurityEvent({
                    type: "ACCESS_DENIED",
                    user: username,
                    reason: "ACCOUNT_DISABLED",
                    ip: clientInfo.ip,
                });
                throw new Error("Account disabled");
            }
            // Verify password
            const passwordValid = await argon2.verify(user.password_hash, password);
            if (!passwordValid) {
                user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
                await this.updateUserFailedAttempts(user.id, user.failed_login_attempts);
                // Account lockout
                const policy = this.securityRules.get("PASSWORD_POLICY");
                if (user.failed_login_attempts >= policy.lockoutAttempts) {
                    await this.lockUserAccount(user.id, policy.lockoutDuration);
                    await this.logSecurityEvent({
                        type: "ACCOUNT_LOCKED",
                        user: username,
                        reason: "EXCESSIVE_FAILED_ATTEMPTS",
                        ip: clientInfo.ip,
                        severity: "HIGH",
                    });
                }
                this.securityMetrics.failedLogins++;
                await this.logSecurityEvent({
                    type: "LOGIN_FAILED",
                    user: username,
                    reason: "INVALID_PASSWORD",
                    ip: clientInfo.ip,
                });
                throw new Error("Invalid credentials");
            }
            // Check MFA requirement
            const userRole = this.roles.get(user.role);
            const accessControlPolicy = this.securityRules.get("ACCESS_CONTROL");
            if (accessControlPolicy.requireMFA.includes(user.role) && !mfaToken) {
                throw new Error("MFA required");
            }
            if (mfaToken) {
                const mfaValid = await this.verifyMFA(user.id, mfaToken);
                if (!mfaValid) {
                    this.securityMetrics.failedLogins++;
                    await this.logSecurityEvent({
                        type: "MFA_FAILED",
                        user: username,
                        ip: clientInfo.ip,
                    });
                    throw new Error("Invalid MFA token");
                }
            }
            // Location-based access control
            if (accessControlPolicy.locationBasedAccess) {
                const locationAllowed = await this.checkLocationAccess(user.id, clientInfo.ip);
                if (!locationAllowed) {
                    this.securityMetrics.accessDenials++;
                    await this.logSecurityEvent({
                        type: "ACCESS_DENIED",
                        user: username,
                        reason: "LOCATION_RESTRICTED",
                        ip: clientInfo.ip,
                        severity: "HIGH",
                    });
                    throw new Error("Access denied from this location");
                }
            }
            // Time-based access control
            if (accessControlPolicy.timeBasedAccess) {
                const timeAllowed = await this.checkTimeBasedAccess(user.id);
                if (!timeAllowed) {
                    this.securityMetrics.accessDenials++;
                    await this.logSecurityEvent({
                        type: "ACCESS_DENIED",
                        user: username,
                        reason: "TIME_RESTRICTED",
                        ip: clientInfo.ip,
                    });
                    throw new Error("Access denied at this time");
                }
            }
            // Create session
            const session = await this.createSession(user, clientInfo);
            // Reset failed login attempts
            if (user.failed_login_attempts > 0) {
                await this.updateUserFailedAttempts(user.id, 0);
            }
            this.securityMetrics.successfulLogins++;
            this.securityMetrics.totalLogins++;
            await this.logSecurityEvent({
                type: "LOGIN_SUCCESS",
                user: username,
                session_id: session.id,
                ip: clientInfo.ip,
            });
            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    permissions: userRole.permissions,
                    dataClassifications: userRole.dataClassifications,
                },
                session,
                token: session.token,
            };
        }
        catch (error) {
            this.logger.error("Authentication failed:", error);
            throw error;
        }
    }
    async createSession(user, clientInfo) {
        const sessionId = uuidv4();
        const sessionPolicy = this.securityRules.get("SESSION_POLICY");
        const session = {
            id: sessionId,
            userId: user.id,
            username: user.username,
            role: user.role,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + sessionPolicy.maxDuration),
            lastActivity: new Date(),
            ipAddress: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            location: clientInfo.location,
            mfaVerified: !!clientInfo.mfaToken,
            permissions: this.roles.get(user.role).permissions,
            dataClassifications: this.roles.get(user.role).dataClassifications,
            token: this.generateSessionToken(sessionId, user.id),
        };
        // Check concurrent session limit
        const userRole = this.roles.get(user.role);
        const activeSessions = Array.from(this.sessionManager.values()).filter((s) => s.userId === user.id && s.expiresAt > new Date());
        if (activeSessions.length >= userRole.maxConcurrentSessions) {
            // Terminate oldest session
            const oldestSession = activeSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
            await this.terminateSession(oldestSession.id, "CONCURRENT_LIMIT_EXCEEDED");
        }
        this.sessionManager.set(sessionId, session);
        this.securityMetrics.activeSessions++;
        // Store in Redis for distributed access
        await this.redisClient.setex(`session:${sessionId}`, sessionPolicy.maxDuration / 1000, JSON.stringify(session));
        return session;
    }
    generateSessionToken(sessionId, userId) {
        const payload = {
            sessionId,
            userId,
            iat: Math.floor(Date.now() / 1000),
        };
        const secret = process.env.JWT_SECRET || "test-secret";
        return jwt.sign(payload, secret, { expiresIn: "24h" });
    }
    async verifySession(token) {
        try {
            const secret = process.env.JWT_SECRET || "test-secret";
            const decoded = jwt.verify(token, secret);
            const session = await this.getSession(decoded.sessionId);
            if (!session) {
                throw new Error("Session not found");
            }
            if (session.expiresAt <= new Date()) {
                await this.terminateSession(session.id, "EXPIRED");
                throw new Error("Session expired");
            }
            const sessionPolicy = this.securityRules.get("SESSION_POLICY");
            const idleTime = Date.now() - session.lastActivity.getTime();
            if (idleTime > sessionPolicy.idleTimeout) {
                await this.terminateSession(session.id, "IDLE_TIMEOUT");
                throw new Error("Session timed out due to inactivity");
            }
            // Update last activity
            session.lastActivity = new Date();
            await this.updateSession(session);
            return session;
        }
        catch (error) {
            this.logger.error("Session verification failed:", error);
            throw error;
        }
    }
    async checkPermission(sessionToken, requiredPermission, resource = null) {
        try {
            const session = await this.verifySession(sessionToken);
            // Check if user has the required permission
            if (!session.permissions.includes(requiredPermission)) {
                await this.logSecurityEvent({
                    type: "ACCESS_DENIED",
                    user: session.username,
                    permission: requiredPermission,
                    resource,
                    session_id: session.id,
                    ip: session.ipAddress,
                });
                this.securityMetrics.accessDenials++;
                return { allowed: false, reason: "INSUFFICIENT_PERMISSIONS" };
            }
            // Check data classification access
            if (resource && resource.dataClassification) {
                if (!session.dataClassifications.includes(resource.dataClassification)) {
                    await this.logSecurityEvent({
                        type: "ACCESS_DENIED",
                        user: session.username,
                        reason: "DATA_CLASSIFICATION_DENIED",
                        classification: resource.dataClassification,
                        resource: resource.id,
                        session_id: session.id,
                        ip: session.ipAddress,
                        severity: "HIGH",
                    });
                    this.securityMetrics.accessDenials++;
                    return { allowed: false, reason: "DATA_CLASSIFICATION_DENIED" };
                }
            }
            // Log access granted
            await this.logSecurityEvent({
                type: "ACCESS_GRANTED",
                user: session.username,
                permission: requiredPermission,
                resource: resource?.id,
                session_id: session.id,
                ip: session.ipAddress,
            });
            return { allowed: true, session };
        }
        catch (error) {
            this.logger.error("Permission check failed:", error);
            return { allowed: false, reason: "SESSION_INVALID" };
        }
    }
    // Audit logging methods
    async logSecurityEvent(event) {
        const auditEvent = {
            id: uuidv4(),
            timestamp: new Date(),
            type: event.type,
            user: event.user,
            session_id: event.session_id,
            ip_address: event.ip,
            user_agent: event.userAgent,
            resource: event.resource,
            permission: event.permission,
            outcome: event.outcome ||
                (event.type.includes("DENIED") || event.type.includes("FAILED")
                    ? "FAILURE"
                    : "SUCCESS"),
            severity: event.severity || "LOW",
            details: event.details || {},
            compliance_flags: this.determineComplianceFlags(event),
        };
        // Store in memory for quick access
        this.auditLog.push(auditEvent);
        // Store in database for persistence
        await this.storeAuditEvent(auditEvent);
        // Store in Redis for real-time monitoring
        await this.redisClient.lpush("audit_events", JSON.stringify(auditEvent));
        await this.redisClient.ltrim("audit_events", 0, 9999); // Keep last 10k events
        this.securityMetrics.auditEvents++;
        // Emit event for real-time monitoring
        this.emit("securityEvent", auditEvent);
        // Check for security patterns
        await this.analyzeSecurityPatterns(auditEvent);
        return auditEvent;
    }
    determineComplianceFlags(event) {
        const flags = [];
        // SOC 2 requirements
        if ([
            "LOGIN_SUCCESS",
            "LOGIN_FAILED",
            "ACCESS_GRANTED",
            "ACCESS_DENIED",
        ].includes(event.type)) {
            flags.push("SOC2_ACCESS_LOGGING");
        }
        // FISMA requirements
        if (event.severity === "HIGH" || event.type.includes("SECURITY")) {
            flags.push("FISMA_SECURITY_EVENT");
        }
        // GDPR requirements
        if (event.resource && event.resource.includes("PII")) {
            flags.push("GDPR_PERSONAL_DATA");
        }
        return flags;
    }
    async analyzeSecurityPatterns(event) {
        // Brute force detection
        if (event.type === "LOGIN_FAILED") {
            const recentFailures = await this.getRecentFailedLogins(event.user, 5 * 60 * 1000); // 5 minutes
            if (recentFailures.length >= 5) {
                await this.triggerSecurityAlert({
                    type: "BRUTE_FORCE_DETECTED",
                    user: event.user,
                    ip: event.ip_address,
                    attempts: recentFailures.length,
                    severity: "HIGH",
                });
            }
        }
        // Suspicious access patterns
        if (event.type === "ACCESS_GRANTED") {
            await this.analyzeAccessPatterns(event);
        }
        // Concurrent session anomalies
        if (event.type === "LOGIN_SUCCESS") {
            await this.analyzeSessionAnomalies(event);
        }
    }
    async triggerSecurityAlert(alert) {
        this.securityMetrics.securityViolations++;
        const securityAlert = {
            id: uuidv4(),
            type: alert.type,
            severity: alert.severity,
            timestamp: new Date(),
            details: alert,
            status: "ACTIVE",
            assignee: null,
            actions_taken: [],
        };
        // Store alert
        await this.storeSecurityAlert(securityAlert);
        // Emit for real-time notifications
        this.emit("securityAlert", securityAlert);
        // Auto-response based on severity
        if (alert.severity === "CRITICAL") {
            await this.executeAutoResponse(alert);
        }
        return securityAlert;
    }
    // User management methods
    async createUser(userData, creatorSession) {
        // Check permissions
        const permissionCheck = await this.checkPermission(creatorSession.token, "USER_MANAGEMENT");
        if (!permissionCheck.allowed) {
            throw new Error("Insufficient permissions to create user");
        }
        // Validate user data
        this.validateUserData(userData);
        // Hash password
        const passwordHash = await argon2.hash(userData.password);
        const user = {
            id: uuidv4(),
            username: userData.username,
            email: userData.email,
            password_hash: passwordHash,
            role: userData.role,
            status: "ACTIVE",
            created_at: new Date(),
            created_by: creatorSession.userId,
            last_password_change: new Date(),
            failed_login_attempts: 0,
            mfa_enabled: userData.mfaEnabled || false,
            data_classifications: this.roles.get(userData.role).dataClassifications,
        };
        await this.storeUser(user);
        await this.logSecurityEvent({
            type: "USER_CREATED",
            user: creatorSession.username,
            target_user: user.username,
            role: user.role,
            session_id: creatorSession.id,
            ip: creatorSession.ipAddress,
        });
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        };
    }
    validateUserData(userData) {
        if (!userData.username || userData.username.length < 3) {
            throw new Error("Username must be at least 3 characters");
        }
        if (!userData.email || !this.isValidEmail(userData.email)) {
            throw new Error("Valid email address required");
        }
        if (!userData.role || !this.roles.has(userData.role)) {
            throw new Error("Valid role required");
        }
        // Password validation
        const passwordPolicy = this.securityRules.get("PASSWORD_POLICY");
        if (!this.validatePassword(userData.password, passwordPolicy)) {
            throw new Error("Password does not meet policy requirements");
        }
    }
    validatePassword(password, policy) {
        if (!password || password.length < policy.minLength) {
            return false;
        }
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            return false;
        }
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            return false;
        }
        if (policy.requireNumbers && !/\d/.test(password)) {
            return false;
        }
        if (policy.requireSpecialChars &&
            !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return false;
        }
        return true;
    }
    // API Token management
    async generateApiToken(userId, permissions = [], expiresIn = "24h") {
        const tokenId = uuidv4();
        const tokenSecret = crypto.randomBytes(32).toString("hex");
        const apiToken = {
            id: tokenId,
            userId,
            secret: await argon2.hash(tokenSecret),
            permissions,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.parseTimeToMs(expiresIn)),
            lastUsed: null,
            usageCount: 0,
            status: "ACTIVE",
        };
        this.apiTokens.set(tokenId, apiToken);
        await this.storeApiToken(apiToken);
        // Return the token with secret (only time it's visible)
        return {
            tokenId,
            token: `${tokenId}.${tokenSecret}`,
            permissions,
            expiresAt: apiToken.expiresAt,
        };
    }
    async verifyApiToken(tokenString) {
        const [tokenId, tokenSecret] = tokenString.split(".");
        if (!tokenId || !tokenSecret) {
            throw new Error("Invalid token format");
        }
        const apiToken = this.apiTokens.get(tokenId) || (await this.getApiToken(tokenId));
        if (!apiToken || apiToken.status !== "ACTIVE") {
            throw new Error("Invalid or inactive token");
        }
        if (apiToken.expiresAt <= new Date()) {
            throw new Error("Token expired");
        }
        const secretValid = await argon2.verify(apiToken.secret, tokenSecret);
        if (!secretValid) {
            throw new Error("Invalid token secret");
        }
        // Update usage statistics
        apiToken.lastUsed = new Date();
        apiToken.usageCount++;
        await this.updateApiToken(apiToken);
        return apiToken;
    }
    // Compliance and reporting
    async generateComplianceReport(framework, dateRange) {
        const complianceFramework = this.complianceFrameworks.get(framework);
        if (!complianceFramework) {
            throw new Error(`Unknown compliance framework: ${framework}`);
        }
        const { startDate, endDate } = dateRange;
        const auditEvents = await this.getAuditEvents({
            startDate,
            endDate,
            framework,
        });
        const report = {
            framework,
            name: complianceFramework.name,
            reportPeriod: { startDate, endDate },
            generatedAt: new Date(),
            summary: {
                totalEvents: auditEvents.length,
                complianceScore: await this.calculateComplianceScore(framework, auditEvents),
                violations: auditEvents.filter((e) => e.compliance_violations?.length > 0).length,
                recommendations: [],
            },
            eventBreakdown: this.analyzeEventBreakdown(auditEvents),
            riskAssessment: await this.assessComplianceRisks(framework, auditEvents),
            recommendations: await this.generateComplianceRecommendations(framework, auditEvents),
        };
        return report;
    }
    async calculateComplianceScore(framework, auditEvents) {
        const requirements = this.complianceFrameworks.get(framework).requirements;
        let score = 100;
        // Deduct points for various compliance issues
        const violations = auditEvents.filter((e) => e.compliance_violations?.length > 0);
        score -= violations.length * 5; // -5 points per violation
        const failedLogins = auditEvents.filter((e) => e.type === "LOGIN_FAILED");
        if (failedLogins.length > 100) {
            score -= 10; // Excessive failed logins
        }
        const accessDenials = auditEvents.filter((e) => e.type === "ACCESS_DENIED");
        if (accessDenials.length > 50) {
            score -= 5; // Access control issues
        }
        return Math.max(0, score);
    }
    // Security monitoring methods
    monitorSecurityThreats() {
        // Monitor for suspicious activities
        this.detectAnomalousLogin();
        this.monitorDataAccess();
        this.checkSystemHealth();
    }
    async detectAnomalousLogin() {
        const recentLogins = this.auditLog
            .filter((event) => event.type === "LOGIN_SUCCESS")
            .filter((event) => Date.now() - event.timestamp.getTime() < 60 * 60 * 1000); // Last hour
        // Group by user
        const userLogins = {};
        recentLogins.forEach((login) => {
            if (!userLogins[login.user]) {
                userLogins[login.user] = [];
            }
            userLogins[login.user].push(login);
        });
        // Check for anomalies
        Object.entries(userLogins).forEach(([user, logins]) => {
            // Multiple locations
            const locations = new Set(logins.map((l) => l.ip_address));
            if (locations.size > 3) {
                this.triggerSecurityAlert({
                    type: "ANOMALOUS_LOGIN_LOCATIONS",
                    user,
                    locations: Array.from(locations),
                    severity: "MEDIUM",
                });
            }
            // Unusual time
            const currentHour = new Date().getHours();
            if ((currentHour < 6 || currentHour > 22) && logins.length > 1) {
                this.triggerSecurityAlert({
                    type: "UNUSUAL_LOGIN_TIME",
                    user,
                    time: currentHour,
                    severity: "LOW",
                });
            }
        });
    }
    cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];
        for (const [sessionId, session] of this.sessionManager) {
            if (session.expiresAt <= now) {
                expiredSessions.push(sessionId);
            }
        }
        expiredSessions.forEach((sessionId) => {
            this.sessionManager.delete(sessionId);
            this.redisClient.del(`session:${sessionId}`);
            this.securityMetrics.activeSession--;
        });
    }
    // Database interaction methods (stubbed for implementation)
    async getUserByUsername(username) {
        const client = await this.postgresPool.connect();
        try {
            const result = await client.query("SELECT * FROM users WHERE username = $1", [username]);
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    async storeUser(user) {
        const client = await this.postgresPool.connect();
        try {
            await client.query(`
        INSERT INTO users (id, username, email, password_hash, role, status, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                user.id,
                user.username,
                user.email,
                user.password_hash,
                user.role,
                user.status,
                user.created_at,
                user.created_by,
            ]);
        }
        finally {
            client.release();
        }
    }
    async storeAuditEvent(event) {
        const client = await this.postgresPool.connect();
        try {
            await client.query(`
        INSERT INTO audit_events (id, timestamp, type, user_id, session_id, ip_address, 
                                resource, permission, outcome, severity, details, compliance_flags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
                event.id,
                event.timestamp,
                event.type,
                event.user,
                event.session_id,
                event.ip_address,
                event.resource,
                event.permission,
                event.outcome,
                event.severity,
                JSON.stringify(event.details),
                event.compliance_flags,
            ]);
        }
        finally {
            client.release();
        }
    }
    async getSession(sessionId) {
        // Try memory first
        let session = this.sessionManager.get(sessionId);
        if (!session) {
            // Try Redis
            const sessionData = await this.redisClient.get(`session:${sessionId}`);
            if (sessionData) {
                session = JSON.parse(sessionData);
                session.createdAt = new Date(session.createdAt);
                session.expiresAt = new Date(session.expiresAt);
                session.lastActivity = new Date(session.lastActivity);
                this.sessionManager.set(sessionId, session);
            }
        }
        return session;
    }
    async updateSession(session) {
        this.sessionManager.set(session.id, session);
        const sessionPolicy = this.securityRules.get("SESSION_POLICY");
        await this.redisClient.setex(`session:${session.id}`, sessionPolicy.maxDuration / 1000, JSON.stringify(session));
    }
    async terminateSession(sessionId, reason) {
        const session = await this.getSession(sessionId);
        if (session) {
            await this.logSecurityEvent({
                type: "SESSION_TERMINATED",
                user: session.username,
                session_id: sessionId,
                reason,
                ip: session.ipAddress,
            });
        }
        this.sessionManager.delete(sessionId);
        await this.redisClient.del(`session:${sessionId}`);
        this.securityMetrics.activeSessions--;
    }
    // Utility methods
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    parseTimeToMs(timeStr) {
        const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        const match = timeStr.match(/^(\d+)([smhd])$/);
        if (!match)
            return 24 * 60 * 60 * 1000; // Default 24 hours
        return parseInt(match[1]) * units[match[2]];
    }
    // Public API methods
    getSecurityMetrics() {
        const successRate = this.securityMetrics.totalLogins > 0
            ? ((this.securityMetrics.successfulLogins /
                this.securityMetrics.totalLogins) *
                100).toFixed(2)
            : "0";
        return {
            ...this.securityMetrics,
            successRate,
            auditLogSize: this.auditLog.length,
        };
    }
    getAvailableRoles() {
        return Array.from(this.roles.values());
    }
    getAvailablePermissions() {
        return Array.from(this.permissions.values());
    }
    getComplianceFrameworks() {
        return Array.from(this.complianceFrameworks.values());
    }
    async getAuditEvents(filters = {}) {
        // Implementation would query database with filters
        return this.auditLog.filter((event) => {
            if (filters.startDate && event.timestamp < filters.startDate)
                return false;
            if (filters.endDate && event.timestamp > filters.endDate)
                return false;
            if (filters.user && event.user !== filters.user)
                return false;
            if (filters.type && event.type !== filters.type)
                return false;
            return true;
        });
    }
    // Placeholder methods for full implementation
    async verifyMFA(userId, token) {
        return true;
    }
    async checkLocationAccess(userId, ip) {
        return true;
    }
    async checkTimeBasedAccess(userId) {
        return true;
    }
    async updateUserFailedAttempts(userId, attempts) { }
    async lockUserAccount(userId, duration) { }
    async getRecentFailedLogins(user, timeWindow) {
        return [];
    }
    async analyzeAccessPatterns(event) { }
    async analyzeSessionAnomalies(event) { }
    async executeAutoResponse(alert) { }
    async storeSecurityAlert(alert) { }
    async storeApiToken(token) { }
    async getApiToken(tokenId) {
        return this.apiTokens.get(tokenId);
    }
    async updateApiToken(token) { }
    async assessComplianceRisks(framework, events) {
        return [];
    }
    async generateComplianceRecommendations(framework, events) {
        return [];
    }
    analyzeEventBreakdown(events) {
        return {};
    }
    monitorDataAccess() { }
    checkSystemHealth() { }
    rotateAuditLogs() { }
    generateSecurityReport() { }
    checkComplianceStatus() { }
    updateThreatIntelligence() { }
}
module.exports = EnterpriseSecurityService;
//# sourceMappingURL=EnterpriseSecurityService.js.map