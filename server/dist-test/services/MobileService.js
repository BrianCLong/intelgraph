/**
 * Mobile Application Support Service - P2 Priority
 * Mobile-first API, offline sync, and push notifications
 */
const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");
class MobileService extends EventEmitter {
    constructor(redisClient, notificationService, securityService, logger) {
        super();
        this.redisClient = redisClient;
        this.notificationService = notificationService;
        this.securityService = securityService;
        this.logger = logger;
        this.mobileClients = new Map();
        this.offlineData = new Map();
        this.syncQueue = new Map();
        this.deviceTokens = new Map();
        this.mobileClients = new Map(); // Initialize mobile clients map
        // Initialize metrics
        this.metrics = {
            connectedClients: 0,
            syncOperations: 0,
            pushNotifications: 0,
            offlineActions: 0,
            totalOps: 0,
            successfulOps: 0,
            failedOps: 0,
        };
        this.initializeMobileSupport();
    }
    initializeMobileSupport() {
        // Ensure we have all required methods before binding
        this.handleSync = this.handleSync || this.notificationService.handleSync;
        this.getInvestigationsSummary =
            this.getInvestigationsSummary ||
                this.notificationService.getInvestigationsSummary;
        this.getLightweightEntities =
            this.getLightweightEntities ||
                this.notificationService.getLightweightEntities;
        this.getMobileNotifications =
            this.getMobileNotifications ||
                this.notificationService.getMobileNotifications;
        this.handleOfflineQueue =
            this.handleOfflineQueue ||
                function (clientId, operations) {
                    return this.processOfflineOperations(clientId, operations);
                };
        // Mobile API endpoints optimized for mobile consumption
        this.mobileEndpoints = {
            "/mobile/sync": this.handleSync.bind(this),
            "/mobile/investigations/summary": this.getInvestigationsSummary.bind(this),
            "/mobile/entities/lightweight": this.getLightweightEntities.bind(this),
            "/mobile/notifications": this.getMobileNotifications.bind(this),
            "/mobile/offline/queue": this.handleOfflineQueue.bind(this),
        };
        // Start periodic sync cleanup
        if (this.cleanupTimer)
            clearInterval(this.cleanupTimer);
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredSyncData();
        }, 60 * 60 * 1000); // Every hour
        // Ensure timer doesn't prevent process from exiting
        this.cleanupTimer.unref();
    }
    // Mobile client registration
    async registerMobileClient(clientInfo) {
        const clientId = uuidv4();
        const client = {
            id: clientId,
            deviceId: clientInfo.deviceId,
            platform: clientInfo.platform, // 'ios' or 'android'
            appVersion: clientInfo.appVersion,
            osVersion: clientInfo.osVersion,
            deviceToken: clientInfo.deviceToken,
            userId: clientInfo.userId,
            registeredAt: new Date(),
            lastSeen: new Date(),
            syncState: {
                lastSync: null,
                pendingOperations: 0,
                syncVersion: 0,
            },
            preferences: {
                syncWifiOnly: true,
                backgroundSync: true,
                pushEnabled: true,
                dataCompression: true,
            },
        };
        this.mobileClients.set(clientId, client);
        if (client.deviceToken) {
            this.deviceTokens.set(client.deviceToken, clientId);
        }
        this.metrics.connectedClients++;
        // Initialize offline data for this client
        await this.initializeOfflineData(clientId);
        this.emit("mobileClientRegistered", client);
        return client;
    }
    // Offline data management
    async initializeOfflineData(clientId) {
        const client = this.mobileClients.get(clientId);
        if (!client)
            return;
        const offlineData = {
            clientId,
            investigations: await this.getOfflineInvestigations(client.userId),
            entities: await this.getOfflineEntities(client.userId),
            notifications: await this.getOfflineNotifications(client.userId),
            settings: await this.getUserSettings(client.userId),
            lastUpdated: new Date(),
        };
        this.offlineData.set(clientId, offlineData);
        // Store in Redis for persistence
        await this.redisClient.setex(`mobile_offline:${clientId}`, 24 * 60 * 60, // 24 hours
        JSON.stringify(offlineData));
    }
    async getOfflineInvestigations(userId, limit = 10) {
        // Get user's most recent investigations with essential data only
        return [
            {
                id: "inv1",
                title: "Sample Investigation",
                status: "ACTIVE",
                priority: "HIGH",
                entityCount: 15,
                lastUpdated: new Date(),
                thumbnail: "/thumbnails/inv1.jpg",
            },
        ];
    }
    async getOfflineEntities(userId, limit = 50) {
        // Get essential entity data for offline use
        return [
            {
                id: "ent1",
                label: "Sample Entity",
                type: "PERSON",
                investigationId: "inv1",
                connectionCount: 5,
                lastActivity: new Date(),
            },
        ];
    }
    async getOfflineNotifications(userId, limit = 20) {
        // Get recent notifications for offline viewing
        if (this.notificationService) {
            return await this.notificationService.getUserNotifications(userId, {
                limit,
                unreadOnly: false,
            });
        }
        return [];
    }
    async getUserSettings(userId) {
        // Get user preferences and settings
        return {
            theme: "light",
            language: "en",
            notifications: {
                push: true,
                email: true,
                inApp: true,
            },
        };
    }
    // Sync functionality
    async handleSync(clientId, syncRequest) {
        const client = this.mobileClients.get(clientId);
        if (!client) {
            throw new Error("Mobile client not found");
        }
        const syncOperation = {
            id: uuidv4(),
            clientId,
            requestedAt: new Date(),
            type: syncRequest.type || "FULL",
            lastSyncVersion: syncRequest.lastSyncVersion || 0,
            status: "PROCESSING",
            changes: {
                investigations: [],
                entities: [],
                notifications: [],
                settings: [],
            },
        };
        try {
            // Get changes since last sync
            const changes = await this.getChangesSinceLastSync(client, syncOperation.lastSyncVersion);
            syncOperation.changes = changes;
            // Process any pending offline operations from client
            if (syncRequest.pendingOperations) {
                await this.processOfflineOperations(clientId, syncRequest.pendingOperations);
            }
            // Update client sync state
            client.syncState.lastSync = new Date();
            client.syncState.syncVersion = this.getCurrentSyncVersion();
            client.lastSeen = new Date();
            syncOperation.status = "COMPLETED";
            syncOperation.completedAt = new Date();
            this.metrics.syncOperations++;
            this.emit("syncCompleted", syncOperation);
            return {
                syncVersion: client.syncState.syncVersion,
                changes: this.optimizeChangesForMobile(changes),
                serverTime: new Date(),
                nextSyncRecommended: Date.now() + 5 * 60 * 1000, // 5 minutes
            };
        }
        catch (error) {
            syncOperation.status = "FAILED";
            syncOperation.error = error.message;
            this.logger.error("Mobile sync failed:", error);
            throw error;
        }
    }
    async getChangesSinceLastSync(client, lastSyncVersion) {
        const changes = {
            investigations: [],
            entities: [],
            notifications: [],
            settings: [],
        };
        // Get investigation changes
        changes.investigations = await this.getInvestigationChanges(client.userId, lastSyncVersion);
        // Get entity changes
        changes.entities = await this.getEntityChanges(client.userId, lastSyncVersion);
        // Get notification changes
        changes.notifications = await this.getNotificationChanges(client.userId, lastSyncVersion);
        // Get settings changes
        changes.settings = await this.getSettingsChanges(client.userId, lastSyncVersion);
        return changes;
    }
    optimizeChangesForMobile(changes) {
        // Optimize data for mobile consumption
        return {
            investigations: changes.investigations.map((inv) => ({
                id: inv.id,
                title: inv.title,
                status: inv.status,
                priority: inv.priority,
                entityCount: inv.entityCount,
                lastUpdated: inv.lastUpdated,
                changeType: inv.changeType, // 'CREATED', 'UPDATED', 'DELETED'
            })),
            entities: changes.entities.map((entity) => ({
                id: entity.id,
                label: entity.label,
                type: entity.type,
                investigationId: entity.investigationId,
                connectionCount: entity.connectionCount,
                changeType: entity.changeType,
            })),
            notifications: changes.notifications.map((notif) => ({
                id: notif.id,
                title: notif.title,
                body: notif.body.substring(0, 200), // Truncate for mobile
                category: notif.category,
                priority: notif.priority,
                createdAt: notif.createdAt,
                read: notif.read,
            })),
            settings: changes.settings,
        };
    }
    // Offline operation processing
    async processOfflineOperations(clientId, operations) {
        if (!operations || !Array.isArray(operations)) {
            return [];
        }
        const client = this.mobileClients.get(clientId) || { id: clientId };
        if (!this.mobileClients.has(clientId)) {
            this.mobileClients.set(clientId, client);
        }
        const results = [];
        for (const operation of operations) {
            try {
                const result = await this.processOfflineOperation(operation, client);
                results.push({
                    operationId: operation.id,
                    status: "SUCCESS",
                    result,
                });
                this.metrics.offlineActions++;
            }
            catch (error) {
                results.push({
                    operationId: operation.id,
                    status: "FAILED",
                    error: error.message || "Unknown error",
                });
                this.logger.error("Offline operation failed:", error);
            }
        }
        return results;
    }
    async processOfflineOperation(operation, client) {
        switch (operation.type) {
            case "CREATE_ENTITY":
                return await this.createEntityFromMobile(operation.data, client);
            case "UPDATE_ENTITY":
                return await this.updateEntityFromMobile(operation.data, client);
            case "CREATE_RELATIONSHIP":
                return await this.createRelationshipFromMobile(operation.data, client);
            case "MARK_NOTIFICATION_READ":
                return await this.markNotificationReadFromMobile(operation.data, client);
            default:
                throw new Error(`Unknown offline operation type: ${operation.type}`);
        }
    }
    // Mobile-optimized API endpoints
    async getInvestigationsSummary(userId, options = {}) {
        const { limit = 20, offset = 0, status } = options;
        // Return lightweight investigation summaries
        return {
            investigations: [
                {
                    id: "inv1",
                    title: "Mobile Investigation",
                    status: "ACTIVE",
                    priority: "HIGH",
                    entityCount: 25,
                    alertCount: 3,
                    lastActivity: new Date(),
                    thumbnail: "/api/investigations/inv1/thumbnail",
                    progress: 65,
                },
            ],
            total: 1,
            hasMore: false,
        };
    }
    async getLightweightEntities(investigationId, options = {}) {
        const { limit = 50, offset = 0, types } = options;
        // Return essential entity data optimized for mobile
        return {
            entities: [
                {
                    id: "ent1",
                    label: "Mobile Entity",
                    type: "PERSON",
                    connectionCount: 8,
                    riskLevel: "MEDIUM",
                    lastActivity: new Date(),
                    coordinates: { x: 100, y: 200 }, // For mobile graph rendering
                },
            ],
            total: 1,
            hasMore: false,
        };
    }
    async getMobileNotifications(userId, options = {}) {
        const { limit = 30, unreadOnly = false } = options;
        if (this.notificationService) {
            const notifications = await this.notificationService.getUserNotifications(userId, { limit, unreadOnly });
            // Optimize for mobile display
            return notifications.map((notif) => ({
                id: notif.id,
                title: notif.title,
                summary: notif.body.substring(0, 100),
                category: notif.category,
                priority: notif.priority,
                createdAt: notif.createdAt,
                read: notif.read,
                actionUrl: notif.actionUrl,
                icon: this.getMobileNotificationIcon(notif.category),
            }));
        }
        return [];
    }
    // Push notification support
    async sendPushNotification(deviceToken, notification) {
        const clientId = this.deviceTokens.get(deviceToken);
        const client = this.mobileClients.get(clientId);
        if (!client) {
            throw new Error("Mobile client not found for device token");
        }
        const pushPayload = {
            deviceToken,
            notification: {
                title: notification.title,
                body: notification.body,
                badge: notification.badge || 1,
                sound: notification.sound || "default",
            },
            data: {
                investigationId: notification.investigationId,
                entityId: notification.entityId,
                actionType: notification.actionType,
                deepLink: notification.deepLink,
            },
        };
        // Platform-specific customization
        if (client.platform === "ios") {
            pushPayload.notification.aps = {
                alert: {
                    title: notification.title,
                    body: notification.body,
                },
                badge: notification.badge,
                sound: notification.sound,
            };
        }
        else if (client.platform === "android") {
            pushPayload.notification.android = {
                notification: {
                    icon: "ic_notification",
                    color: "#3498db",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                },
            };
        }
        try {
            // Send via notification service
            const result = await this.notificationService.deliverPushNotification({ deviceToken }, pushPayload);
            this.metrics.pushNotifications++;
            return result;
        }
        catch (error) {
            this.logger.error("Push notification failed:", error);
            throw error;
        }
    }
    // Mobile client management
    async updateMobileClient(clientId, updates) {
        const client = this.mobileClients.get(clientId);
        if (!client) {
            throw new Error("Mobile client not found");
        }
        // Handle device token changes
        if (updates.deviceToken !== undefined &&
            updates.deviceToken !== client.deviceToken) {
            // Remove old token mapping
            if (client.deviceToken) {
                this.deviceTokens.delete(client.deviceToken);
            }
            // Add new token mapping
            if (updates.deviceToken) {
                this.deviceTokens.set(updates.deviceToken, clientId);
            }
        }
        // Update client information
        Object.assign(client, {
            ...updates,
            lastSeen: new Date(),
        });
        // Update device token mapping if changed
        if (updates.deviceToken && updates.deviceToken !== client.deviceToken) {
            this.deviceTokens.delete(client.deviceToken);
            this.deviceTokens.set(updates.deviceToken, clientId);
        }
        this.emit("mobileClientUpdated", client);
        return client;
    }
    async deregisterMobileClient(clientId) {
        const client = this.mobileClients.get(clientId);
        if (!client)
            return false;
        // Cleanup collections
        this.mobileClients.delete(clientId);
        this.offlineData.delete(clientId);
        if (client.deviceToken) {
            this.deviceTokens.delete(client.deviceToken);
        }
        // Remove from Redis
        await this.redisClient.del(`mobile_offline:${clientId}`);
        // Update metrics - ensure it doesn't go below 0
        this.metrics.connectedClients = Math.max(0, this.metrics.connectedClients - 1);
        this.emit("mobileClientDeregistered", client);
        return true;
    }
    // Background sync and cleanup
    async performBackgroundSync(clientId) {
        const client = this.mobileClients.get(clientId);
        if (!client || !client.preferences.backgroundSync) {
            return;
        }
        try {
            const syncResult = await this.handleSync(clientId, {
                type: "INCREMENTAL",
                lastSyncVersion: client.syncState.syncVersion,
            });
            // Send push notification if there are important changes
            if (this.hasImportantChanges(syncResult.changes)) {
                await this.sendPushNotification(client.deviceToken, {
                    title: "New Updates Available",
                    body: "Important changes detected in your investigations",
                    badge: this.getUnreadCount(syncResult.changes),
                    actionType: "SYNC_UPDATE",
                });
            }
        }
        catch (error) {
            this.logger.error("Background sync failed:", error);
        }
    }
    async cleanupExpiredSyncData() {
        const now = Date.now();
        const expireTime = 24 * 60 * 60 * 1000; // 24 hours
        for (const [clientId, data] of this.offlineData) {
            if (now - data.lastUpdated.getTime() > expireTime) {
                this.offlineData.delete(clientId);
                await this.redisClient.del(`mobile_offline:${clientId}`);
            }
        }
    }
    // Helper methods
    getCurrentSyncVersion() {
        return Date.now();
    }
    getMobileNotificationIcon(category) {
        const iconMap = {
            SECURITY: "security",
            INVESTIGATION: "search",
            ANALYTICS: "chart",
            SYSTEM: "settings",
            default: "notification",
        };
        return iconMap[category] || iconMap.default;
    }
    hasImportantChanges(changes) {
        return (changes.investigations.length > 0 ||
            changes.notifications.filter((n) => n.priority === "HIGH").length > 0);
    }
    getUnreadCount(changes) {
        return changes.notifications.filter((n) => !n.read).length;
    }
    // Public API methods
    getMobileClients(userId = null) {
        const clients = Array.from(this.mobileClients.values());
        return userId ? clients.filter((c) => c.userId === userId) : clients;
    }
    getMobileClient(clientId) {
        return this.mobileClients.get(clientId);
    }
    getMetrics() {
        return {
            ...this.metrics,
            totalClients: this.mobileClients.size,
            platformBreakdown: this.getPlatformBreakdown(),
            averageSyncInterval: this.getAverageSyncInterval(),
        };
    }
    getPlatformBreakdown() {
        const breakdown = { ios: 0, android: 0, other: 0 };
        for (const client of this.mobileClients.values()) {
            if (client.platform === "ios")
                breakdown.ios++;
            else if (client.platform === "android")
                breakdown.android++;
            else
                breakdown.other++;
        }
        return breakdown;
    }
    getAverageSyncInterval() {
        const clients = Array.from(this.mobileClients.values());
        if (clients.length === 0)
            return 0;
        // Only include clients that have sync state with lastSync set
        const intervals = clients
            .filter((c) => c.syncState &&
            c.syncState.lastSync &&
            c.syncState.lastSync instanceof Date)
            .map((c) => Date.now() - c.syncState.lastSync.getTime());
        return intervals.length > 0
            ? Math.round(intervals.reduce((sum, interval) => sum + interval, 0) /
                intervals.length)
            : 0;
    }
    // Placeholder methods for full implementation
    async getInvestigationChanges(userId, version) {
        return [];
    }
    async getEntityChanges(userId, version) {
        return [];
    }
    async getNotificationChanges(userId, version) {
        return [];
    }
    async getSettingsChanges(userId, version) {
        return [];
    }
    async createEntityFromMobile(data, client) {
        return { id: "new-entity" };
    }
    async updateEntityFromMobile(data, client) {
        return { success: true };
    }
    async createRelationshipFromMobile(data, client) {
        return { id: "new-rel" };
    }
    async markNotificationReadFromMobile(data, client) {
        return { success: true };
    }
}
module.exports = MobileService;
//# sourceMappingURL=MobileService.js.map