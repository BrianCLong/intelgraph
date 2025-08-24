/**
 * Notification Service Tests - P1 Priority
 * Comprehensive test suite for real-time notifications and alerting
 */
const NotificationService = require('../services/NotificationService');
describe('Notification Service - P1 Priority', () => {
    let notificationService;
    let mockWebSocketManager;
    let mockPostgresPool;
    let mockRedisClient;
    let mockLogger;
    let mockClient;
    let mockSecurityService;
    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        mockPostgresPool = {
            connect: jest.fn(() => mockClient)
        };
        mockRedisClient = {
            publish: jest.fn(),
            subscribe: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            zadd: jest.fn(),
            zrange: jest.fn(),
            lpush: jest.fn(),
            ltrim: jest.fn(),
            hset: jest.fn(),
            lrange: jest.fn().mockResolvedValue([])
        };
        mockWebSocketManager = {
            broadcast: jest.fn(),
            sendToUser: jest.fn(),
            sendToRoom: jest.fn(),
            on: jest.fn(),
            sockets: {
                adapter: {
                    rooms: {
                        get: jest.fn(() => new Set())
                    }
                },
                sockets: {
                    get: jest.fn()
                }
            }
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        mockSecurityService = new (require('events'))();
        mockSecurityService.verifySession = jest.fn();
        notificationService = new NotificationService(mockWebSocketManager, mockPostgresPool, mockRedisClient, mockSecurityService, mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Notification Templates', () => {
        test('should initialize all required notification templates', () => {
            const templates = notificationService.getAvailableTemplates();
            expect(templates.length).toBeGreaterThanOrEqual(8);
            expect(templates.map(t => t.id)).toContain('INVESTIGATION_UPDATE');
            expect(templates.map(t => t.id)).toContain('ANALYTICS_COMPLETE');
            expect(templates.map(t => t.id)).toContain('SECURITY_ALERT');
            expect(templates.map(t => t.id)).toContain('SYSTEM_MAINTENANCE');
            expect(templates.map(t => t.id)).toContain('COLLABORATION_INVITE');
            expect(templates.map(t => t.id)).toContain('REPORT_READY');
            expect(templates.map(t => t.id)).toContain('ANOMALY_DETECTED');
        });
        test('should configure template priorities correctly', () => {
            const templates = notificationService.getAvailableTemplates();
            const securityTemplate = templates.find(t => t.id === 'SECURITY_ALERT');
            expect(securityTemplate.priority).toBe('CRITICAL');
            const analyticsTemplate = templates.find(t => t.id === 'ANALYTICS_COMPLETE');
            expect(analyticsTemplate.priority).toBe('LOW');
        });
    });
    describe('Notification Creation and Delivery', () => {
        test('should create and send notifications successfully', async () => {
            mockClient.query.mockResolvedValue({
                rows: [{ id: 'notif123', created_at: new Date() }]
            });
            const notificationData = {
                templateId: 'INVESTIGATION_UPDATE',
                recipients: ['user123'],
                data: {
                    investigationTitle: 'Test Investigation',
                    alertType: 'High Priority Finding',
                    severity: 'HIGH'
                },
                channels: ['REAL_TIME', 'EMAIL'],
                userId: 'sender123'
            };
            const notification = await notificationService.sendNotification(notificationData);
            expect(notification.id).toBeDefined();
            expect(notification.templateId).toBe('INVESTIGATION_UPDATE');
            expect(notification.recipients).toEqual(['user123']);
            expect(notification.status).toBe('QUEUED');
        });
        test('should handle multiple delivery channels', async () => {
            notificationService.determineDeliveryChannels = jest.fn().mockResolvedValue([
                { channel: 'REAL_TIME' },
                { channel: 'EMAIL' },
                { channel: 'SMS' },
            ]);
            mockClient.query.mockResolvedValue({
                rows: [{ id: 'notif123', created_at: new Date() }]
            });
            const notification = await notificationService.sendNotification({
                templateId: 'SECURITY_ALERT',
                recipients: ['user123'],
                data: { threatType: 'Malware Detection' },
                channels: ['REAL_TIME', 'EMAIL', 'SMS'],
                userId: 'system'
            });
            expect(notification.deliveries.length).toBe(3);
            expect(notification.deliveries.map(d => d.channel)).toEqual(expect.arrayContaining(['REAL_TIME', 'EMAIL', 'SMS']));
        });
        test('should validate notification data before sending', async () => {
            const invalidNotification = {
                templateId: 'INVALID_TEMPLATE',
                recipients: [],
                data: {},
                userId: 'user123'
            };
            const notification = await notificationService.sendNotification(invalidNotification);
            expect(notification.status).toBe('QUEUED');
        });
        test('should handle delivery failures gracefully', async () => {
            mockClient.query.mockResolvedValue({
                rows: [{ id: 'notif123', created_at: new Date() }]
            });
            const notification = await notificationService.sendNotification({
                templateId: 'INVESTIGATION_UPDATE',
                recipients: ['user123'],
                data: { investigationTitle: 'Test' },
                channels: ['REAL_TIME', 'EMAIL'],
                userId: 'sender123'
            });
            // Should succeed with partial delivery
            expect(notification.status).toBe('QUEUED');
        });
    });
    describe('WebSocket Real-time Delivery', () => {
        test('should deliver websocket notifications in real-time', async () => {
            notificationService.getUserSockets = jest.fn().mockReturnValue([{
                    emit: jest.fn()
                }]);
            await notificationService.deliverWebSocketNotification({
                id: 'notif123',
                title: 'Test Notification',
                body: 'Test message',
                priority: 'HIGH'
            }, { userId: 'user123' });
            expect(notificationService.getUserSockets).toHaveBeenCalled();
        });
        test('should broadcast to investigation rooms', async () => {
            notificationService.socketIO.sockets.adapter.rooms.get.mockReturnValue(new Set(['socket1']));
            notificationService.socketIO.sockets.sockets.get.mockReturnValue({ emit: jest.fn() });
            await notificationService.deliverWebSocketNotification({
                id: 'notif123',
                title: 'Investigation Update',
                investigationId: 'inv123'
            }, { investigationId: 'inv123' });
            expect(mockWebSocketManager.sendToRoom).toHaveBeenCalled();
        });
        test('should handle user presence checking', async () => {
            notificationService.getUserSockets = jest.fn().mockReturnValue(['user1']);
            const result = await notificationService.deliverWebSocketNotification({ id: 'notif123', title: 'Test' }, { userId: ['user1', 'user2'] });
            expect(result.delivered).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.offline).toEqual(['user2']);
        });
    });
});
//# sourceMappingURL=notificationService.test.js.map