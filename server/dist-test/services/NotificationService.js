/**
 * Real-time Notification and Alerting Service - P1 Priority
 * Comprehensive notification system with multiple channels and intelligent routing
 */
const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");
class NotificationService extends EventEmitter {
    constructor(socketIO, postgresPool, redisClient, securityService, logger) {
        super();
        this.socketIO = socketIO;
        this.postgresPool = postgresPool;
        this.redisClient = redisClient;
        this.securityService = securityService;
        this.logger = logger;
        this.alertChannels = new Map();
        this.notificationTemplates = new Map();
        this.userPreferences = new Map();
        this.alertRules = new Map();
        this.activeAlerts = new Map();
        this.notificationQueue = [];
        this.deliveryChannels = new Map();
        this.metrics = {
            totalNotifications: 0,
            deliveredNotifications: 0,
            failedNotifications: 0,
            activeAlerts: 0,
            alertRulesTriggered: 0,
            averageDeliveryTime: 0,
            channelStats: new Map(),
        };
        this.initializeAlertChannels();
        this.initializeNotificationTemplates();
        this.initializeAlertRules();
        this.initializeDeliveryChannels();
        this.startNotificationProcessing();
        this.setupEventListeners();
    }
    initializeAlertChannels() {
        this.alertChannels.set("REAL_TIME", {
            id: "REAL_TIME",
            name: "Real-time WebSocket",
            description: "Immediate notifications via WebSocket connection",
            priority: "IMMEDIATE",
            deliveryMethod: "websocket",
            maxRetries: 0,
            enabled: true,
        });
        this.alertChannels.set("EMAIL", {
            id: "EMAIL",
            name: "Email Notifications",
            description: "Email delivery for important alerts",
            priority: "HIGH",
            deliveryMethod: "email",
            maxRetries: 3,
            retryDelay: 60000, // 1 minute
            enabled: true,
        });
        this.alertChannels.set("SMS", {
            id: "SMS",
            name: "SMS Alerts",
            description: "SMS delivery for critical alerts",
            priority: "CRITICAL",
            deliveryMethod: "sms",
            maxRetries: 2,
            retryDelay: 30000, // 30 seconds
            enabled: true,
        });
        this.alertChannels.set("PUSH", {
            id: "PUSH",
            name: "Push Notifications",
            description: "Mobile push notifications",
            priority: "MEDIUM",
            deliveryMethod: "push",
            maxRetries: 2,
            retryDelay: 120000, // 2 minutes
            enabled: true,
        });
        this.alertChannels.set("WEBHOOK", {
            id: "WEBHOOK",
            name: "Webhook Integration",
            description: "HTTP webhook for external systems",
            priority: "HIGH",
            deliveryMethod: "webhook",
            maxRetries: 3,
            retryDelay: 60000,
            enabled: true,
        });
        this.alertChannels.set("IN_APP", {
            id: "IN_APP",
            name: "In-Application",
            description: "In-app notification center",
            priority: "LOW",
            deliveryMethod: "in_app",
            maxRetries: 1,
            retryDelay: 5000,
            enabled: true,
        });
    }
    initializeNotificationTemplates() {
        this.notificationTemplates.set("SECURITY_ALERT", {
            id: "SECURITY_ALERT",
            name: "Security Alert",
            category: "SECURITY",
            priority: "CRITICAL",
            channels: ["REAL_TIME", "EMAIL", "SMS"],
            template: {
                title: "Security Alert: {{alertType}}",
                body: "A {{severity}} security event has been detected: {{description}}. Immediate attention required.",
                actionUrl: "/security/alerts/{{alertId}}",
                actions: [
                    {
                        label: "View Details",
                        action: "view_alert",
                        url: "/security/alerts/{{alertId}}",
                    },
                    { label: "Acknowledge", action: "acknowledge_alert" },
                ],
            },
            escalation: {
                enabled: true,
                timeouts: [300000, 900000], // 5 min, 15 min
                recipients: ["security_team", "system_admin"],
            },
        });
        this.notificationTemplates.set("INVESTIGATION_UPDATE", {
            id: "INVESTIGATION_UPDATE",
            name: "Investigation Update",
            category: "INVESTIGATION",
            priority: "MEDIUM",
            channels: ["REAL_TIME", "IN_APP", "EMAIL"],
            template: {
                title: "Investigation Updated: {{investigationTitle}}",
                body: 'Investigation "{{investigationTitle}}" has been updated. {{updateType}}: {{updateDescription}}',
                actionUrl: "/investigations/{{investigationId}}",
                actions: [
                    {
                        label: "View Investigation",
                        action: "view_investigation",
                        url: "/investigations/{{investigationId}}",
                    },
                ],
            },
        });
        this.notificationTemplates.set("ENTITY_DISCOVERY", {
            id: "ENTITY_DISCOVERY",
            name: "New Entity Discovered",
            category: "DISCOVERY",
            priority: "MEDIUM",
            channels: ["REAL_TIME", "IN_APP"],
            template: {
                title: "New Entity Discovered: {{entityLabel}}",
                body: 'A new {{entityType}} entity "{{entityLabel}}" has been discovered in investigation "{{investigationTitle}}".',
                actionUrl: "/entities/{{entityId}}",
                actions: [
                    {
                        label: "View Entity",
                        action: "view_entity",
                        url: "/entities/{{entityId}}",
                    },
                    { label: "Add to Investigation", action: "add_to_investigation" },
                ],
            },
        });
        this.notificationTemplates.set("ANALYTICS_COMPLETE", {
            id: "ANALYTICS_COMPLETE",
            name: "Analytics Job Complete",
            category: "ANALYTICS",
            priority: "LOW",
            channels: ["REAL_TIME", "IN_APP"],
            template: {
                title: "Analytics Complete: {{jobType}}",
                body: "Your {{jobType}} analytics job has completed successfully. {{resultsCount}} results found.",
                actionUrl: "/analytics/results/{{jobId}}",
                actions: [
                    {
                        label: "View Results",
                        action: "view_results",
                        url: "/analytics/results/{{jobId}}",
                    },
                ],
            },
        });
        this.notificationTemplates.set("REPORT_READY", {
            id: "REPORT_READY",
            name: "Report Ready",
            category: "REPORTING",
            priority: "MEDIUM",
            channels: ["EMAIL", "IN_APP"],
            template: {
                title: "Report Ready: {{reportName}}",
                body: 'Your requested report "{{reportName}}" is ready for download.',
                actionUrl: "/reports/{{reportId}}",
                actions: [
                    {
                        label: "Download Report",
                        action: "download_report",
                        url: "/reports/{{reportId}}/download",
                    },
                    {
                        label: "View Online",
                        action: "view_report",
                        url: "/reports/{{reportId}}",
                    },
                ],
            },
        });
        this.notificationTemplates.set("SYSTEM_MAINTENANCE", {
            id: "SYSTEM_MAINTENANCE",
            name: "System Maintenance",
            category: "SYSTEM",
            priority: "HIGH",
            channels: ["EMAIL", "IN_APP", "PUSH"],
            template: {
                title: "Scheduled Maintenance: {{maintenanceType}}",
                body: "System maintenance is scheduled for {{scheduledTime}}. Expected duration: {{duration}}. {{description}}",
                actionUrl: "/system/maintenance",
                actions: [
                    {
                        label: "View Details",
                        action: "view_maintenance",
                        url: "/system/maintenance",
                    },
                ],
            },
        });
        this.notificationTemplates.set("ANOMALY_DETECTED", {
            id: "ANOMALY_DETECTED",
            name: "Anomaly Detected",
            category: "ANALYTICS",
            priority: "HIGH",
            channels: ["REAL_TIME", "EMAIL", "IN_APP"],
            template: {
                title: "Anomaly Detected: {{anomalyType}}",
                body: "An anomaly has been detected in {{context}}. Anomaly score: {{score}}. {{description}}",
                actionUrl: "/analytics/anomalies/{{anomalyId}}",
                actions: [
                    {
                        label: "Investigate",
                        action: "investigate_anomaly",
                        url: "/analytics/anomalies/{{anomalyId}}",
                    },
                    { label: "Mark as False Positive", action: "mark_false_positive" },
                ],
            },
        });
        this.notificationTemplates.set("COLLABORATION_INVITE", {
            id: "COLLABORATION_INVITE",
            name: "Collaboration Invitation",
            category: "COLLABORATION",
            priority: "MEDIUM",
            channels: ["EMAIL", "IN_APP"],
            template: {
                title: "You have been invited to collaborate",
                body: '{{inviterName}} has invited you to collaborate on "{{investigationTitle}}".',
                actionUrl: "/investigations/{{investigationId}}",
                actions: [
                    { label: "Accept", action: "accept_collaboration" },
                    { label: "Decline", action: "decline_collaboration" },
                ],
            },
        });
    }
    initializeAlertRules() {
        this.alertRules.set("HIGH_RISK_ENTITY", {
            id: "HIGH_RISK_ENTITY",
            name: "High Risk Entity Detection",
            description: "Triggers when an entity is classified as high risk",
            enabled: true,
            conditions: [
                { field: "entity.riskLevel", operator: "equals", value: "HIGH" },
                {
                    field: "entity.type",
                    operator: "in",
                    value: ["PERSON", "ORGANIZATION"],
                },
            ],
            actions: [
                {
                    type: "NOTIFICATION",
                    template: "SECURITY_ALERT",
                    recipients: ["assigned_analyst", "supervisor"],
                    urgency: "HIGH",
                },
            ],
            cooldown: 3600000, // 1 hour
            lastTriggered: new Map(),
        });
        this.alertRules.set("MULTIPLE_FAILED_LOGINS", {
            id: "MULTIPLE_FAILED_LOGINS",
            name: "Multiple Failed Login Attempts",
            description: "Triggers on multiple failed login attempts",
            enabled: true,
            conditions: [
                { field: "event.type", operator: "equals", value: "LOGIN_FAILED" },
                {
                    field: "event.count",
                    operator: "greater_than",
                    value: 5,
                    timeWindow: 300000,
                }, // 5 minutes
            ],
            actions: [
                {
                    type: "NOTIFICATION",
                    template: "SECURITY_ALERT",
                    recipients: ["security_team"],
                    urgency: "CRITICAL",
                },
                {
                    type: "AUTO_RESPONSE",
                    action: "LOCK_ACCOUNT",
                },
            ],
        });
        this.alertRules.set("LARGE_DATA_EXPORT", {
            id: "LARGE_DATA_EXPORT",
            name: "Large Data Export Alert",
            description: "Triggers on large data export operations",
            enabled: true,
            conditions: [
                { field: "export.size", operator: "greater_than", value: 100000000 }, // 100MB
                { field: "export.type", operator: "not_equals", value: "SCHEDULED" },
            ],
            actions: [
                {
                    type: "NOTIFICATION",
                    template: "SECURITY_ALERT",
                    recipients: ["data_protection_officer", "supervisor"],
                    urgency: "HIGH",
                },
            ],
        });
        this.alertRules.set("UNUSUAL_ACCESS_PATTERN", {
            id: "UNUSUAL_ACCESS_PATTERN",
            name: "Unusual Access Pattern",
            description: "Triggers on unusual access patterns",
            enabled: true,
            conditions: [
                {
                    field: "access.time",
                    operator: "outside_hours",
                    value: { start: 6, end: 22 },
                },
                { field: "access.location", operator: "anomalous", threshold: 0.8 },
            ],
            actions: [
                {
                    type: "NOTIFICATION",
                    template: "SECURITY_ALERT",
                    recipients: ["user", "security_team"],
                    urgency: "MEDIUM",
                },
            ],
        });
        this.alertRules.set("ANALYTICS_ANOMALY", {
            id: "ANALYTICS_ANOMALY",
            name: "Analytics Anomaly Detection",
            description: "Triggers when analytics detects anomalies",
            enabled: true,
            conditions: [
                { field: "anomaly.score", operator: "greater_than", value: 0.85 },
                {
                    field: "anomaly.type",
                    operator: "in",
                    value: ["BEHAVIORAL", "STRUCTURAL", "TEMPORAL"],
                },
            ],
            actions: [
                {
                    type: "NOTIFICATION",
                    template: "ANOMALY_DETECTED",
                    recipients: ["investigation_team"],
                    urgency: "HIGH",
                },
            ],
        });
    }
    initializeDeliveryChannels() {
        this.deliveryChannels.set("websocket", {
            name: "WebSocket",
            deliver: this.deliverWebSocketNotification.bind(this),
            validate: this.validateWebSocketDelivery.bind(this),
        });
        this.deliveryChannels.set("email", {
            name: "Email",
            deliver: this.deliverEmailNotification.bind(this),
            validate: this.validateEmailDelivery.bind(this),
        });
        this.deliveryChannels.set("sms", {
            name: "SMS",
            deliver: this.deliverSMSNotification.bind(this),
            validate: this.validateSMSDelivery.bind(this),
        });
        this.deliveryChannels.set("push", {
            name: "Push",
            deliver: this.deliverPushNotification.bind(this),
            validate: this.validatePushDelivery.bind(this),
        });
        this.deliveryChannels.set("webhook", {
            name: "Webhook",
            deliver: this.deliverWebhookNotification.bind(this),
            validate: this.validateWebhookDelivery.bind(this),
        });
        this.deliveryChannels.set("in_app", {
            name: "In-App",
            deliver: this.deliverInAppNotification.bind(this),
            validate: this.validateInAppDelivery.bind(this),
        });
    }
    startNotificationProcessing() {
        // Process notification queue
        setInterval(() => {
            this.processNotificationQueue();
        }, 5000); // Every 5 seconds
        // Check for escalations
        setInterval(() => {
            this.checkAlertEscalations();
        }, 60000); // Every minute
        // Cleanup old notifications
        setInterval(() => {
            this.cleanupOldNotifications();
        }, 24 * 60 * 60 * 1000); // Daily
    }
    setupEventListeners() {
        // Listen to various system events
        if (this.securityService) {
            this.securityService.on("securityEvent", (event) => {
                this.handleSecurityEvent(event);
            });
            this.securityService.on("securityAlert", (alert) => {
                this.handleSecurityAlert(alert);
            });
        }
        // Listen to socket connections for real-time delivery
        if (this.socketIO) {
            this.socketIO.on("connection", (socket) => {
                socket.on("subscribe_notifications", (data) => {
                    this.handleNotificationSubscription(socket, data);
                });
                socket.on("acknowledge_notification", (notificationId) => {
                    this.acknowledgeNotification(notificationId, socket.userId);
                });
            });
        }
    }
    // Core notification methods
    async sendNotification(notificationData) {
        const notification = {
            id: uuidv4(),
            templateId: notificationData.templateId,
            recipients: notificationData.recipients,
            data: notificationData.data,
            priority: notificationData.priority || "MEDIUM",
            channels: notificationData.channels || [],
            createdAt: new Date(),
            status: "QUEUED",
            attempts: 0,
            metadata: notificationData.metadata || {},
        };
        // Apply template
        const template = this.notificationTemplates.get(notification.templateId);
        if (template) {
            notification.title = this.applyTemplate(template.template.title, notification.data);
            notification.body = this.applyTemplate(template.template.body, notification.data);
            notification.actionUrl = this.applyTemplate(template.template.actionUrl, notification.data);
            notification.actions = template.template.actions.map((action) => ({
                ...action,
                url: action.url
                    ? this.applyTemplate(action.url, notification.data)
                    : undefined,
            }));
            if (notification.channels.length === 0) {
                notification.channels = template.channels;
            }
            notification.priority = template.priority;
            notification.category = template.category;
        }
        // Determine recipients based on user preferences
        notification.deliveries = [];
        for (const recipient of notification.recipients) {
            const deliveries = await this.determineDeliveryChannels(recipient, notification);
            notification.deliveries.push(...deliveries);
        }
        // Queue for processing
        this.notificationQueue.push(notification);
        this.metrics.totalNotifications++;
        this.emit("notificationQueued", notification);
        return notification;
    }
    async processNotificationQueue() {
        if (this.notificationQueue.length === 0)
            return;
        const batch = this.notificationQueue.splice(0, 10); // Process 10 at a time
        for (const notification of batch) {
            try {
                await this.processNotification(notification);
            }
            catch (error) {
                this.logger.error("Failed to process notification:", error);
                notification.status = "FAILED";
                notification.error = error.message;
                this.metrics.failedNotifications++;
            }
        }
    }
    async processNotification(notification) {
        const startTime = Date.now();
        notification.status = "PROCESSING";
        const deliveryPromises = notification.deliveries.map((delivery) => this.deliverToChannel(notification, delivery));
        const results = await Promise.allSettled(deliveryPromises);
        let successCount = 0;
        let failureCount = 0;
        results.forEach((result, index) => {
            const delivery = notification.deliveries[index];
            if (result.status === "fulfilled") {
                delivery.status = "DELIVERED";
                delivery.deliveredAt = new Date();
                successCount++;
            }
            else {
                delivery.status = "FAILED";
                delivery.error = result.reason.message;
                delivery.attempts = (delivery.attempts || 0) + 1;
                failureCount++;
            }
        });
        notification.status = successCount > 0 ? "DELIVERED" : "FAILED";
        notification.deliveryTime = Date.now() - startTime;
        if (successCount > 0) {
            this.metrics.deliveredNotifications++;
            this.updateDeliveryTimeMetric(notification.deliveryTime);
        }
        // Store notification in database
        await this.storeNotification(notification);
        // Handle escalation for failed critical notifications
        if (failureCount > 0 && notification.priority === "CRITICAL") {
            await this.handleFailedCriticalNotification(notification);
        }
        this.emit("notificationProcessed", notification);
    }
    async deliverToChannel(notification, delivery) {
        const channel = this.deliveryChannels.get(delivery.channel);
        if (!channel) {
            throw new Error(`Unknown delivery channel: ${delivery.channel}`);
        }
        // Validate delivery
        const isValid = await channel.validate(delivery);
        if (!isValid) {
            throw new Error(`Invalid delivery configuration for ${delivery.channel}`);
        }
        // Track channel stats
        if (!this.metrics.channelStats.has(delivery.channel)) {
            this.metrics.channelStats.set(delivery.channel, {
                delivered: 0,
                failed: 0,
            });
        }
        try {
            const result = await channel.deliver(notification, delivery);
            this.metrics.channelStats.get(delivery.channel).delivered++;
            return result;
        }
        catch (error) {
            this.metrics.channelStats.get(delivery.channel).failed++;
            throw error;
        }
    }
    // Delivery channel implementations
    async deliverWebSocketNotification(notification, delivery) {
        const socketMessage = {
            type: "notification",
            id: notification.id,
            title: notification.title,
            body: notification.body,
            category: notification.category,
            priority: notification.priority,
            actionUrl: notification.actionUrl,
            actions: notification.actions,
            createdAt: notification.createdAt,
            metadata: notification.metadata,
        };
        // Broadcast to investigation room if provided
        if (delivery.investigationId) {
            const room = `investigation_${delivery.investigationId}`;
            if (typeof this.socketIO.sendToRoom === "function") {
                this.socketIO.sendToRoom(room, "notification", socketMessage);
            }
            else if (typeof this.socketIO.to === "function") {
                this.socketIO.to(room).emit("notification", socketMessage);
            }
            else {
                // Fallback: iterate sockets in room
                const roomSet = this.socketIO.sockets?.adapter?.rooms?.get(room) || new Set();
                roomSet.forEach((socketId) => {
                    const socket = this.socketIO.sockets?.sockets?.get(socketId);
                    socket?.emit?.("notification", socketMessage);
                });
            }
            return { delivered: true };
        }
        // Presence check for multiple users
        if (Array.isArray(delivery.userId)) {
            let delivered = 0;
            let failed = 0;
            const offline = [];
            for (const uid of delivery.userId) {
                const sockets = this.getUserSockets(uid) || [];
                const online = sockets.length > 0 &&
                    sockets.some((s) => {
                        if (typeof s === "string")
                            return s === uid;
                        if (s && typeof s === "object")
                            return s.userId === uid || s.id === uid;
                        return false;
                    });
                if (online)
                    delivered += 1;
                else {
                    failed += 1;
                    offline.push(uid);
                }
            }
            return { delivered, failed, offline };
        }
        // Single user delivery
        const userId = delivery.userId;
        const userSockets = this.getUserSockets(userId);
        if (userSockets.length === 0) {
            throw new Error("User not connected via WebSocket");
        }
        userSockets.forEach((socket) => {
            socket?.emit?.("notification", socketMessage);
        });
        return { delivered: true, recipients: userSockets.length };
    }
    async deliverEmailNotification(notification, delivery) {
        // Email delivery implementation would integrate with email service
        // For now, simulate email delivery
        const emailData = {
            to: delivery.email,
            subject: notification.title,
            html: this.generateEmailHTML(notification),
            text: notification.body,
        };
        // Simulate email sending
        await this.delay(100 + Math.random() * 500); // Simulate network delay
        if (Math.random() < 0.05) {
            // 5% failure rate for simulation
            throw new Error("Email delivery failed");
        }
        return { delivered: true, messageId: uuidv4() };
    }
    async deliverSMSNotification(notification, delivery) {
        // SMS delivery implementation would integrate with SMS service
        // For now, simulate SMS delivery
        const smsText = `${notification.title}\n\n${notification.body}`;
        if (smsText.length > 160) {
            throw new Error("SMS message too long");
        }
        await this.delay(200 + Math.random() * 300);
        if (Math.random() < 0.02) {
            // 2% failure rate
            throw new Error("SMS delivery failed");
        }
        return { delivered: true, messageId: uuidv4() };
    }
    async deliverPushNotification(notification, delivery) {
        // Push notification implementation would integrate with push service
        // For now, simulate push delivery
        const pushData = {
            deviceToken: delivery.deviceToken,
            title: notification.title,
            body: notification.body,
            data: {
                actionUrl: notification.actionUrl,
                notificationId: notification.id,
            },
        };
        await this.delay(150 + Math.random() * 250);
        if (Math.random() < 0.03) {
            // 3% failure rate
            throw new Error("Push notification delivery failed");
        }
        return { delivered: true, messageId: uuidv4() };
    }
    async deliverWebhookNotification(notification, delivery) {
        // Webhook delivery implementation
        const webhookData = {
            notificationId: notification.id,
            type: "notification",
            title: notification.title,
            body: notification.body,
            category: notification.category,
            priority: notification.priority,
            timestamp: notification.createdAt,
            data: notification.data,
        };
        // Simulate webhook call
        await this.delay(300 + Math.random() * 700);
        if (Math.random() < 0.08) {
            // 8% failure rate
            throw new Error("Webhook delivery failed");
        }
        return { delivered: true, statusCode: 200 };
    }
    async deliverInAppNotification(notification, delivery) {
        // Store in-app notification in Redis for later retrieval
        const inAppNotification = {
            id: notification.id,
            userId: delivery.userId,
            title: notification.title,
            body: notification.body,
            category: notification.category,
            priority: notification.priority,
            actionUrl: notification.actionUrl,
            actions: notification.actions,
            createdAt: notification.createdAt,
            read: false,
            acknowledged: false,
        };
        await this.redisClient.lpush(`user_notifications:${delivery.userId}`, JSON.stringify(inAppNotification));
        // Keep only last 100 notifications per user
        await this.redisClient.ltrim(`user_notifications:${delivery.userId}`, 0, 99);
        return { delivered: true, stored: true };
    }
    // Alert rule processing
    async evaluateAlertRules(eventData) {
        for (const [ruleId, rule] of this.alertRules) {
            if (!rule.enabled)
                continue;
            try {
                const matches = await this.evaluateRuleConditions(rule, eventData);
                if (matches) {
                    // Check cooldown
                    const lastTriggered = rule.lastTriggered.get(eventData.userId || "system");
                    if (lastTriggered && Date.now() - lastTriggered < rule.cooldown) {
                        continue;
                    }
                    await this.executeRuleActions(rule, eventData);
                    rule.lastTriggered.set(eventData.userId || "system", Date.now());
                    this.metrics.alertRulesTriggered++;
                    this.emit("alertRuleTriggered", { rule, eventData });
                }
            }
            catch (error) {
                this.logger.error(`Alert rule evaluation failed: ${ruleId}`, error);
            }
        }
    }
    async evaluateRuleConditions(rule, eventData) {
        for (const condition of rule.conditions) {
            if (!this.evaluateCondition(condition, eventData)) {
                return false;
            }
        }
        return true;
    }
    evaluateCondition(condition, eventData) {
        const value = this.getNestedValue(eventData, condition.field);
        switch (condition.operator) {
            case "equals":
                return value === condition.value;
            case "not_equals":
                return value !== condition.value;
            case "greater_than":
                return value > condition.value;
            case "less_than":
                return value < condition.value;
            case "in":
                return (Array.isArray(condition.value) && condition.value.includes(value));
            case "not_in":
                return (Array.isArray(condition.value) && !condition.value.includes(value));
            case "contains":
                return typeof value === "string" && value.includes(condition.value);
            case "outside_hours": {
                const hour = new Date().getHours();
                return hour < condition.value.start || hour > condition.value.end;
            }
            case "anomalous":
                return value > condition.threshold;
            default:
                return false;
        }
    }
    async executeRuleActions(rule, eventData) {
        for (const action of rule.actions) {
            try {
                if (action.type === "NOTIFICATION") {
                    await this.sendNotification({
                        templateId: action.template,
                        recipients: await this.resolveRecipients(action.recipients, eventData),
                        data: eventData,
                        priority: action.urgency,
                        metadata: { ruleId: rule.id, triggeredBy: eventData },
                    });
                }
                else if (action.type === "AUTO_RESPONSE") {
                    await this.executeAutoResponse(action, eventData);
                }
            }
            catch (error) {
                this.logger.error(`Rule action execution failed: ${action.type}`, error);
            }
        }
    }
    // Event handlers
    async handleSecurityEvent(event) {
        await this.evaluateAlertRules(event);
        // Store security events for pattern analysis
        await this.storeSecurityEvent(event);
    }
    async handleSecurityAlert(alert) {
        const notification = await this.sendNotification({
            templateId: "SECURITY_ALERT",
            recipients: ["security_team", "system_admin"],
            data: {
                alertType: alert.type,
                severity: alert.severity,
                description: alert.details?.description || "Security alert detected",
                alertId: alert.id,
            },
            priority: "CRITICAL",
            metadata: { alertId: alert.id },
        });
        this.activeAlerts.set(alert.id, {
            ...alert,
            notificationId: notification.id,
            acknowledged: false,
            escalated: false,
        });
        this.metrics.activeAlerts++;
    }
    async handleNotificationSubscription(socket, data) {
        const { userId, preferences } = data;
        // Validate session
        const session = await this.securityService.verifySession(data.token);
        if (!session || session.userId !== userId) {
            socket.emit("subscription_error", { error: "Invalid session" });
            return;
        }
        socket.userId = userId;
        socket.join(`user_${userId}`);
        // Update user preferences
        if (preferences) {
            await this.updateUserNotificationPreferences(userId, preferences);
        }
        // Send any pending notifications
        await this.sendPendingNotifications(socket, userId);
        socket.emit("subscription_success", { userId });
    }
    async acknowledgeNotification(notificationId, userId) {
        // Update notification status
        await this.redisClient.hset(`notification:${notificationId}`, "acknowledged", "true", "acknowledgedBy", userId, "acknowledgedAt", new Date().toISOString());
        // Check if this is an alert acknowledgment
        const alert = Array.from(this.activeAlerts.values()).find((a) => a.notificationId === notificationId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
            this.emit("alertAcknowledged", alert);
        }
    }
    // User preference management
    async updateUserNotificationPreferences(userId, preferences) {
        const userPrefs = {
            userId,
            channels: preferences.channels || {},
            frequency: preferences.frequency || "IMMEDIATE",
            quietHours: preferences.quietHours || { enabled: false },
            categories: preferences.categories || {},
            updatedAt: new Date(),
        };
        this.userPreferences.set(userId, userPrefs);
        // Store in Redis
        await this.redisClient.set(`user_preferences:${userId}`, JSON.stringify(userPrefs));
    }
    async getUserNotificationPreferences(userId) {
        let preferences = this.userPreferences.get(userId);
        if (!preferences) {
            const stored = await this.redisClient.get(`user_preferences:${userId}`);
            if (stored) {
                preferences = JSON.parse(stored);
                this.userPreferences.set(userId, preferences);
            }
        }
        return preferences || this.getDefaultPreferences(userId);
    }
    getDefaultPreferences(userId) {
        return {
            userId,
            channels: {
                REAL_TIME: true,
                IN_APP: true,
                EMAIL: true,
                PUSH: false,
                SMS: false,
                WEBHOOK: false,
            },
            frequency: "IMMEDIATE",
            quietHours: { enabled: false },
            categories: {
                SECURITY: { enabled: true, channels: ["REAL_TIME", "EMAIL", "SMS"] },
                INVESTIGATION: { enabled: true, channels: ["REAL_TIME", "IN_APP"] },
                ANALYTICS: { enabled: true, channels: ["REAL_TIME", "IN_APP"] },
                REPORTING: { enabled: true, channels: ["EMAIL", "IN_APP"] },
                SYSTEM: { enabled: true, channels: ["EMAIL", "IN_APP"] },
            },
        };
    }
    // Helper methods
    async determineDeliveryChannels(recipient, notification) {
        const deliveries = [];
        // Resolve recipient to user
        const user = await this.resolveRecipient(recipient, notification.data);
        if (!user)
            return deliveries;
        const preferences = await this.getUserNotificationPreferences(user.id);
        const categoryPrefs = preferences.categories[notification.category];
        const enabledChannels = categoryPrefs?.channels || notification.channels;
        for (const channelId of enabledChannels) {
            if (!preferences.channels[channelId])
                continue;
            const channel = this.alertChannels.get(channelId);
            if (!channel || !channel.enabled)
                continue;
            // Check quiet hours
            if (this.isQuietHours(preferences.quietHours)) {
                if (!["REAL_TIME", "IN_APP"].includes(channelId))
                    continue;
            }
            const delivery = {
                userId: user.id,
                channel: channelId,
                channelConfig: channel,
                status: "PENDING",
                attempts: 0,
            };
            // Add channel-specific delivery details
            switch (channelId) {
                case "EMAIL":
                    delivery.email = user.email;
                    break;
                case "SMS":
                    delivery.phone = user.phone;
                    break;
                case "PUSH":
                    delivery.deviceToken = user.deviceToken;
                    break;
                case "WEBHOOK":
                    delivery.webhookUrl = user.webhookUrl;
                    break;
            }
            deliveries.push(delivery);
        }
        return deliveries;
    }
    applyTemplate(template, data) {
        return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            return this.getNestedValue(data, path) || match;
        });
    }
    getNestedValue(obj, path) {
        return path.split(".").reduce((current, key) => current?.[key], obj);
    }
    getUserSockets(userId) {
        const userRoom = this.socketIO.sockets.adapter.rooms.get(`user_${userId}`);
        if (!userRoom)
            return [];
        return Array.from(userRoom)
            .map((socketId) => this.socketIO.sockets.sockets.get(socketId))
            .filter((socket) => socket);
    }
    generateEmailHTML(notification) {
        return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>${notification.title}</h2>
          <p>${notification.body}</p>
          ${notification.actions
            .map((action) => `<a href="${action.url}" style="background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; margin-right: 10px;">${action.label}</a>`)
            .join("")}
        </body>
      </html>
    `;
    }
    isQuietHours(quietHours) {
        if (!quietHours.enabled)
            return false;
        const now = new Date();
        const currentHour = now.getHours();
        return (currentHour >= quietHours.startHour && currentHour < quietHours.endHour);
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    updateDeliveryTimeMetric(deliveryTime) {
        const total = this.metrics.averageDeliveryTime * this.metrics.deliveredNotifications;
        this.metrics.averageDeliveryTime =
            (total + deliveryTime) / (this.metrics.deliveredNotifications + 1);
    }
    // Public API methods
    async getUserNotifications(userId, options = {}) {
        const { limit = 50, offset = 0, unreadOnly = false } = options;
        const key = `user_notifications:${userId}`;
        const notifications = await this.redisClient.lrange(key, offset, offset + limit - 1);
        const parsed = notifications.map((n) => JSON.parse(n));
        if (unreadOnly) {
            return parsed.filter((n) => !n.read);
        }
        return parsed;
    }
    async markNotificationAsRead(notificationId, userId) {
        // Update in Redis
        const key = `user_notifications:${userId}`;
        const notifications = await this.redisClient.lrange(key, 0, -1);
        const updated = notifications.map((n) => {
            const notification = JSON.parse(n);
            if (notification.id === notificationId) {
                notification.read = true;
                notification.readAt = new Date();
            }
            return JSON.stringify(notification);
        });
        if (updated.length > 0) {
            await this.redisClient.del(key);
            await this.redisClient.lpush(key, ...updated);
        }
    }
    getMetrics() {
        const successRate = this.metrics.totalNotifications > 0
            ? ((this.metrics.deliveredNotifications /
                this.metrics.totalNotifications) *
                100).toFixed(2)
            : "0";
        return {
            ...this.metrics,
            successRate,
            queueSize: this.notificationQueue.length,
            channelStats: Object.fromEntries(this.metrics.channelStats),
        };
    }
    getAvailableChannels() {
        return Array.from(this.alertChannels.values());
    }
    getAvailableTemplates() {
        return Array.from(this.notificationTemplates.values());
    }
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    // Placeholder methods for full implementation
    async resolveRecipient(recipient, data) {
        return { id: recipient, email: `${recipient}@example.com` };
    }
    async resolveRecipients(recipients, data) {
        return recipients.map((r) => ({ id: r, email: `${r}@example.com` }));
    }
    async executeAutoResponse(action, eventData) { }
    async storeNotification(notification) { }
    async storeSecurityEvent(event) { }
    async handleFailedCriticalNotification(notification) { }
    async checkAlertEscalations() { }
    async cleanupOldNotifications() { }
    async sendPendingNotifications(socket, userId) { }
    validateWebSocketDelivery(delivery) {
        return true;
    }
    validateEmailDelivery(delivery) {
        return !!delivery.email;
    }
    validateSMSDelivery(delivery) {
        return !!delivery.phone;
    }
    validatePushDelivery(delivery) {
        return !!delivery.deviceToken;
    }
    validateWebhookDelivery(delivery) {
        return !!delivery.webhookUrl;
    }
    validateInAppDelivery(delivery) {
        return !!delivery.userId;
    }
}
module.exports = NotificationService;
//# sourceMappingURL=NotificationService.js.map