/**
 * War Room Graph Synchronization Service
 * Handles real-time collaborative graph editing with conflict resolution
 * P0 Critical - MVP1 requirement for <300ms latency sync
 */
class WarRoomSyncService {
    constructor(io, neo4jService) {
        this.io = io;
        this.neo4j = neo4jService;
        this.warRooms = new Map(); // roomId -> room state
        this.operationalTransforms = new Map(); // roomId -> OT state
        this.conflictResolution = new ConflictResolver();
        this.changeBuffer = new Map(); // roomId -> buffered changes
        this.syncTimer = null;
        // Performance metrics
        this.metrics = {
            avgLatency: 0,
            conflictsResolved: 0,
            operationsApplied: 0,
            syncErrors: 0,
        };
    }
    /**
     * Initialize war room for graph synchronization
     */
    async initializeWarRoom(roomId, initialGraphState = null) {
        const room = {
            id: roomId,
            participants: new Map(),
            graphState: initialGraphState || (await this.loadGraphState(roomId)),
            operationLog: [],
            lastSync: Date.now(),
            version: 0,
            locks: new Map(), // nodeId -> { userId, timestamp, operation }
            conflictQueue: [],
            auditTrail: [],
            settings: {
                maxLatency: 300, // ms
                batchSize: 10,
                conflictStrategy: "last-write-wins-with-merge",
            },
        };
        this.warRooms.set(roomId, room);
        this.operationalTransforms.set(roomId, new OperationalTransform());
        this.changeBuffer.set(roomId, []);
        console.log(`War room ${roomId} initialized with ${room.graphState?.nodes?.length || 0} nodes`);
        return room;
    }
    /**
     * User joins war room
     */
    async joinWarRoom(socket, roomId, userId, userInfo) {
        let room = this.warRooms.get(roomId);
        if (!room) {
            room = await this.initializeWarRoom(roomId);
        }
        const participant = {
            id: userId,
            socketId: socket.id,
            socket,
            name: userInfo.name,
            role: userInfo.role,
            cursor: { x: 0, y: 0 },
            activeOperation: null,
            joinedAt: Date.now(),
            lastActivity: Date.now(),
        };
        room.participants.set(userId, participant);
        socket.join(roomId);
        // Send initial graph state
        socket.emit("war_room_sync_state", {
            roomId,
            graphState: room.graphState,
            version: room.version,
            participants: Array.from(room.participants.values()).map((p) => ({
                id: p.id,
                name: p.name,
                role: p.role,
                cursor: p.cursor,
            })),
        });
        this.recordAudit(room, userId, "join", { userInfo });
        // Notify other participants
        socket.to(roomId).emit("war_room_participant_joined", {
            participant: {
                id: participant.id,
                name: participant.name,
                role: participant.role,
            },
        });
        console.log(`User ${userId} joined war room ${roomId}`);
    }
    /**
     * User leaves war room
     */
    async leaveWarRoom(socket, roomId, userId) {
        const room = this.warRooms.get(roomId);
        if (!room)
            return;
        const participant = room.participants.get(userId);
        if (!participant)
            return;
        // Release any locks held by this user
        for (const [nodeId, lock] of room.locks.entries()) {
            if (lock.userId === userId) {
                room.locks.delete(nodeId);
                // Notify others that node is unlocked
                socket.to(roomId).emit("war_room_node_unlocked", { nodeId, userId });
            }
        }
        room.participants.delete(userId);
        socket.leave(roomId);
        // Notify other participants
        socket.to(roomId).emit("war_room_participant_left", { userId });
        this.recordAudit(room, userId, "leave");
        // Clean up empty rooms
        if (room.participants.size === 0) {
            await this.archiveWarRoom(roomId);
        }
        console.log(`User ${userId} left war room ${roomId}`);
    }
    /**
     * Handle graph operation from client
     */
    async handleGraphOperation(socket, roomId, userId, operation) {
        const startTime = Date.now();
        try {
            const room = this.warRooms.get(roomId);
            if (!room) {
                socket.emit("war_room_error", { error: "War room not found" });
                return;
            }
            const participant = room.participants.get(userId);
            if (!participant) {
                socket.emit("war_room_error", { error: "User not in war room" });
                return;
            }
            // Validate operation
            const validationResult = await this.validateOperation(room, operation, userId);
            if (!validationResult.valid) {
                socket.emit("war_room_operation_rejected", {
                    operationId: operation.id,
                    reason: validationResult.reason,
                });
                return;
            }
            // Check for conflicts
            const conflictCheck = await this.checkConflicts(room, operation);
            if (conflictCheck.hasConflict) {
                await this.resolveConflict(room, operation, conflictCheck);
            }
            // Apply operational transformation
            const ot = this.operationalTransforms.get(roomId);
            const transformedOperation = ot.transform(operation, room.operationLog);
            // Apply operation to graph state
            const result = await this.applyOperation(room, transformedOperation, userId);
            if (result.success) {
                // Update room state
                room.version++;
                room.operationLog.push({
                    ...transformedOperation,
                    appliedAt: Date.now(),
                    userId,
                    version: room.version,
                });
                this.recordAudit(room, userId, "operation", {
                    operation: transformedOperation,
                });
                // Broadcast to all participants
                this.broadcastOperation(roomId, transformedOperation, userId);
                // Update metrics
                const latency = Date.now() - startTime;
                this.updateMetrics(latency);
                socket.emit("war_room_operation_applied", {
                    operationId: operation.id,
                    version: room.version,
                    latency,
                });
                // Auto-save periodically
                if (room.version % 10 === 0) {
                    await this.saveGraphState(roomId, room.graphState);
                }
            }
            else {
                socket.emit("war_room_operation_failed", {
                    operationId: operation.id,
                    error: result.error,
                });
            }
        }
        catch (error) {
            console.error("Error handling graph operation:", error);
            this.metrics.syncErrors++;
            socket.emit("war_room_error", { error: "Internal sync error" });
        }
    }
    /**
     * Validate graph operation
     */
    async validateOperation(room, operation, userId) {
        // Check user permissions
        const participant = room.participants.get(userId);
        if (!this.hasPermission(participant, operation)) {
            return { valid: false, reason: "Insufficient permissions" };
        }
        // Check operation format
        if (!this.isValidOperationFormat(operation)) {
            return { valid: false, reason: "Invalid operation format" };
        }
        // Check node/edge locks
        const affectedNodes = this.getAffectedNodes(operation);
        for (const nodeId of affectedNodes) {
            const lock = room.locks.get(nodeId);
            if (lock && lock.userId !== userId) {
                return {
                    valid: false,
                    reason: `Node ${nodeId} locked by ${lock.userId}`,
                };
            }
        }
        return { valid: true };
    }
    /**
     * Check for operation conflicts
     */
    async checkConflicts(room, operation) {
        const conflicts = [];
        // Check for concurrent modifications
        const affectedNodes = this.getAffectedNodes(operation);
        const recentOperations = room.operationLog
            .filter((op) => Date.now() - op.appliedAt < 5000) // Last 5 seconds
            .filter((op) => op.userId !== operation.userId);
        for (const recentOp of recentOperations) {
            const recentAffectedNodes = this.getAffectedNodes(recentOp);
            const intersection = affectedNodes.filter((id) => recentAffectedNodes.includes(id));
            if (intersection.length > 0) {
                conflicts.push({
                    type: "concurrent_modification",
                    operation: recentOp,
                    affectedNodes: intersection,
                });
            }
        }
        // Check for semantic conflicts
        if (operation.type === "delete_node") {
            const node = room.graphState.nodes.find((n) => n.id === operation.nodeId);
            if (node && node.edges && node.edges.length > 0) {
                conflicts.push({
                    type: "orphaned_edges",
                    nodeId: operation.nodeId,
                    edgeCount: node.edges.length,
                });
            }
        }
        return {
            hasConflict: conflicts.length > 0,
            conflicts,
        };
    }
    /**
     * Resolve conflicts using configured strategy
     */
    async resolveConflict(room, operation, conflictCheck) {
        const strategy = room.settings.conflictStrategy;
        switch (strategy) {
            case "last-write-wins":
                // Simply proceed with the new operation
                break;
            case "last-write-wins-with-merge":
                // Try to merge properties where possible
                if (operation.type === "update_node") {
                    operation = await this.mergeNodeProperties(room, operation, conflictCheck.conflicts);
                }
                break;
            case "manual-resolution":
                // Queue for manual resolution
                room.conflictQueue.push({
                    operation,
                    conflicts: conflictCheck.conflicts,
                    timestamp: Date.now(),
                });
                throw new Error("Manual conflict resolution required");
            default:
                throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
        }
        this.metrics.conflictsResolved++;
    }
    /**
     * Apply operation to graph state
     */
    async applyOperation(room, operation, userId) {
        try {
            switch (operation.type) {
                case "add_node":
                    return this.addNode(room, operation);
                case "update_node":
                    return this.updateNode(room, operation);
                case "delete_node":
                    return this.deleteNode(room, operation);
                case "add_edge":
                    return this.addEdge(room, operation);
                case "update_edge":
                    return this.updateEdge(room, operation);
                case "delete_edge":
                    return this.deleteEdge(room, operation);
                case "bulk_update":
                    return this.bulkUpdate(room, operation);
                default:
                    throw new Error(`Unknown operation type: ${operation.type}`);
            }
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Add node operation
     */
    addNode(room, operation) {
        const { nodeId, properties, position } = operation.data;
        // Check if node already exists
        const existingNode = room.graphState.nodes.find((n) => n.id === nodeId);
        if (existingNode) {
            return { success: false, error: "Node already exists" };
        }
        const newNode = {
            id: nodeId,
            ...properties,
            position: position || { x: 0, y: 0 },
            createdAt: Date.now(),
            createdBy: operation.userId,
            edges: [],
        };
        room.graphState.nodes.push(newNode);
        return { success: true, node: newNode };
    }
    /**
     * Update node operation
     */
    updateNode(room, operation) {
        const { nodeId, properties } = operation.data;
        const node = room.graphState.nodes.find((n) => n.id === nodeId);
        if (!node) {
            return { success: false, error: "Node not found" };
        }
        // Merge properties
        Object.assign(node, properties, {
            updatedAt: Date.now(),
            updatedBy: operation.userId,
        });
        return { success: true, node };
    }
    /**
     * Delete node operation
     */
    deleteNode(room, operation) {
        const { nodeId } = operation.data;
        const nodeIndex = room.graphState.nodes.findIndex((n) => n.id === nodeId);
        if (nodeIndex === -1) {
            return { success: false, error: "Node not found" };
        }
        // Remove associated edges
        room.graphState.edges = room.graphState.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
        // Remove node
        const deletedNode = room.graphState.nodes.splice(nodeIndex, 1)[0];
        return { success: true, deletedNode };
    }
    /**
     * Add edge operation
     */
    addEdge(room, operation) {
        const { edgeId, source, target, properties } = operation.data;
        // Check if nodes exist
        const sourceNode = room.graphState.nodes.find((n) => n.id === source);
        const targetNode = room.graphState.nodes.find((n) => n.id === target);
        if (!sourceNode || !targetNode) {
            return { success: false, error: "Source or target node not found" };
        }
        const newEdge = {
            id: edgeId,
            source,
            target,
            ...properties,
            createdAt: Date.now(),
            createdBy: operation.userId,
        };
        room.graphState.edges.push(newEdge);
        // Update node edge references
        sourceNode.edges = sourceNode.edges || [];
        targetNode.edges = targetNode.edges || [];
        sourceNode.edges.push(edgeId);
        if (source !== target) {
            targetNode.edges.push(edgeId);
        }
        return { success: true, edge: newEdge };
    }
    /**
     * Broadcast operation to all participants
     */
    broadcastOperation(roomId, operation, excludeUserId = null) {
        const room = this.warRooms.get(roomId);
        if (!room)
            return;
        const broadcastData = {
            roomId,
            operation,
            version: room.version,
            timestamp: Date.now(),
        };
        for (const [userId, participant] of room.participants) {
            if (userId !== excludeUserId) {
                participant.socket.emit("war_room_operation_broadcast", broadcastData);
            }
        }
    }
    /**
     * Handle cursor movement
     */
    handleCursorMove(roomId, userId, cursor) {
        const room = this.warRooms.get(roomId);
        if (!room)
            return;
        const participant = room.participants.get(userId);
        if (!participant)
            return;
        participant.cursor = cursor;
        participant.lastActivity = Date.now();
        // Broadcast cursor position (throttled)
        if (!participant.cursorThrottle ||
            Date.now() - participant.cursorThrottle > 50) {
            participant.cursorThrottle = Date.now();
            for (const [otherUserId, otherParticipant] of room.participants) {
                if (otherUserId !== userId) {
                    otherParticipant.socket.emit("war_room_cursor_update", {
                        userId,
                        cursor,
                        userName: participant.name,
                    });
                }
            }
        }
    }
    /**
     * Lock node for exclusive editing
     */
    lockNode(roomId, userId, nodeId, operation) {
        const room = this.warRooms.get(roomId);
        if (!room)
            return false;
        const existingLock = room.locks.get(nodeId);
        if (existingLock && existingLock.userId !== userId) {
            return false; // Already locked by someone else
        }
        room.locks.set(nodeId, {
            userId,
            timestamp: Date.now(),
            operation,
        });
        // Broadcast lock
        for (const [otherUserId, participant] of room.participants) {
            if (otherUserId !== userId) {
                participant.socket.emit("war_room_node_locked", {
                    nodeId,
                    userId,
                    userName: room.participants.get(userId).name,
                    operation,
                });
            }
        }
        return true;
    }
    /**
     * Unlock node
     */
    unlockNode(roomId, userId, nodeId) {
        const room = this.warRooms.get(roomId);
        if (!room)
            return;
        const lock = room.locks.get(nodeId);
        if (lock && lock.userId === userId) {
            room.locks.delete(nodeId);
            // Broadcast unlock
            for (const [otherUserId, participant] of room.participants) {
                if (otherUserId !== userId) {
                    participant.socket.emit("war_room_node_unlocked", { nodeId, userId });
                }
            }
        }
    }
    /**
     * Get current room statistics
     */
    getRoomStats(roomId) {
        const room = this.warRooms.get(roomId);
        if (!room)
            return null;
        return {
            roomId,
            participants: room.participants.size,
            graphSize: {
                nodes: room.graphState.nodes.length,
                edges: room.graphState.edges.length,
            },
            version: room.version,
            operationsCount: room.operationLog.length,
            activelocks: room.locks.size,
            conflictQueueSize: room.conflictQueue.length,
            lastSync: room.lastSync,
            uptime: Date.now() - room.lastSync,
        };
    }
    /**
     * Update performance metrics
     */
    updateMetrics(latency) {
        this.metrics.operationsApplied++;
        this.metrics.avgLatency =
            (this.metrics.avgLatency * (this.metrics.operationsApplied - 1) +
                latency) /
                this.metrics.operationsApplied;
    }
    /**
     * Load graph state from database
     */
    async loadGraphState(roomId) {
        try {
            // This would query Neo4j for the investigation graph
            const query = `
        MATCH (room:WarRoom {id: $roomId})-[:CONTAINS]->(n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
      `;
            const result = await this.neo4j.run(query, { roomId });
            // Transform to graph state format
            const nodes = [];
            const edges = [];
            const nodeIds = new Set();
            result.records.forEach((record) => {
                const node = record.get("n");
                if (node && !nodeIds.has(node.identity.toNumber())) {
                    nodes.push({
                        id: node.identity.toNumber(),
                        ...node.properties,
                    });
                    nodeIds.add(node.identity.toNumber());
                }
                const edge = record.get("r");
                const target = record.get("m");
                if (edge && target) {
                    edges.push({
                        id: edge.identity.toNumber(),
                        source: node.identity.toNumber(),
                        target: target.identity.toNumber(),
                        type: edge.type,
                        ...edge.properties,
                    });
                }
            });
            return { nodes, edges };
        }
        catch (error) {
            console.error("Error loading graph state:", error);
            return { nodes: [], edges: [] };
        }
    }
    /**
     * Save graph state to database
     */
    async saveGraphState(roomId, graphState) {
        try {
            // This would save the current graph state to Neo4j
            console.log(`Saving graph state for room ${roomId}: ${graphState.nodes.length} nodes, ${graphState.edges.length} edges`);
            // Implementation would batch update the Neo4j database
        }
        catch (error) {
            console.error("Error saving graph state:", error);
        }
    }
    /**
     * Helper methods
     */
    getAffectedNodes(operation) {
        switch (operation.type) {
            case "add_node":
            case "update_node":
            case "delete_node":
                return [operation.data.nodeId];
            case "add_edge":
            case "update_edge":
            case "delete_edge":
                return [operation.data.source, operation.data.target];
            case "bulk_update":
                return operation.data.nodeIds || [];
            default:
                return [];
        }
    }
    hasPermission(participant, operation) {
        // Simple role-based permission check
        const adminOperations = ["delete_node", "delete_edge", "bulk_update"];
        return (participant.role === "admin" || !adminOperations.includes(operation.type));
    }
    isValidOperationFormat(operation) {
        return (operation &&
            operation.id &&
            operation.type &&
            operation.data &&
            operation.userId);
    }
    /**
     * Archive and cleanup war room
     */
    async archiveWarRoom(roomId) {
        const room = this.warRooms.get(roomId);
        if (!room)
            return;
        await this.saveGraphState(roomId, room.graphState);
        this.warRooms.delete(roomId);
        this.operationalTransforms.delete(roomId);
        this.changeBuffer.delete(roomId);
        console.log(`War room ${roomId} archived`);
    }
}
/**
 * Operational Transform implementation for conflict-free collaborative editing
 */
class OperationalTransform {
    constructor() {
        this.transformMatrix = new Map();
    }
    transform(operation, operationLog) {
        // Simplified OT - transform against recent concurrent operations
        const recentOps = operationLog.slice(-10); // Last 10 operations
        let transformedOp = { ...operation };
        for (const previousOp of recentOps) {
            if (this.isConcurrent(transformedOp, previousOp)) {
                transformedOp = this.transformAgainst(transformedOp, previousOp);
            }
        }
        return transformedOp;
    }
    isConcurrent(op1, op2) {
        // Check if operations affect the same nodes/edges
        const affected1 = this.getAffectedEntities(op1);
        const affected2 = this.getAffectedEntities(op2);
        return affected1.some((id) => affected2.includes(id));
    }
    transformAgainst(operation, previousOperation) {
        // Simple transformation rules
        if (operation.type === "update_node" &&
            previousOperation.type === "update_node" &&
            operation.data.nodeId === previousOperation.data.nodeId) {
            // Merge properties
            return {
                ...operation,
                data: {
                    ...operation.data,
                    properties: {
                        ...previousOperation.data.properties,
                        ...operation.data.properties,
                        _lastModified: Date.now(),
                    },
                },
            };
        }
        return operation;
    }
    getAffectedEntities(operation) {
        switch (operation.type) {
            case "add_node":
            case "update_node":
            case "delete_node":
                return [operation.data.nodeId];
            case "add_edge":
            case "update_edge":
            case "delete_edge":
                return [
                    operation.data.source,
                    operation.data.target,
                    operation.data.edgeId,
                ];
            default:
                return [];
        }
    }
    recordAudit(room, userId, action, details = {}) {
        room.auditTrail.push({
            timestamp: Date.now(),
            userId,
            action,
            details,
        });
    }
    getAuditTrail(roomId) {
        const room = this.warRooms.get(roomId);
        return room ? room.auditTrail : [];
    }
}
/**
 * Conflict Resolution Strategies
 */
class ConflictResolver {
    resolve(conflict, strategy = "last-write-wins") {
        switch (strategy) {
            case "last-write-wins":
                return this.lastWriteWins(conflict);
            case "merge-properties":
                return this.mergeProperties(conflict);
            case "user-priority":
                return this.userPriority(conflict);
            default:
                return this.lastWriteWins(conflict);
        }
    }
    lastWriteWins(conflict) {
        return conflict.operations[conflict.operations.length - 1];
    }
    mergeProperties(conflict) {
        if (conflict.type !== "property_conflict") {
            return this.lastWriteWins(conflict);
        }
        const merged = {};
        for (const operation of conflict.operations) {
            Object.assign(merged, operation.data.properties);
        }
        return {
            ...conflict.operations[0],
            data: {
                ...conflict.operations[0].data,
                properties: merged,
            },
        };
    }
    userPriority(conflict) {
        // Resolve based on user role priority
        const priorityOrder = ["admin", "lead", "analyst", "viewer"];
        const sortedOps = conflict.operations.sort((a, b) => {
            const roleA = a.userRole || "viewer";
            const roleB = b.userRole || "viewer";
            return priorityOrder.indexOf(roleA) - priorityOrder.indexOf(roleB);
        });
        return sortedOps[0];
    }
}
module.exports = WarRoomSyncService;
//# sourceMappingURL=WarRoomSyncService.js.map