/**
 * Mobile Service Tests - P2 Priority
 * Comprehensive test suite for mobile application support
 */
const MobileService = require('../services/MobileService');
describe('Mobile Service - P2 Priority', () => {
    let mobileService;
    let mockRedisClient;
    let mockNotificationService;
    let mockSecurityService;
    let mockLogger;
    beforeEach(() => {
        mockRedisClient = {
            setex: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            publish: jest.fn()
        };
        mockNotificationService = {
            getUserNotifications: jest.fn().mockResolvedValue([]),
            deliverPushNotification: jest.fn().mockResolvedValue(true),
            sendNotification: jest.fn().mockResolvedValue(true),
            // Add missing methods
            handleSync: jest.fn().mockResolvedValue({}),
            getInvestigationsSummary: jest.fn().mockResolvedValue([]),
            getLightweightEntities: jest.fn().mockResolvedValue([]),
            getMobileNotifications: jest.fn().mockResolvedValue([]),
            handleOfflineQueue: jest.fn().mockResolvedValue({})
        };
        mockSecurityService = {
            checkPermission: jest.fn(),
            verifySession: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        mobileService = new MobileService(mockRedisClient, mockNotificationService, mockSecurityService, mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Mobile Client Registration', () => {
        test('should register mobile clients successfully', async () => {
            const clientInfo = {
                deviceId: 'device123',
                platform: 'ios',
                appVersion: '1.0.0',
                osVersion: '17.0',
                deviceToken: 'token123',
                userId: 'user123'
            };
            mockRedisClient.setex.mockResolvedValue('OK');
            const client = await mobileService.registerMobileClient(clientInfo);
            expect(client.id).toBeDefined();
            expect(client.deviceId).toBe('device123');
            expect(client.platform).toBe('ios');
            expect(client.userId).toBe('user123');
            expect(client.registeredAt).toBeInstanceOf(Date);
            expect(client.syncState.syncVersion).toBe(0);
            expect(client.preferences.syncWifiOnly).toBe(true);
            expect(mobileService.metrics.connectedClients).toBe(1);
        });
        test('should initialize offline data for new clients', async () => {
            const clientInfo = {
                deviceId: 'device123',
                platform: 'android',
                userId: 'user123'
            };
            mockRedisClient.setex.mockResolvedValue('OK');
            const client = await mobileService.registerMobileClient(clientInfo);
            expect(mockRedisClient.setex).toHaveBeenCalledWith(`mobile_offline:${client.id}`, 24 * 60 * 60, expect.any(String));
            expect(mobileService.offlineData.has(client.id)).toBe(true);
        });
        test('should handle device token mapping', async () => {
            const clientInfo = {
                deviceId: 'device123',
                platform: 'ios',
                deviceToken: 'token123',
                userId: 'user123'
            };
            const client = await mobileService.registerMobileClient(clientInfo);
            expect(mobileService.deviceTokens.get('token123')).toBe(client.id);
        });
    });
    describe('Offline Data Management', () => {
        test('should provide offline investigations data', async () => {
            const investigations = await mobileService.getOfflineInvestigations('user123', 5);
            expect(investigations).toBeInstanceOf(Array);
            expect(investigations.length).toBeGreaterThanOrEqual(0);
            if (investigations.length > 0) {
                expect(investigations[0]).toHaveProperty('id');
                expect(investigations[0]).toHaveProperty('title');
                expect(investigations[0]).toHaveProperty('status');
                expect(investigations[0]).toHaveProperty('entityCount');
                expect(investigations[0]).toHaveProperty('thumbnail');
            }
        });
        test('should provide lightweight entity data', async () => {
            const entities = await mobileService.getOfflineEntities('user123', 25);
            expect(entities).toBeInstanceOf(Array);
            expect(entities.length).toBeGreaterThanOrEqual(0);
            if (entities.length > 0) {
                expect(entities[0]).toHaveProperty('id');
                expect(entities[0]).toHaveProperty('label');
                expect(entities[0]).toHaveProperty('type');
                expect(entities[0]).toHaveProperty('connectionCount');
            }
        });
        test('should provide offline notifications', async () => {
            const mockNotifications = [
                {
                    id: 'notif1',
                    title: 'Test Notification',
                    body: 'Test body',
                    category: 'INVESTIGATION',
                    createdAt: new Date()
                }
            ];
            mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications);
            const notifications = await mobileService.getOfflineNotifications('user123', 10);
            expect(notifications).toEqual(mockNotifications);
            expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user123', { limit: 10, unreadOnly: false });
        });
        test('should provide user settings', async () => {
            const settings = await mobileService.getUserSettings('user123');
            expect(settings).toHaveProperty('theme');
            expect(settings).toHaveProperty('language');
            expect(settings).toHaveProperty('notifications');
            expect(settings.notifications).toHaveProperty('push');
            expect(settings.notifications).toHaveProperty('email');
        });
    });
    describe('Sync Operations', () => {
        test('should handle full sync requests', async () => {
            const client = {
                id: 'client123',
                userId: 'user123',
                syncState: { syncVersion: 0 }
            };
            mobileService.mobileClients.set('client123', client);
            const syncRequest = {
                type: 'FULL',
                lastSyncVersion: 0
            };
            const syncResult = await mobileService.handleSync('client123', syncRequest);
            expect(syncResult.syncVersion).toBeDefined();
            expect(syncResult.changes).toBeDefined();
            expect(syncResult.changes.investigations).toBeInstanceOf(Array);
            expect(syncResult.changes.entities).toBeInstanceOf(Array);
            expect(syncResult.changes.notifications).toBeInstanceOf(Array);
            expect(syncResult.serverTime).toBeInstanceOf(Date);
            expect(syncResult.nextSyncRecommended).toBeGreaterThan(Date.now());
            expect(mobileService.metrics.syncOperations).toBe(1);
        });
        test('should handle incremental sync requests', async () => {
            const client = {
                id: 'client123',
                userId: 'user123',
                syncState: { syncVersion: 12345 }
            };
            mobileService.mobileClients.set('client123', client);
            const syncRequest = {
                type: 'INCREMENTAL',
                lastSyncVersion: 12345
            };
            const syncResult = await mobileService.handleSync('client123', syncRequest);
            expect(syncResult.syncVersion).toBeGreaterThan(12345);
            expect(client.syncState.lastSync).toBeInstanceOf(Date);
            expect(client.lastSeen).toBeInstanceOf(Date);
        });
        test('should process offline operations during sync', async () => {
            const client = {
                id: 'client123',
                userId: 'user123',
                syncState: { syncVersion: 0 }
            };
            mobileService.mobileClients.set('client123', client);
            const syncRequest = {
                type: 'FULL',
                pendingOperations: [
                    {
                        id: 'op1',
                        type: 'CREATE_ENTITY',
                        data: { label: 'New Entity', type: 'PERSON' }
                    },
                    {
                        id: 'op2',
                        type: 'MARK_NOTIFICATION_READ',
                        data: { notificationId: 'notif123' }
                    }
                ]
            };
            const syncResult = await mobileService.handleSync('client123', syncRequest);
            expect(syncResult).toBeDefined();
            expect(mobileService.metrics.offlineActions).toBe(2);
        });
        test('should optimize changes for mobile consumption', () => {
            const changes = {
                investigations: [
                    {
                        id: 'inv1',
                        title: 'Investigation 1',
                        status: 'ACTIVE',
                        priority: 'HIGH',
                        entityCount: 25,
                        lastUpdated: new Date(),
                        changeType: 'CREATED',
                        extraData: 'should be removed'
                    }
                ],
                entities: [
                    {
                        id: 'ent1',
                        label: 'Entity 1',
                        type: 'PERSON',
                        investigationId: 'inv1',
                        connectionCount: 5,
                        changeType: 'UPDATED',
                        heavyData: 'should be removed'
                    }
                ],
                notifications: [
                    {
                        id: 'notif1',
                        title: 'Notification',
                        body: 'Very long notification body that should be truncated for mobile devices because it contains too much information',
                        category: 'SECURITY',
                        priority: 'HIGH',
                        createdAt: new Date(),
                        read: false
                    }
                ],
                settings: [{ theme: 'dark' }]
            };
            const optimized = mobileService.optimizeChangesForMobile(changes);
            expect(optimized.investigations[0]).not.toHaveProperty('extraData');
            expect(optimized.entities[0]).not.toHaveProperty('heavyData');
            expect(optimized.notifications[0].body.length).toBeLessThanOrEqual(200);
            expect(optimized.settings).toEqual([{ theme: 'dark' }]);
        });
        test('should handle sync failures gracefully', async () => {
            const client = {
                id: 'client123',
                userId: 'user123',
                syncState: { syncVersion: 0 }
            };
            mobileService.mobileClients.set('client123', client);
            // Mock a failure in offline operation processing
            mobileService.processOfflineOperations = jest.fn().mockRejectedValue(new Error('Offline processing failed'));
            const syncRequest = {
                type: 'FULL',
                pendingOperations: [{ id: 'op1', type: 'INVALID_OP' }]
            };
            await expect(mobileService.handleSync('client123', syncRequest))
                .rejects.toThrow('Offline processing failed');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    describe('Offline Operations Processing', () => {
        test('should process entity creation operations', async () => {
            const client = { id: 'client123', userId: 'user123' };
            const operations = [
                {
                    id: 'op1',
                    type: 'CREATE_ENTITY',
                    data: { label: 'New Entity', type: 'PERSON' }
                }
            ];
            const results = await mobileService.processOfflineOperations('client123', operations);
            expect(results).toHaveLength(1);
            expect(results[0].operationId).toBe('op1');
            expect(results[0].status).toBe('SUCCESS');
            expect(mobileService.metrics.offlineActions).toBe(1);
        });
        test('should handle invalid operations gracefully', async () => {
            const client = { id: 'client123', userId: 'user123' };
            const operations = [
                {
                    id: 'op1',
                    type: 'INVALID_OPERATION',
                    data: {}
                }
            ];
            const results = await mobileService.processOfflineOperations('client123', operations);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('FAILED');
            expect(results[0].error).toContain('Unknown offline operation type');
            expect(mockLogger.error).toHaveBeenCalled();
        });
        test('should process multiple operation types', async () => {
            const client = { id: 'client123', userId: 'user123' };
            const operations = [
                {
                    id: 'op1',
                    type: 'CREATE_ENTITY',
                    data: { label: 'Entity 1', type: 'PERSON' }
                },
                {
                    id: 'op2',
                    type: 'UPDATE_ENTITY',
                    data: { entityId: 'ent123', label: 'Updated Entity' }
                },
                {
                    id: 'op3',
                    type: 'CREATE_RELATIONSHIP',
                    data: { source: 'ent1', target: 'ent2', type: 'KNOWS' }
                },
                {
                    id: 'op4',
                    type: 'MARK_NOTIFICATION_READ',
                    data: { notificationId: 'notif123' }
                }
            ];
            const results = await mobileService.processOfflineOperations('client123', operations);
            expect(results).toHaveLength(4);
            expect(results.every(r => r.status === 'SUCCESS')).toBe(true);
            expect(mobileService.metrics.offlineActions).toBe(4);
        });
    });
    describe('Mobile-Optimized API Endpoints', () => {
        test('should provide investigation summaries', async () => {
            const summary = await mobileService.getInvestigationsSummary('user123', { limit: 10 });
            expect(summary.investigations).toBeInstanceOf(Array);
            expect(summary.total).toBeDefined();
            expect(summary.hasMore).toBeDefined();
            if (summary.investigations.length > 0) {
                const investigation = summary.investigations[0];
                expect(investigation).toHaveProperty('id');
                expect(investigation).toHaveProperty('title');
                expect(investigation).toHaveProperty('status');
                expect(investigation).toHaveProperty('entityCount');
                expect(investigation).toHaveProperty('alertCount');
                expect(investigation).toHaveProperty('thumbnail');
                expect(investigation).toHaveProperty('progress');
            }
        });
        test('should provide lightweight entity data', async () => {
            const entities = await mobileService.getLightweightEntities('inv123', { limit: 25 });
            expect(entities.entities).toBeInstanceOf(Array);
            expect(entities.total).toBeDefined();
            expect(entities.hasMore).toBeDefined();
            if (entities.entities.length > 0) {
                const entity = entities.entities[0];
                expect(entity).toHaveProperty('id');
                expect(entity).toHaveProperty('label');
                expect(entity).toHaveProperty('type');
                expect(entity).toHaveProperty('connectionCount');
                expect(entity).toHaveProperty('riskLevel');
                expect(entity).toHaveProperty('coordinates');
            }
        });
        test('should provide mobile-optimized notifications', async () => {
            const mockNotifications = [
                {
                    id: 'notif1',
                    title: 'Investigation Alert',
                    body: 'Long notification body that needs to be optimized for mobile display',
                    category: 'INVESTIGATION',
                    priority: 'HIGH',
                    createdAt: new Date(),
                    read: false,
                    actionUrl: '/investigation/inv123'
                }
            ];
            mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications);
            const notifications = await mobileService.getMobileNotifications('user123', { limit: 20 });
            expect(notifications).toHaveLength(1);
            expect(notifications[0].summary.length).toBeLessThanOrEqual(100);
            expect(notifications[0].icon).toBeDefined();
            expect(notifications[0]).toHaveProperty('actionUrl');
        });
    });
    describe('Push Notification Support', () => {
        test('should send push notifications to mobile devices', async () => {
            const client = {
                id: 'client123',
                platform: 'ios',
                deviceToken: 'token123'
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.deviceTokens.set('token123', 'client123');
            const notification = {
                title: 'Investigation Update',
                body: 'New entities have been discovered',
                badge: 1,
                investigationId: 'inv123',
                actionType: 'VIEW_INVESTIGATION'
            };
            mockNotificationService.deliverPushNotification.mockResolvedValue({
                success: true,
                messageId: 'msg123'
            });
            const result = await mobileService.sendPushNotification('token123', notification);
            expect(result.success).toBe(true);
            expect(mockNotificationService.deliverPushNotification).toHaveBeenCalledWith({ deviceToken: 'token123' }, expect.objectContaining({
                notification: expect.objectContaining({
                    title: 'Investigation Update',
                    body: 'New entities have been discovered'
                }),
                data: expect.objectContaining({
                    investigationId: 'inv123',
                    actionType: 'VIEW_INVESTIGATION'
                })
            }));
            expect(mobileService.metrics.pushNotifications).toBe(1);
        });
        test('should customize notifications for iOS platform', async () => {
            const client = {
                id: 'client123',
                platform: 'ios',
                deviceToken: 'token123'
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.deviceTokens.set('token123', 'client123');
            const notification = {
                title: 'iOS Notification',
                body: 'iOS specific notification',
                badge: 5,
                sound: 'alert.caf'
            };
            mockNotificationService.deliverPushNotification.mockResolvedValue({ success: true });
            await mobileService.sendPushNotification('token123', notification);
            expect(mockNotificationService.deliverPushNotification).toHaveBeenCalledWith({ deviceToken: 'token123' }, expect.objectContaining({
                notification: expect.objectContaining({
                    aps: expect.objectContaining({
                        alert: {
                            title: 'iOS Notification',
                            body: 'iOS specific notification'
                        },
                        badge: 5,
                        sound: 'alert.caf'
                    })
                })
            }));
        });
        test('should customize notifications for Android platform', async () => {
            const client = {
                id: 'client123',
                platform: 'android',
                deviceToken: 'token123'
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.deviceTokens.set('token123', 'client123');
            const notification = {
                title: 'Android Notification',
                body: 'Android specific notification'
            };
            mockNotificationService.deliverPushNotification.mockResolvedValue({ success: true });
            await mobileService.sendPushNotification('token123', notification);
            expect(mockNotificationService.deliverPushNotification).toHaveBeenCalledWith({ deviceToken: 'token123' }, expect.objectContaining({
                notification: expect.objectContaining({
                    android: expect.objectContaining({
                        notification: expect.objectContaining({
                            icon: 'ic_notification',
                            color: '#3498db',
                            click_action: 'FLUTTER_NOTIFICATION_CLICK'
                        })
                    })
                })
            }));
        });
        test('should handle push notification failures', async () => {
            const client = {
                id: 'client123',
                platform: 'ios',
                deviceToken: 'token123'
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.deviceTokens.set('token123', 'client123');
            mockNotificationService.deliverPushNotification.mockRejectedValue(new Error('Push service unavailable'));
            const notification = { title: 'Test', body: 'Test notification' };
            await expect(mobileService.sendPushNotification('token123', notification))
                .rejects.toThrow('Push service unavailable');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    describe('Mobile Client Management', () => {
        test('should update mobile client information', async () => {
            const client = {
                id: 'client123',
                deviceToken: 'old_token',
                appVersion: '1.0.0'
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.deviceTokens.set('old_token', 'client123');
            const updates = {
                deviceToken: 'new_token',
                appVersion: '1.1.0',
                osVersion: '18.0'
            };
            const updatedClient = await mobileService.updateMobileClient('client123', updates);
            expect(updatedClient.deviceToken).toBe('new_token');
            expect(updatedClient.appVersion).toBe('1.1.0');
            expect(updatedClient.osVersion).toBe('18.0');
            expect(updatedClient.lastSeen).toBeInstanceOf(Date);
            // Device token mapping should be updated
            expect(mobileService.deviceTokens.has('old_token')).toBe(false);
            expect(mobileService.deviceTokens.get('new_token')).toBe('client123');
        });
        test('should deregister mobile clients', async () => {
            const client = {
                id: 'client123',
                deviceToken: 'token123',
                userId: 'user123'
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.deviceTokens.set('token123', 'client123');
            mobileService.offlineData.set('client123', { data: 'test' });
            mockRedisClient.del.mockResolvedValue(1);
            const result = await mobileService.deregisterMobileClient('client123');
            expect(result).toBe(true);
            expect(mobileService.mobileClients.has('client123')).toBe(false);
            expect(mobileService.deviceTokens.has('token123')).toBe(false);
            expect(mobileService.offlineData.has('client123')).toBe(false);
            expect(mockRedisClient.del).toHaveBeenCalledWith('mobile_offline:client123');
            expect(mobileService.metrics.connectedClients).toBe(0);
        });
    });
    describe('Background Sync and Cleanup', () => {
        test('should perform background sync for clients', async () => {
            const client = {
                id: 'client123',
                deviceToken: 'token123',
                preferences: { backgroundSync: true },
                syncState: { syncVersion: 12345 }
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.deviceTokens.set('token123', 'client123');
            // Mock successful sync
            mobileService.handleSync = jest.fn().mockResolvedValue({
                changes: {
                    investigations: [{ id: 'inv1', priority: 'HIGH' }],
                    notifications: [{ id: 'notif1', priority: 'HIGH', read: false }]
                }
            });
            mockNotificationService.deliverPushNotification.mockResolvedValue({ success: true });
            await mobileService.performBackgroundSync('client123');
            expect(mobileService.handleSync).toHaveBeenCalledWith('client123', {
                type: 'INCREMENTAL',
                lastSyncVersion: 12345
            });
            // Should send push notification for important changes
            expect(mockNotificationService.deliverPushNotification).toHaveBeenCalled();
        });
        test('should skip background sync for disabled clients', async () => {
            const client = {
                id: 'client123',
                preferences: { backgroundSync: false }
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.handleSync = jest.fn();
            await mobileService.performBackgroundSync('client123');
            expect(mobileService.handleSync).not.toHaveBeenCalled();
        });
        test('should clean up expired sync data', async () => {
            const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
            const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
            mobileService.offlineData.set('expired_client', {
                lastUpdated: expiredTime
            });
            mobileService.offlineData.set('recent_client', {
                lastUpdated: recentTime
            });
            mockRedisClient.del.mockResolvedValue(1);
            await mobileService.cleanupExpiredSyncData();
            expect(mobileService.offlineData.has('expired_client')).toBe(false);
            expect(mobileService.offlineData.has('recent_client')).toBe(true);
            expect(mockRedisClient.del).toHaveBeenCalledWith('mobile_offline:expired_client');
        });
    });
    describe('Helper Methods', () => {
        test('should generate current sync version', () => {
            const version1 = mobileService.getCurrentSyncVersion();
            const version2 = mobileService.getCurrentSyncVersion();
            expect(version1).toBeGreaterThan(0);
            expect(version2).toBeGreaterThanOrEqual(version1);
        });
        test('should get appropriate notification icons', () => {
            expect(mobileService.getMobileNotificationIcon('SECURITY')).toBe('security');
            expect(mobileService.getMobileNotificationIcon('INVESTIGATION')).toBe('search');
            expect(mobileService.getMobileNotificationIcon('ANALYTICS')).toBe('chart');
            expect(mobileService.getMobileNotificationIcon('SYSTEM')).toBe('settings');
            expect(mobileService.getMobileNotificationIcon('UNKNOWN')).toBe('notification');
        });
        test('should detect important changes', () => {
            const importantChanges = {
                investigations: [{ id: 'inv1' }],
                notifications: [
                    { priority: 'HIGH', read: false },
                    { priority: 'LOW', read: false }
                ]
            };
            const unimportantChanges = {
                investigations: [],
                notifications: [
                    { priority: 'LOW', read: true },
                    { priority: 'MEDIUM', read: false }
                ]
            };
            expect(mobileService.hasImportantChanges(importantChanges)).toBe(true);
            expect(mobileService.hasImportantChanges(unimportantChanges)).toBe(false);
        });
        test('should calculate unread notification count', () => {
            const changes = {
                notifications: [
                    { id: 'n1', read: false },
                    { id: 'n2', read: true },
                    { id: 'n3', read: false },
                    { id: 'n4', read: false }
                ]
            };
            const unreadCount = mobileService.getUnreadCount(changes);
            expect(unreadCount).toBe(3);
        });
    });
    describe('Analytics and Metrics', () => {
        test('should track mobile service metrics', () => {
            // Set up some clients
            mobileService.mobileClients.set('ios_client', { platform: 'ios' });
            mobileService.mobileClients.set('android_client1', { platform: 'android' });
            mobileService.mobileClients.set('android_client2', { platform: 'android' });
            const metrics = mobileService.getMetrics();
            expect(metrics.connectedClients).toBe(0); // Set by initialization
            expect(metrics.totalClients).toBe(3);
            expect(metrics.syncOperations).toBeGreaterThanOrEqual(0);
            expect(metrics.pushNotifications).toBeGreaterThanOrEqual(0);
            expect(metrics.platformBreakdown).toBeDefined();
            expect(metrics.averageSyncInterval).toBeGreaterThanOrEqual(0);
        });
        test('should provide platform breakdown', () => {
            mobileService.mobileClients.set('ios1', { platform: 'ios' });
            mobileService.mobileClients.set('ios2', { platform: 'ios' });
            mobileService.mobileClients.set('android1', { platform: 'android' });
            mobileService.mobileClients.set('other1', { platform: 'windows' });
            const breakdown = mobileService.getPlatformBreakdown();
            expect(breakdown.ios).toBe(2);
            expect(breakdown.android).toBe(1);
            expect(breakdown.other).toBe(1);
        });
        test('should calculate average sync interval', () => {
            const now = Date.now();
            mobileService.mobileClients.set('client1', {
                syncState: { lastSync: new Date(now - 5 * 60 * 1000) } // 5 minutes ago
            });
            mobileService.mobileClients.set('client2', {
                syncState: { lastSync: new Date(now - 10 * 60 * 1000) } // 10 minutes ago
            });
            mobileService.mobileClients.set('client3', {
                syncState: { lastSync: null } // Never synced
            });
            const avgInterval = mobileService.getAverageSyncInterval();
            expect(avgInterval).toBeGreaterThan(0);
            expect(avgInterval).toBeCloseTo(7.5 * 60 * 1000, -3); // ~7.5 minutes in ms
        });
    });
    describe('Error Handling', () => {
        test('should handle client not found errors', async () => {
            await expect(mobileService.handleSync('non_existent_client', {}))
                .rejects.toThrow('Mobile client not found');
            await expect(mobileService.updateMobileClient('non_existent_client', {}))
                .rejects.toThrow('Mobile client not found');
        });
        test('should handle push notification errors gracefully', async () => {
            await expect(mobileService.sendPushNotification('invalid_token', {}))
                .rejects.toThrow('Mobile client not found for device token');
        });
        test('should handle background sync failures', async () => {
            const client = {
                id: 'client123',
                preferences: { backgroundSync: true },
                syncState: { syncVersion: 0 }
            };
            mobileService.mobileClients.set('client123', client);
            mobileService.handleSync = jest.fn().mockRejectedValue(new Error('Sync failed'));
            // Should not throw, but log error
            await mobileService.performBackgroundSync('client123');
            expect(mockLogger.error).toHaveBeenCalledWith('Background sync failed:', expect.any(Error));
        });
    });
});
// Performance tests
describe('Mobile Service Performance', () => {
    let mobileService;
    beforeEach(() => {
        mobileService = new MobileService({ setex: jest.fn(), get: jest.fn(), del: jest.fn() }, { getUserNotifications: jest.fn(), deliverPushNotification: jest.fn() }, { checkPermission: jest.fn() }, { info: jest.fn(), error: jest.fn() });
    });
    test('should handle many concurrent sync operations', async () => {
        // Register multiple clients
        const clients = Array(100).fill().map((_, i) => ({
            id: `client${i}`,
            userId: `user${i}`,
            syncState: { syncVersion: i * 1000 }
        }));
        clients.forEach(client => {
            mobileService.mobileClients.set(client.id, client);
        });
        const startTime = Date.now();
        // Simulate concurrent sync operations
        const syncPromises = clients.map(client => mobileService.handleSync(client.id, { type: 'INCREMENTAL', lastSyncVersion: client.syncState.syncVersion }));
        const results = await Promise.all(syncPromises);
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
        expect(results).toHaveLength(100);
        expect(results.every(r => r.syncVersion)).toBe(true);
    });
    test('should efficiently manage large offline datasets', () => {
        const largeDataset = {
            investigations: Array(1000).fill().map((_, i) => ({
                id: `inv${i}`,
                title: `Investigation ${i}`
            })),
            entities: Array(5000).fill().map((_, i) => ({
                id: `ent${i}`,
                label: `Entity ${i}`
            })),
            notifications: Array(500).fill().map((_, i) => ({
                id: `notif${i}`,
                title: `Notification ${i}`,
                body: 'Notification body content'.repeat(10) // Longer content
            }))
        };
        const startTime = Date.now();
        const optimized = mobileService.optimizeChangesForMobile(largeDataset);
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
        expect(optimized.investigations).toHaveLength(1000);
        expect(optimized.entities).toHaveLength(5000);
        expect(optimized.notifications).toHaveLength(500);
        // Verify optimization occurred
        optimized.notifications.forEach(notif => {
            expect(notif.body.length).toBeLessThanOrEqual(200);
        });
    });
});
//# sourceMappingURL=mobileService.test.js.map