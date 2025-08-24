/**
 * War Room Sync Service Tests
 * P0 Critical - Validates <300ms latency requirement for MVP1
 */
const WarRoomSyncService = require('../services/WarRoomSyncService');
const { Server } = require('socket.io');
const { createServer } = require('http');
const ioc = require('socket.io-client');
describe('War Room Graph Sync - P0 Critical MVP1', () => {
    let warRoomSync;
    let io;
    let httpServer;
    beforeAll((done) => {
        httpServer = createServer();
        io = new Server(httpServer);
        warRoomSync = new WarRoomSyncService(io, null); // Mock Neo4j
        httpServer.listen(() => {
            const port = httpServer.address().port;
        });
    });
    afterAll(() => {
        io.close();
        httpServer.close();
    });
    describe('P0 Requirement: <300ms Latency', () => {
        test('should initialize war room in under 50ms', async () => {
            const startTime = Date.now();
            const room = await warRoomSync.initializeWarRoom('test-room-001');
            const latency = Date.now() - startTime;
            expect(room).toBeDefined();
            expect(room.id).toBe('test-room-001');
            expect(latency).toBeLessThan(50);
        });
        test('should handle graph operations with <300ms latency', async () => {
            const roomId = 'test-room-sync';
            await warRoomSync.initializeWarRoom(roomId);
            // Mock socket objects
            const mockSocket1 = {
                id: 'socket1',
                emit: jest.fn(),
                to: jest.fn(() => ({ emit: jest.fn() }))
            };
            const mockSocket2 = {
                id: 'socket2',
                emit: jest.fn(),
                to: jest.fn(() => ({ emit: jest.fn() }))
            };
            // Join users to war room
            await warRoomSync.joinWarRoom(mockSocket1, roomId, 'user1', { name: 'User 1', role: 'admin' });
            await warRoomSync.joinWarRoom(mockSocket2, roomId, 'user2', { name: 'User 2', role: 'analyst' });
            const operation = {
                id: 'op-001',
                type: 'add_node',
                data: {
                    nodeId: 'node-001',
                    properties: {
                        label: 'Test Entity',
                        type: 'Person'
                    },
                    position: { x: 100, y: 100 }
                },
                userId: 'user1'
            };
            const startTime = Date.now();
            await warRoomSync.handleGraphOperation(mockSocket1, roomId, 'user1', operation);
            const latency = Date.now() - startTime;
            // Verify P0 requirement
            expect(latency).toBeLessThan(300);
            // Verify operation was applied
            expect(mockSocket1.emit).toHaveBeenCalledWith('war_room_operation_applied', expect.objectContaining({
                operationId: 'op-001',
                latency
            }));
        });
        test('should handle concurrent operations without conflicts', async () => {
            const roomId = 'test-room-concurrent';
            await warRoomSync.initializeWarRoom(roomId);
            const mockSocket = {
                id: 'socket1',
                emit: jest.fn(),
                to: jest.fn(() => ({ emit: jest.fn() }))
            };
            await warRoomSync.joinWarRoom(mockSocket, roomId, 'user1', { name: 'User 1', role: 'admin' });
            const operations = [
                {
                    id: 'op-concurrent-1',
                    type: 'add_node',
                    data: { nodeId: 'node-001', properties: { label: 'Node 1' } },
                    userId: 'user1'
                },
                {
                    id: 'op-concurrent-2',
                    type: 'add_node',
                    data: { nodeId: 'node-002', properties: { label: 'Node 2' } },
                    userId: 'user1'
                },
                {
                    id: 'op-concurrent-3',
                    type: 'add_edge',
                    data: {
                        edgeId: 'edge-001',
                        source: 'node-001',
                        target: 'node-002',
                        properties: { type: 'CONNECTS' }
                    },
                    userId: 'user1'
                }
            ];
            const startTime = Date.now();
            // Execute operations concurrently
            const promises = operations.map(op => warRoomSync.handleGraphOperation(mockSocket, roomId, 'user1', op));
            await Promise.all(promises);
            const totalLatency = Date.now() - startTime;
            // Even with concurrent operations, should stay under latency requirement
            expect(totalLatency).toBeLessThan(500);
            // Verify all operations succeeded
            expect(mockSocket.emit).toHaveBeenCalledTimes(3);
        });
        test('should resolve conflicts quickly', async () => {
            const roomId = 'test-room-conflicts';
            await warRoomSync.initializeWarRoom(roomId);
            const mockSocket1 = {
                id: 'socket1',
                emit: jest.fn(),
                to: jest.fn(() => ({ emit: jest.fn() }))
            };
            const mockSocket2 = {
                id: 'socket2',
                emit: jest.fn(),
                to: jest.fn(() => ({ emit: jest.fn() }))
            };
            await warRoomSync.joinWarRoom(mockSocket1, roomId, 'user1', { name: 'User 1', role: 'admin' });
            await warRoomSync.joinWarRoom(mockSocket2, roomId, 'user2', { name: 'User 2', role: 'analyst' });
            // Create the node first
            await warRoomSync.handleGraphOperation(mockSocket1, roomId, 'user1', {
                id: 'op-create',
                type: 'add_node',
                data: { nodeId: 'conflict-node', properties: { label: 'Original' } },
                userId: 'user1'
            });
            // Conflicting operations on same node
            const operation1 = {
                id: 'op-conflict-1',
                type: 'update_node',
                data: { nodeId: 'conflict-node', properties: { label: 'Updated by User 1' } },
                userId: 'user1'
            };
            const operation2 = {
                id: 'op-conflict-2',
                type: 'update_node',
                data: { nodeId: 'conflict-node', properties: { label: 'Updated by User 2' } },
                userId: 'user2'
            };
            const startTime = Date.now();
            // Execute conflicting operations
            await Promise.all([
                warRoomSync.handleGraphOperation(mockSocket1, roomId, 'user1', operation1),
                warRoomSync.handleGraphOperation(mockSocket2, roomId, 'user2', operation2)
            ]);
            const conflictResolutionTime = Date.now() - startTime;
            // Conflict resolution should be fast
            expect(conflictResolutionTime).toBeLessThan(100);
            // Verify metrics
            expect(warRoomSync.metrics.conflictsResolved).toBeGreaterThan(0);
        });
    });
    describe('Operational Transform', () => {
        test('should transform concurrent operations correctly', async () => {
            const roomId = 'test-room-ot';
            await warRoomSync.initializeWarRoom(roomId);
            const room = warRoomSync.warRooms.get(roomId);
            const ot = warRoomSync.operationalTransforms.get(roomId);
            const operation1 = {
                id: 'ot-1',
                type: 'update_node',
                data: { nodeId: 'ot-node', properties: { prop1: 'value1' } },
                userId: 'user1'
            };
            const operation2 = {
                id: 'ot-2',
                type: 'update_node',
                data: { nodeId: 'ot-node', properties: { prop2: 'value2' } },
                userId: 'user2'
            };
            // Add first operation to log
            room.operationLog.push(operation1);
            // Transform second operation
            const transformed = ot.transform(operation2, room.operationLog);
            expect(transformed).toBeDefined();
            expect(transformed.id).toBe('ot-2');
        });
    });
    describe('Performance Metrics', () => {
        test('should track performance metrics accurately', async () => {
            const roomId = 'test-room-metrics';
            await warRoomSync.initializeWarRoom(roomId);
            const initialOperationsCount = warRoomSync.metrics.operationsApplied;
            const mockSocket = {
                id: 'socket1',
                emit: jest.fn(),
                to: jest.fn(() => ({ emit: jest.fn() }))
            };
            await warRoomSync.joinWarRoom(mockSocket, roomId, 'user1', { name: 'User 1', role: 'admin' });
            const operation = {
                id: 'metrics-test',
                type: 'add_node',
                data: { nodeId: 'metrics-node', properties: { label: 'Metrics Test' } },
                userId: 'user1'
            };
            await warRoomSync.handleGraphOperation(mockSocket, roomId, 'user1', operation);
            expect(warRoomSync.metrics.operationsApplied).toBe(initialOperationsCount + 1);
            expect(warRoomSync.metrics.avgLatency).toBeGreaterThan(0);
            expect(warRoomSync.metrics.avgLatency).toBeLessThan(300);
        });
        test('should provide room statistics', () => {
            const roomId = 'test-room-stats';
            warRoomSync.initializeWarRoom(roomId);
            const stats = warRoomSync.getRoomStats(roomId);
            expect(stats).toBeDefined();
            expect(stats.roomId).toBe(roomId);
            expect(stats.participants).toBe(0);
            expect(stats.graphSize).toBeDefined();
            expect(stats.version).toBe(0);
        });
    });
    describe('Error Handling', () => {
        test('should handle invalid operations gracefully', async () => {
            const roomId = 'test-room-errors';
            await warRoomSync.initializeWarRoom(roomId);
            const mockSocket = {
                id: 'socket1',
                emit: jest.fn(),
                to: jest.fn(() => ({ emit: jest.fn() }))
            };
            await warRoomSync.joinWarRoom(mockSocket, roomId, 'user1', { name: 'User 1', role: 'admin' });
            // Invalid operation - missing required data
            const invalidOperation = {
                id: 'invalid-op',
                type: 'add_node',
                // Missing data field
                userId: 'user1'
            };
            await warRoomSync.handleGraphOperation(mockSocket, roomId, 'user1', invalidOperation);
            // Should emit operation rejected
            expect(mockSocket.emit).toHaveBeenCalledWith('war_room_operation_rejected', expect.objectContaining({
                operationId: 'invalid-op',
                reason: expect.any(String)
            }));
        });
        test('should handle user permission violations', async () => {
            const roomId = 'test-room-permissions';
            await warRoomSync.initializeWarRoom(roomId);
            const mockSocket = {
                id: 'socket1',
                emit: jest.fn(),
                to: jest.fn(() => ({ emit: jest.fn() }))
            };
            // Join as viewer (limited permissions)
            await warRoomSync.joinWarRoom(mockSocket, roomId, 'user1', { name: 'User 1', role: 'viewer' });
            // Try to delete node (admin operation)
            const deleteOperation = {
                id: 'delete-op',
                type: 'delete_node',
                data: { nodeId: 'some-node' },
                userId: 'user1'
            };
            await warRoomSync.handleGraphOperation(mockSocket, roomId, 'user1', deleteOperation);
            // Should be rejected due to insufficient permissions
            expect(mockSocket.emit).toHaveBeenCalledWith('war_room_operation_rejected', expect.objectContaining({
                operationId: 'delete-op',
                reason: 'Insufficient permissions'
            }));
        });
    });
});
// Integration test with real sockets (if running in integration mode)
if (process.env.TEST_MODE === 'integration') {
    describe('War Room Sync Integration', () => {
        let httpServer;
        let io;
        let clientSocket1;
        let clientSocket2;
        beforeAll((done) => {
            httpServer = createServer();
            io = new Server(httpServer);
            httpServer.listen(() => {
                const port = httpServer.address().port;
                clientSocket1 = ioc(`http://localhost:${port}`);
                clientSocket2 = ioc(`http://localhost:${port}`);
                let connectedCount = 0;
                const checkConnected = () => {
                    connectedCount++;
                    if (connectedCount === 2)
                        done();
                };
                clientSocket1.on('connect', checkConnected);
                clientSocket2.on('connect', checkConnected);
            });
        });
        afterAll(() => {
            io.close();
            httpServer.close();
            clientSocket1.disconnect();
            clientSocket2.disconnect();
        });
        test('should sync operations between real socket clients', (done) => {
            const roomId = 'integration-test-room';
            let operationsReceived = 0;
            clientSocket2.on('war_room_operation_broadcast', (data) => {
                expect(data).toBeDefined();
                expect(data.operation.type).toBe('add_node');
                expect(data.roomId).toBe(roomId);
                operationsReceived++;
                if (operationsReceived === 1) {
                    done();
                }
            });
            // Client 1 joins room and sends operation
            clientSocket1.emit('war_room_join', {
                roomId,
                userInfo: { name: 'Integration User 1', role: 'admin' }
            });
            // Client 2 joins room
            clientSocket2.emit('war_room_join', {
                roomId,
                userInfo: { name: 'Integration User 2', role: 'analyst' }
            });
            // Send operation from client 1
            setTimeout(() => {
                clientSocket1.emit('war_room_graph_operation', {
                    roomId,
                    operation: {
                        id: 'integration-op-1',
                        type: 'add_node',
                        data: {
                            nodeId: 'integration-node',
                            properties: { label: 'Integration Test Node' }
                        }
                    }
                });
            }, 100);
        });
    });
}
module.exports = {
    WarRoomSyncService
};
//# sourceMappingURL=warRoomSync.test.js.map