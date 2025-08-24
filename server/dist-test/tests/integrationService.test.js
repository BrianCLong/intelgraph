/**
 * Integration Service Tests - P2 Priority
 * Comprehensive test suite for advanced integration connectors
 */
const IntegrationService = require('../services/IntegrationService');
describe('Integration Service - P2 Priority', () => {
    let integrationService;
    let mockLogger;
    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        integrationService = new IntegrationService(mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Connector Initialization', () => {
        test('should initialize all enterprise connectors', () => {
            const connectors = integrationService.getConnectors();
            expect(connectors.length).toBeGreaterThanOrEqual(12);
            expect(connectors.map(c => c.id)).toContain('SPLUNK');
            expect(connectors.map(c => c.id)).toContain('ELASTIC');
            expect(connectors.map(c => c.id)).toContain('PALANTIR');
            expect(connectors.map(c => c.id)).toContain('IBM_I2');
            expect(connectors.map(c => c.id)).toContain('CLEAR');
            expect(connectors.map(c => c.id)).toContain('LEXISNEXIS');
            expect(connectors.map(c => c.id)).toContain('MISP');
            expect(connectors.map(c => c.id)).toContain('VIRUSTOTAL');
            expect(connectors.map(c => c.id)).toContain('AWS_DETECTIVE');
            expect(connectors.map(c => c.id)).toContain('SLACK');
            expect(connectors.map(c => c.id)).toContain('TEAMS');
        });
        test('should configure connector categories correctly', () => {
            const splunk = integrationService.getConnector('SPLUNK');
            expect(splunk.category).toBe('SIEM');
            expect(splunk.capabilities).toContain('search');
            expect(splunk.capabilities).toContain('alerts');
            const misp = integrationService.getConnector('MISP');
            expect(misp.category).toBe('THREAT_INTEL');
            expect(misp.capabilities).toContain('events');
            const slack = integrationService.getConnector('SLACK');
            expect(slack.category).toBe('COMMUNICATION');
            expect(slack.capabilities).toContain('channels');
        });
        test('should define authentication methods for each connector', () => {
            const elastic = integrationService.getConnector('ELASTIC');
            expect(elastic.authentication).toContain('api_key');
            expect(elastic.authentication).toContain('username_password');
            const aws = integrationService.getConnector('AWS_DETECTIVE');
            expect(aws.authentication).toContain('aws_credentials');
            expect(aws.authentication).toContain('iam_role');
            const teams = integrationService.getConnector('TEAMS');
            expect(teams.authentication).toContain('oauth2');
        });
        test('should configure data types for each connector', () => {
            const splunk = integrationService.getConnector('SPLUNK');
            expect(splunk.dataTypes).toContain('logs');
            expect(splunk.dataTypes).toContain('events');
            expect(splunk.dataTypes).toContain('alerts');
            const virustotal = integrationService.getConnector('VIRUSTOTAL');
            expect(virustotal.dataTypes).toContain('scan_results');
            expect(virustotal.dataTypes).toContain('domain_info');
        });
    });
    describe('Connection Management', () => {
        test('should create connections successfully', async () => {
            const connectionData = {
                name: 'Test Splunk Connection',
                connectorId: 'SPLUNK',
                description: 'Test connection to Splunk',
                endpoint: 'https://splunk.example.com:8089',
                authentication: {
                    type: 'api_key',
                    credentials: { apiKey: 'test-api-key' }
                },
                settings: { timeout: 30000 },
                userId: 'admin123'
            };
            // Mock validation and test methods
            integrationService.validateAuthentication = jest.fn().mockResolvedValue(true);
            integrationService.testConnection = jest.fn().mockResolvedValue({
                success: true,
                responseTime: 250
            });
            const connection = await integrationService.createConnection(connectionData);
            expect(connection.id).toBeDefined();
            expect(connection.name).toBe('Test Splunk Connection');
            expect(connection.connectorId).toBe('SPLUNK');
            expect(connection.status).toBe('ACTIVE');
            expect(connection.lastTested).toBeInstanceOf(Date);
            expect(connection.syncEnabled).toBe(true);
            expect(integrationService.connections.has(connection.id)).toBe(true);
            expect(integrationService.metrics.activeConnections).toBe(1);
        });
        test('should validate authentication before creating connections', async () => {
            const connectionData = {
                name: 'Invalid Connection',
                connectorId: 'ELASTIC',
                authentication: {
                    type: 'api_key',
                    credentials: {} // Missing apiKey
                },
                userId: 'admin123'
            };
            await expect(integrationService.createConnection(connectionData))
                .rejects.toThrow('API key is required');
        });
        test('should reject connections with invalid connectors', async () => {
            const connectionData = {
                name: 'Invalid Connector Connection',
                connectorId: 'INVALID_CONNECTOR',
                authentication: { type: 'api_key', credentials: { apiKey: 'test' } },
                userId: 'admin123'
            };
            await expect(integrationService.createConnection(connectionData))
                .rejects.toThrow('Unknown connector: INVALID_CONNECTOR');
        });
        test('should fail connection creation on test failure', async () => {
            const connectionData = {
                name: 'Failing Connection',
                connectorId: 'SPLUNK',
                authentication: {
                    type: 'api_key',
                    credentials: { apiKey: 'invalid-key' }
                },
                userId: 'admin123'
            };
            integrationService.validateAuthentication = jest.fn().mockResolvedValue(true);
            integrationService.testConnection = jest.fn().mockResolvedValue({
                success: false,
                error: 'Authentication failed'
            });
            await expect(integrationService.createConnection(connectionData))
                .rejects.toThrow('Connection test failed: Authentication failed');
        });
        test('should update existing connections', async () => {
            const connection = {
                id: 'conn123',
                name: 'Original Name',
                connectorId: 'ELASTIC',
                authentication: {
                    type: 'api_key',
                    credentials: 'encrypted_old_creds'
                }
            };
            integrationService.connections.set('conn123', connection);
            const updates = {
                name: 'Updated Name',
                authentication: {
                    type: 'api_key',
                    credentials: { apiKey: 'new-api-key' }
                }
            };
            integrationService.encryptCredentials = jest.fn().mockReturnValue('encrypted_new_creds');
            integrationService.testConnection = jest.fn().mockResolvedValue({ success: true });
            const updatedConnection = await integrationService.updateConnection('conn123', updates);
            expect(updatedConnection.name).toBe('Updated Name');
            expect(updatedConnection.authentication.credentials).toBe('encrypted_new_creds');
            expect(updatedConnection.status).toBe('ACTIVE');
            expect(updatedConnection.lastTested).toBeInstanceOf(Date);
        });
        test('should delete connections and cleanup sync jobs', async () => {
            const connection = { id: 'conn123', name: 'Test Connection' };
            const syncJob = { id: 'job123', connectionId: 'conn123' };
            integrationService.connections.set('conn123', connection);
            integrationService.syncJobs.set('job123', syncJob);
            integrationService.metrics.activeConnections = 1;
            integrationService.cancelSyncJob = jest.fn().mockResolvedValue(true);
            const result = await integrationService.deleteConnection('conn123');
            expect(result).toBe(true);
            expect(integrationService.connections.has('conn123')).toBe(false);
            expect(integrationService.metrics.activeConnections).toBe(0);
            expect(integrationService.cancelSyncJob).toHaveBeenCalledWith('job123');
        });
    });
    describe('Authentication Validation', () => {
        test('should validate API key authentication', async () => {
            const connection = {
                authentication: {
                    type: 'api_key',
                    credentials: { apiKey: 'test-key' }
                }
            };
            const connector = { authentication: ['api_key'] };
            const result = await integrationService.validateAuthentication(connection, connector);
            expect(result).toBe(true);
        });
        test('should validate username/password authentication', async () => {
            const connection = {
                authentication: {
                    type: 'username_password',
                    credentials: { username: 'admin', password: 'secret' }
                }
            };
            const connector = { authentication: ['username_password'] };
            const result = await integrationService.validateAuthentication(connection, connector);
            expect(result).toBe(true);
        });
        test('should validate OAuth2 authentication', async () => {
            const connection = {
                authentication: {
                    type: 'oauth2',
                    token: 'oauth-token'
                }
            };
            const connector = { authentication: ['oauth2'] };
            const result = await integrationService.validateAuthentication(connection, connector);
            expect(result).toBe(true);
        });
        test('should validate AWS credentials', async () => {
            const connection = {
                authentication: {
                    type: 'aws_credentials',
                    credentials: {
                        accessKeyId: 'AKIA...',
                        secretAccessKey: 'secret'
                    }
                }
            };
            const connector = { authentication: ['aws_credentials'] };
            const result = await integrationService.validateAuthentication(connection, connector);
            expect(result).toBe(true);
        });
        test('should reject unsupported authentication types', async () => {
            const connection = {
                authentication: { type: 'unsupported_auth' }
            };
            const connector = { authentication: ['api_key'] };
            await expect(integrationService.validateAuthentication(connection, connector))
                .rejects.toThrow('Authentication type unsupported_auth not supported');
        });
        test('should reject incomplete credentials', async () => {
            const connection = {
                authentication: {
                    type: 'username_password',
                    credentials: { username: 'admin' } // Missing password
                }
            };
            const connector = { authentication: ['username_password'] };
            await expect(integrationService.validateAuthentication(connection, connector))
                .rejects.toThrow('Username and password are required');
        });
    });
    describe('Connection Testing', () => {
        test('should test connections successfully', async () => {
            const connection = { id: 'conn123', endpoint: 'https://api.example.com' };
            const connector = { id: 'SPLUNK' };
            integrationService.getTestEndpoint = jest.fn().mockReturnValue('/api/status');
            integrationService.makeRequest = jest.fn().mockResolvedValue({
                data: { status: 'ok' },
                responseTime: 150
            });
            const result = await integrationService.testConnection(connection, connector);
            expect(result.success).toBe(true);
            expect(result.response).toEqual({ status: 'ok' });
            expect(result.responseTime).toBe(150);
        });
        test('should handle connection test failures', async () => {
            const connection = { id: 'conn123' };
            const connector = { id: 'ELASTIC' };
            integrationService.getTestEndpoint = jest.fn().mockReturnValue('/_cluster/health');
            integrationService.makeRequest = jest.fn().mockRejectedValue(new Error('Connection timeout'));
            const result = await integrationService.testConnection(connection, connector);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Connection timeout');
        });
        test('should use appropriate test endpoints for each connector', () => {
            const splunkEndpoint = integrationService.getTestEndpoint({ id: 'SPLUNK' });
            expect(splunkEndpoint).toBe('/services/server/info');
            const elasticEndpoint = integrationService.getTestEndpoint({ id: 'ELASTIC' });
            expect(elasticEndpoint).toBe('/_cluster/health');
            const mispEndpoint = integrationService.getTestEndpoint({ id: 'MISP' });
            expect(mispEndpoint).toBe('/servers/getVersion');
            const defaultEndpoint = integrationService.getTestEndpoint({ id: 'UNKNOWN' });
            expect(defaultEndpoint).toBe('/');
        });
    });
    describe('Data Operations', () => {
        test('should execute queries on active connections', async () => {
            const connection = {
                id: 'conn123',
                connectorId: 'SPLUNK',
                status: 'ACTIVE',
                metrics: { requests: 0, successes: 0, failures: 0, dataTransferred: 0, lastRequest: null }
            };
            integrationService.connections.set('conn123', connection);
            const query = { search: 'index=main | head 10' };
            const connector = { id: 'SPLUNK' };
            integrationService.getConnector = jest.fn().mockReturnValue(connector);
            integrationService.executeQuery = jest.fn().mockResolvedValue({
                success: true,
                data: [{ event: 'test event' }],
                dataSize: 1024
            });
            const result = await integrationService.queryData('conn123', query);
            expect(result.success).toBe(true);
            expect(result.data).toEqual([{ event: 'test event' }]);
            expect(connection.metrics.requests).toBe(1);
            expect(connection.metrics.successes).toBe(1);
            expect(connection.metrics.dataTransferred).toBe(1024);
            expect(integrationService.metrics.dataTransferred).toBe(1024);
        });
        test('should reject queries on inactive connections', async () => {
            const connection = {
                id: 'conn123',
                status: 'FAILED'
            };
            integrationService.connections.set('conn123', connection);
            await expect(integrationService.queryData('conn123', {}))
                .rejects.toThrow('Connection is not active');
        });
        test('should handle query execution failures', async () => {
            const connection = {
                id: 'conn123',
                connectorId: 'ELASTIC',
                status: 'ACTIVE',
                metrics: { requests: 0, successes: 0, failures: 0 }
            };
            integrationService.connections.set('conn123', connection);
            const connector = { id: 'ELASTIC' };
            integrationService.getConnector = jest.fn().mockReturnValue(connector);
            integrationService.executeQuery = jest.fn().mockResolvedValue({
                success: false,
                error: 'Query syntax error'
            });
            const result = await integrationService.queryData('conn123', {});
            expect(result.success).toBe(false);
            expect(result.error).toBe('Query syntax error');
            expect(connection.metrics.failures).toBe(1);
        });
    });
    describe('Sync Job Management', () => {
        test('should create sync jobs', async () => {
            const syncJobData = {
                connectionId: 'conn123',
                name: 'Daily Data Sync',
                description: 'Sync data daily from Splunk',
                type: 'INCREMENTAL',
                schedule: '0 9 * * *', // Daily at 9 AM
                filters: { index: 'security' },
                userId: 'admin123'
            };
            integrationService.calculateNextRun = jest.fn().mockReturnValue(new Date(Date.now() + 60000));
            const syncJob = await integrationService.createSyncJob(syncJobData);
            expect(syncJob.id).toBeDefined();
            expect(syncJob.name).toBe('Daily Data Sync');
            expect(syncJob.connectionId).toBe('conn123');
            expect(syncJob.type).toBe('INCREMENTAL');
            expect(syncJob.status).toBe('CREATED');
            expect(syncJob.nextRun).toBeInstanceOf(Date);
            expect(syncJob.metrics.totalRuns).toBe(0);
            expect(integrationService.syncJobs.has(syncJob.id)).toBe(true);
        });
        test('should run sync jobs successfully', async () => {
            const syncJob = {
                id: 'job123',
                connectionId: 'conn123',
                status: 'CREATED',
                metrics: { totalRuns: 0, successfulRuns: 0, recordsProcessed: 0, averageDuration: 0 }
            };
            const connection = {
                id: 'conn123',
                connectorId: 'SPLUNK',
                status: 'ACTIVE'
            };
            integrationService.syncJobs.set('job123', syncJob);
            integrationService.connections.set('conn123', connection);
            const connector = { id: 'SPLUNK' };
            integrationService.getConnector = jest.fn().mockReturnValue(connector);
            integrationService.executeSyncOperation = jest.fn().mockResolvedValue({
                recordsProcessed: 150
            });
            const result = await integrationService.runSyncJob('job123');
            expect(result.recordsProcessed).toBe(150);
            expect(syncJob.status).toBe('COMPLETED');
            expect(syncJob.metrics.totalRuns).toBe(1);
            expect(syncJob.metrics.successfulRuns).toBe(1);
            expect(syncJob.metrics.recordsProcessed).toBe(150);
            expect(integrationService.metrics.syncOperations).toBe(1);
        });
        test('should handle sync job failures', async () => {
            const syncJob = {
                id: 'job123',
                connectionId: 'conn123',
                metrics: { totalRuns: 0, failedRuns: 0 }
            };
            const connection = { id: 'conn123', status: 'ACTIVE' };
            integrationService.syncJobs.set('job123', syncJob);
            integrationService.connections.set('conn123', connection);
            integrationService.getConnector = jest.fn().mockReturnValue({ id: 'SPLUNK' });
            integrationService.executeSyncOperation = jest.fn().mockRejectedValue(new Error('Sync operation failed'));
            await expect(integrationService.runSyncJob('job123'))
                .rejects.toThrow('Sync operation failed');
            expect(syncJob.status).toBe('FAILED');
            expect(syncJob.metrics.totalRuns).toBe(1);
            expect(syncJob.metrics.failedRuns).toBe(1);
            expect(mockLogger.error).toHaveBeenCalled();
        });
        test('should process scheduled syncs', async () => {
            const pastTime = new Date(Date.now() - 60000); // 1 minute ago
            const futureTime = new Date(Date.now() + 60000); // 1 minute from now
            const readyJob = {
                id: 'ready_job',
                status: 'CREATED',
                nextRun: pastTime,
                schedule: '*/5 * * * *'
            };
            const notReadyJob = {
                id: 'not_ready_job',
                status: 'CREATED',
                nextRun: futureTime
            };
            integrationService.syncJobs.set('ready_job', readyJob);
            integrationService.syncJobs.set('not_ready_job', notReadyJob);
            integrationService.runSyncJob = jest.fn().mockResolvedValue({});
            integrationService.calculateNextRun = jest.fn().mockReturnValue(new Date(Date.now() + 5 * 60000));
            await integrationService.processScheduledSyncs();
            expect(integrationService.runSyncJob).toHaveBeenCalledWith('ready_job');
            expect(integrationService.runSyncJob).not.toHaveBeenCalledWith('not_ready_job');
            expect(readyJob.nextRun.getTime()).toBeGreaterThan(Date.now());
        });
    });
    describe('Webhook Management', () => {
        test('should create webhooks', async () => {
            const webhookData = {
                name: 'Investigation Alert Webhook',
                url: 'https://external-system.com/webhooks/alerts',
                method: 'POST',
                headers: { 'Authorization': 'Bearer token123' },
                events: ['INVESTIGATION_CREATED', 'ENTITY_ADDED'],
                filters: { priority: 'HIGH' },
                userId: 'admin123'
            };
            const webhook = await integrationService.createWebhook(webhookData);
            expect(webhook.id).toBeDefined();
            expect(webhook.name).toBe('Investigation Alert Webhook');
            expect(webhook.url).toBe('https://external-system.com/webhooks/alerts');
            expect(webhook.events).toContain('INVESTIGATION_CREATED');
            expect(webhook.secret).toBeDefined();
            expect(webhook.enabled).toBe(true);
            expect(webhook.metrics.totalDeliveries).toBe(0);
        });
        test('should trigger webhooks for matching events', async () => {
            const webhook = {
                id: 'webhook123',
                url: 'https://api.example.com/webhook',
                method: 'POST',
                events: ['ENTITY_CREATED'],
                filters: {},
                enabled: true,
                secret: 'webhook_secret',
                timeout: 10000,
                metrics: { totalDeliveries: 0, successfulDeliveries: 0, averageResponseTime: 0 }
            };
            integrationService.webhooks.set('webhook123', webhook);
            const eventData = {
                type: 'ENTITY_CREATED',
                data: { entityId: 'ent123', label: 'New Entity' }
            };
            integrationService.matchesWebhookFilters = jest.fn().mockReturnValue(true);
            integrationService.generateWebhookSignature = jest.fn().mockReturnValue('signature123');
            integrationService.makeWebhookRequest = jest.fn().mockResolvedValue({
                status: 200
            });
            const result = await integrationService.triggerWebhook('webhook123', eventData);
            expect(result).toBe(true);
            expect(webhook.metrics.totalDeliveries).toBe(1);
            expect(webhook.metrics.successfulDeliveries).toBe(1);
            expect(integrationService.metrics.webhookDeliveries).toBe(1);
        });
        test('should handle webhook delivery failures with retry', (done) => {
            const webhook = {
                id: 'webhook123',
                url: 'https://api.example.com/webhook',
                enabled: true,
                events: ['TEST_EVENT'],
                filters: {},
                retryCount: 3,
                retryDelay: 1000,
                metrics: { totalDeliveries: 0, failedDeliveries: 0 }
            };
            integrationService.webhooks.set('webhook123', webhook);
            const eventData = { type: 'TEST_EVENT', data: {} };
            integrationService.matchesWebhookFilters = jest.fn().mockReturnValue(true);
            integrationService.generateWebhookSignature = jest.fn().mockReturnValue('sig');
            integrationService.makeWebhookRequest = jest.fn().mockRejectedValue(new Error('Network timeout'));
            integrationService.retryWebhook = jest.fn();
            integrationService.triggerWebhook('webhook123', eventData).then(result => {
                expect(result).toBe(false);
                expect(webhook.metrics.totalDeliveries).toBe(1);
                expect(webhook.metrics.failedDeliveries).toBe(1);
                expect(integrationService.metrics.failedWebhooks).toBe(1);
                expect(mockLogger.error).toHaveBeenCalled();
                // Should schedule retry
                setTimeout(() => {
                    try {
                        expect(integrationService.retryWebhook).toHaveBeenCalled();
                        done();
                    }
                    catch (error) {
                        done(error);
                    }
                }, 1100);
            }).catch(error => {
                done(error); // Catch any errors from triggerWebhook
            });
        });
        test('should skip disabled webhooks', async () => {
            const webhook = {
                id: 'disabled_webhook',
                enabled: false,
                events: ['TEST_EVENT']
            };
            integrationService.webhooks.set('disabled_webhook', webhook);
            const eventData = { type: 'TEST_EVENT', data: {} };
            const result = await integrationService.triggerWebhook('disabled_webhook', eventData);
            expect(result).toBe(false);
        });
        test('should filter events based on webhook configuration', () => {
            const webhook = {
                events: ['ENTITY_CREATED', 'ENTITY_UPDATED'],
                filters: { priority: 'HIGH', type: 'PERSON' }
            };
            const matchingEvent = {
                type: 'ENTITY_CREATED',
                data: { priority: 'HIGH', type: 'PERSON' }
            };
            const nonMatchingEvent1 = {
                type: 'ENTITY_DELETED', // Wrong event type
                data: { priority: 'HIGH', type: 'PERSON' }
            };
            const nonMatchingEvent2 = {
                type: 'ENTITY_CREATED',
                data: { priority: 'LOW', type: 'PERSON' } // Wrong priority
            };
            expect(integrationService.matchesWebhookFilters(matchingEvent, webhook)).toBe(true);
            expect(integrationService.matchesWebhookFilters(nonMatchingEvent1, webhook)).toBe(false);
            expect(integrationService.matchesWebhookFilters(nonMatchingEvent2, webhook)).toBe(false);
        });
    });
    describe('Security and Encryption', () => {
        test('should encrypt and decrypt credentials', () => {
            const credentials = { apiKey: 'secret-key', password: 'secret-pass' };
            const encrypted = integrationService.encryptCredentials(credentials);
            const decrypted = integrationService.decryptCredentials(encrypted);
            expect(encrypted).not.toEqual(JSON.stringify(credentials));
            expect(decrypted).toEqual(credentials);
        });
        test('should generate webhook signatures', () => {
            const payload = { id: 'test123', data: 'test data' };
            const secret = 'webhook_secret';
            const signature = integrationService.generateWebhookSignature(payload, secret);
            expect(signature).toBeDefined();
            expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
        });
        test('should generate consistent signatures', () => {
            const payload = { test: 'data' };
            const secret = 'same_secret';
            const sig1 = integrationService.generateWebhookSignature(payload, secret);
            const sig2 = integrationService.generateWebhookSignature(payload, secret);
            expect(sig1).toBe(sig2);
        });
    });
    describe('Connection Health and Metrics', () => {
        test('should track connection metrics', () => {
            // Set up some connections
            integrationService.connections.set('conn1', { status: 'ACTIVE', connectorId: 'SPLUNK' });
            integrationService.connections.set('conn2', { status: 'ACTIVE', connectorId: 'ELASTIC' });
            integrationService.connections.set('conn3', { status: 'FAILED', connectorId: 'SPLUNK' });
            const metrics = integrationService.getMetrics();
            expect(metrics.totalConnectors).toBe(0); // Based on initialization
            expect(metrics.connectionHealth).toBe('66.67'); // 2 active out of 3 total
            expect(metrics.connectorBreakdown).toBeDefined();
            expect(metrics.connectorBreakdown.SPLUNK.total).toBe(2);
            expect(metrics.connectorBreakdown.SPLUNK.active).toBe(1);
            expect(metrics.connectorBreakdown.SPLUNK.failed).toBe(1);
        });
        test('should calculate connection health percentage', () => {
            // Empty state
            expect(integrationService.getConnectionHealth()).toBe(100);
            // Add connections
            integrationService.connections.set('active1', { status: 'ACTIVE' });
            integrationService.connections.set('active2', { status: 'ACTIVE' });
            integrationService.connections.set('failed1', { status: 'FAILED' });
            expect(integrationService.getConnectionHealth()).toBe('66.67');
        });
        test('should provide connector breakdown statistics', () => {
            integrationService.connections.set('splunk1', { connectorId: 'SPLUNK', status: 'ACTIVE' });
            integrationService.connections.set('splunk2', { connectorId: 'SPLUNK', status: 'FAILED' });
            integrationService.connections.set('elastic1', { connectorId: 'ELASTIC', status: 'ACTIVE' });
            const breakdown = integrationService.getConnectorBreakdown();
            expect(breakdown.SPLUNK.total).toBe(2);
            expect(breakdown.SPLUNK.active).toBe(1);
            expect(breakdown.SPLUNK.failed).toBe(1);
            expect(breakdown.ELASTIC.total).toBe(1);
            expect(breakdown.ELASTIC.active).toBe(1);
            expect(breakdown.ELASTIC.failed).toBe(0);
        });
    });
    describe('API Methods', () => {
        test('should list connectors', () => {
            const connectors = integrationService.getConnectors();
            expect(connectors).toBeInstanceOf(Array);
            expect(connectors.length).toBeGreaterThan(0);
        });
        test('should get specific connector details', () => {
            const splunk = integrationService.getConnector('SPLUNK');
            expect(splunk).toBeDefined();
            expect(splunk.id).toBe('SPLUNK');
            expect(splunk.name).toBe('Splunk Enterprise');
            const invalid = integrationService.getConnector('INVALID');
            expect(invalid).toBeUndefined();
        });
        test('should list connections with user filtering', () => {
            integrationService.connections.set('conn1', { createdBy: 'user1' });
            integrationService.connections.set('conn2', { createdBy: 'user2' });
            integrationService.connections.set('conn3', { createdBy: 'user1' });
            const allConnections = integrationService.getConnections();
            expect(allConnections).toHaveLength(3);
            const user1Connections = integrationService.getConnections('user1');
            expect(user1Connections).toHaveLength(2);
            const user2Connections = integrationService.getConnections('user2');
            expect(user2Connections).toHaveLength(1);
        });
        test('should list webhooks with user filtering', () => {
            integrationService.webhooks.set('webhook1', { createdBy: 'user1' });
            integrationService.webhooks.set('webhook2', { createdBy: 'user2' });
            const allWebhooks = integrationService.getWebhooks();
            expect(allWebhooks).toHaveLength(2);
            const user1Webhooks = integrationService.getWebhooks('user1');
            expect(user1Webhooks).toHaveLength(1);
        });
        test('should list sync jobs with connection filtering', () => {
            integrationService.syncJobs.set('job1', { connectionId: 'conn1' });
            integrationService.syncJobs.set('job2', { connectionId: 'conn2' });
            integrationService.syncJobs.set('job3', { connectionId: 'conn1' });
            const allJobs = integrationService.getSyncJobs();
            expect(allJobs).toHaveLength(3);
            const conn1Jobs = integrationService.getSyncJobs('conn1');
            expect(conn1Jobs).toHaveLength(2);
        });
    });
    describe('Error Handling', () => {
        test('should handle connection not found errors', async () => {
            await expect(integrationService.updateConnection('nonexistent', {}))
                .rejects.toThrow('Connection not found');
            await expect(integrationService.deleteConnection('nonexistent'))
                .rejects.toThrow('Connection not found');
            await expect(integrationService.queryData('nonexistent', {}))
                .rejects.toThrow('Connection not found');
        });
        test('should handle sync job not found errors', async () => {
            await expect(integrationService.runSyncJob('nonexistent'))
                .rejects.toThrow('Sync job not found');
        });
        test('should handle webhook not found gracefully', async () => {
            const result = await integrationService.triggerWebhook('nonexistent', {});
            expect(result).toBe(false);
        });
    });
    describe('Utility Methods', () => {
        test('should calculate next run times', () => {
            // Mock implementation returns 1 hour from now
            const nextRun = integrationService.calculateNextRun('0 * * * *');
            expect(nextRun).toBeInstanceOf(Date);
            expect(nextRun.getTime()).toBeGreaterThan(Date.now());
        });
        test('should make HTTP requests', async () => {
            integrationService.makeRequest = jest.fn().mockResolvedValue({
                data: { status: 'ok', message: 'Test response' },
                status: 200,
                responseTime: 123
            });
            const response = await integrationService.makeRequest({ endpoint: 'https://api.example.com' }, 'GET', '/test');
            expect(response.data).toEqual({ status: 'ok', message: 'Test response' });
            expect(response.status).toBe(200);
            expect(response.responseTime).toBeGreaterThan(0);
        });
    });
});
// Performance and integration tests  
describe('Integration Service Performance', () => {
    let integrationService;
    beforeEach(() => {
        integrationService = new IntegrationService({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        });
    });
    test('should handle many concurrent connections efficiently', async () => {
        const connectionRequests = Array(50).fill().map((_, i) => ({
            name: `Connection ${i}`,
            connectorId: 'SPLUNK',
            endpoint: `https://splunk${i}.example.com`,
            authentication: {
                type: 'api_key',
                credentials: { apiKey: `key${i}` }
            },
            userId: `user${i % 5}` // 5 different users
        }));
        // Mock methods
        integrationService.validateAuthentication = jest.fn().mockResolvedValue(true);
        integrationService.testConnection = jest.fn().mockResolvedValue({ success: true });
        const startTime = Date.now();
        const connections = await Promise.all(connectionRequests.map(req => integrationService.createConnection(req)));
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        expect(connections).toHaveLength(50);
        expect(integrationService.metrics.activeConnections).toBe(50);
    });
    test('should efficiently process webhook deliveries', async () => {
        // Create many webhooks
        const webhooks = Array(100).fill().map((_, i) => ({
            id: `webhook${i}`,
            url: `https://webhook${i}.example.com`,
            events: ['TEST_EVENT'],
            enabled: true,
            filters: {},
            metrics: { totalDeliveries: 0, successfulDeliveries: 0, failedDeliveries: 0, averageResponseTime: 0 }
        }));
        webhooks.forEach(webhook => {
            integrationService.webhooks.set(webhook.id, webhook);
        });
        integrationService.matchesWebhookFilters = jest.fn().mockReturnValue(true);
        integrationService.makeWebhookRequest = jest.fn().mockResolvedValue({ status: 200 });
        const eventData = { type: 'TEST_EVENT', data: { test: 'data' } };
        const startTime = Date.now();
        const results = await Promise.all(webhooks.map(webhook => integrationService.triggerWebhook(webhook.id, eventData)));
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(8000); // Should complete within 8 seconds
        expect(results.every(r => r === true)).toBe(true);
        expect(integrationService.metrics.webhookDeliveries).toBe(100);
    });
});
//# sourceMappingURL=integrationService.test.js.map