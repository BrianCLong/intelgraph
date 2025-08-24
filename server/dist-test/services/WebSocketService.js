const { Server } = require("socket.io");
const logger = require("../utils/logger");
const AuthService = require("./AuthService");
const MAX_OPS_PER_SEC = 100;
class WebSocketService {
    constructor(httpServer, neo4jService = null) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || "http://localhost:3000",
                credentials: true,
            },
            transports: ["websocket", "polling"],
        });
        this.authService = new AuthService();
        this.connectedUsers = new Map(); // userId -> Set of socketIds
        this.userSessions = new Map(); // socketId -> userSession
        this.investigationRooms = new Map(); // investigationId -> Set of socketIds
        this.presenceTracker = new Map(); // userId -> presence info
        // Initialize War Room Sync Service
        const WarRoomSyncService = require("./WarRoomSyncService");
        this.warRoomSync = new WarRoomSyncService(this.io, neo4jService);
        this.setupEventHandlers();
        this.logger = logger;
        this.logger.info("WebSocket service initialized with War Room Sync");
    }
    setupEventHandlers() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.replace("Bearer ", "");
                if (!token) {
                    throw new Error("No token provided");
                }
                const user = await this.authService.verifyToken(token);
                if (!user) {
                    throw new Error("Invalid token");
                }
                socket.userId = user.id;
                socket.user = user;
                next();
            }
            catch (error) {
                this.logger.error("Socket authentication failed:", error);
                next(new Error("Authentication failed"));
            }
        });
        this.io.on("connection", (socket) => {
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        const userId = socket.userId;
        const user = socket.user;
        this.logger.info(`User ${user.email} connected with socket ${socket.id}`);
        // Track connected user
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId).add(socket.id);
        // Store user session
        this.userSessions.set(socket.id, {
            userId,
            user,
            connectedAt: new Date(),
            lastActivity: new Date(),
            currentInvestigation: null,
            cursor: null,
        });
        socket.processedOps = new Set();
        socket.rateState = { count: 0, ts: Date.now() };
        // Update presence
        this.updateUserPresence(userId, {
            status: "online",
            lastSeen: new Date(),
            activeConnections: this.connectedUsers.get(userId).size,
        });
        // Send initial presence data to user
        socket.emit("presence:initial", {
            onlineUsers: this.getOnlineUsers(),
            yourPresence: this.presenceTracker.get(userId),
        });
        // Broadcast user came online
        socket.broadcast.emit("presence:user_online", {
            userId,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            timestamp: new Date(),
        });
        this.setupSocketEventHandlers(socket);
    }
    setupSocketEventHandlers(socket) {
        const userId = socket.userId;
        // Investigation room management
        socket.on("investigation:join", (data) => {
            this.handleJoinInvestigation(socket, data);
        });
        socket.on("investigation:leave", (data) => {
            this.handleLeaveInvestigation(socket, data);
        });
        // Graph collaboration events
        socket.on("graph:node_added", (data) => {
            this.handleGraphNodeAdded(socket, data);
        });
        socket.on("graph:node_updated", (data) => {
            this.handleGraphNodeUpdated(socket, data);
        });
        socket.on("graph:node_deleted", (data) => {
            this.handleGraphNodeDeleted(socket, data);
        });
        socket.on("graph:edge_added", (data) => {
            this.handleGraphEdgeAdded(socket, data);
        });
        socket.on("graph:edge_updated", (data) => {
            this.handleGraphEdgeUpdated(socket, data);
        });
        socket.on("graph:edge_deleted", (data) => {
            this.handleGraphEdgeDeleted(socket, data);
        });
        socket.on("graph:layout_changed", (data) => {
            this.handleGraphLayoutChanged(socket, data);
        });
        // Cursor tracking for collaboration
        socket.on("cursor:move", (data) => {
            this.handleCursorMove(socket, data);
        });
        socket.on("cursor:click", (data) => {
            this.handleCursorClick(socket, data);
        });
        // Comments and annotations
        socket.on("comment:add", (data) => {
            this.handleCommentAdd(socket, data);
        });
        socket.on("comment:update", (data) => {
            this.handleCommentUpdate(socket, data);
        });
        socket.on("comment:delete", (data) => {
            this.handleCommentDelete(socket, data);
        });
        socket.on("annotation:add", (data) => {
            this.handleAnnotationAdd(socket, data);
        });
        socket.on("annotation:update", (data) => {
            this.handleAnnotationUpdate(socket, data);
        });
        socket.on("annotation:delete", (data) => {
            this.handleAnnotationDelete(socket, data);
        });
        socket.on("collab:batch", (batch) => {
            this.handleCollabBatch(socket, batch);
        });
        // Analysis results sharing
        socket.on("analysis:result", (data) => {
            this.handleAnalysisResult(socket, data);
        });
        socket.on("analysis:request", (data) => {
            this.handleAnalysisRequest(socket, data);
        });
        // Activity tracking
        socket.on("activity:heartbeat", () => {
            this.updateUserActivity(socket);
        });
        socket.on("activity:typing", (data) => {
            this.handleTypingIndicator(socket, data);
        });
        // Disconnect handling
        socket.on("disconnect", (reason) => {
            this.handleDisconnection(socket, reason);
        });
        // Error handling
        socket.on("error", (error) => {
            this.logger.error(`Socket error for user ${userId}:`, error);
        });
        // Presence API expected by UserPresence component
        socket.on("join_presence", (data) => {
            const { investigationId, userId, userName, avatar, status } = data || {};
            if (investigationId) {
                socket.join(`presence:${investigationId}`);
            }
            // Broadcast to presence channel
            this.io.emit("user_joined", {
                userId: userId || socket.userId,
                userName: userName || socket.user?.firstName || "User",
                avatar,
                status: status || "online",
            });
        });
        socket.on("leave_presence", (data) => {
            const { investigationId, userId } = data || {};
            if (investigationId) {
                socket.leave(`presence:${investigationId}`);
            }
            this.io.emit("user_left", {
                userId: userId || socket.userId,
            });
        });
        socket.on("user_status_update", (data) => {
            const { investigationId, userId, status, location } = data || {};
            if (investigationId) {
                this.io.to(`presence:${investigationId}`).emit("user_status_updated", {
                    userId: userId || socket.userId,
                    status: status || "online",
                    location,
                });
            }
            else {
                this.io.emit("user_status_updated", {
                    userId: userId || socket.userId,
                    status: status || "online",
                    location,
                });
            }
        });
        socket.on("user_heartbeat", (data) => {
            const { investigationId, userId, status } = data || {};
            if (investigationId) {
                this.io.to(`presence:${investigationId}`).emit("user_activity", {
                    userId: userId || socket.userId,
                    action: "heartbeat",
                    details: { status: status || "online" },
                    timestamp: new Date().toISOString(),
                });
            }
        });
        // Investigation chat handlers
        socket.on("join_investigation_chat", (data) => {
            const { investigationId, userId, userName } = data || {};
            if (!investigationId)
                return;
            socket.join(`chat:${investigationId}`);
            this.io.to(`chat:${investigationId}`).emit("user_presence", {
                userId: userId || socket.userId,
                userName: userName || socket.user?.firstName || "User",
                status: "online",
            });
        });
        socket.on("send_chat_message", async (message) => {
            try {
                const { investigationId, content } = message || {};
                if (!investigationId || !content)
                    return;
                const { getPostgresPool } = require("../config/database");
                const pool = getPostgresPool();
                const result = await pool.query(`INSERT INTO chat_messages (investigation_id, user_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, created_at`, [investigationId, socket.userId, content]);
                await this.writeAuditLog(socket.userId, "CHAT_MESSAGE_CREATE", "investigation", investigationId, { contentPreview: content.slice(0, 100) });
                const enriched = {
                    id: result.rows[0].id,
                    investigationId,
                    userId: socket.userId,
                    userName: socket.user?.firstName || "User",
                    content,
                    timestamp: result.rows[0].created_at,
                };
                this.io.to(`chat:${investigationId}`).emit("chat_message", enriched);
            }
            catch (err) {
                this.logger.error("send_chat_message error", err);
            }
        });
        socket.on("user_typing", (data) => {
            const { investigationId, userId, userName, isTyping } = data || {};
            if (!investigationId)
                return;
            socket.to(`chat:${investigationId}`).emit("user_typing", {
                userId: userId || socket.userId,
                userName: userName || socket.user?.firstName || "User",
                isTyping: !!isTyping,
            });
        });
        socket.on("delete_chat_message", async (data) => {
            try {
                const { investigationId, messageId } = data || {};
                if (!investigationId || !messageId)
                    return;
                const { getPostgresPool } = require("../config/database");
                const pool = getPostgresPool();
                await pool.query("UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1", [messageId]);
                await this.writeAuditLog(socket.userId, "CHAT_MESSAGE_DELETE", "investigation", investigationId, { messageId });
                this.io
                    .to(`chat:${investigationId}`)
                    .emit("message_deleted", { messageId });
            }
            catch (err) {
                this.logger.error("delete_chat_message error", err);
            }
        });
        socket.on("edit_chat_message", async (data) => {
            try {
                const { investigationId, messageId, newContent } = data || {};
                if (!investigationId || !messageId || !newContent)
                    return;
                const { getPostgresPool } = require("../config/database");
                const pool = getPostgresPool();
                await pool.query("UPDATE chat_messages SET content = $1, edited_at = CURRENT_TIMESTAMP WHERE id = $2", [newContent, messageId]);
                await this.writeAuditLog(socket.userId, "CHAT_MESSAGE_EDIT", "investigation", investigationId, { messageId });
                this.io
                    .to(`chat:${investigationId}`)
                    .emit("message_edited", { messageId, newContent });
            }
            catch (err) {
                this.logger.error("edit_chat_message error", err);
            }
        });
        // War Room Sync Events - P0 Critical MVP1 Implementation
        socket.on("war_room_join", async (data) => {
            try {
                const { roomId, userInfo } = data;
                await this.warRoomSync.joinWarRoom(socket, roomId, socket.userId, {
                    name: socket.user.firstName || socket.user.name || "User",
                    role: userInfo?.role || "analyst",
                    ...userInfo,
                });
                this.logger.info(`User ${socket.userId} joined war room ${roomId}`);
            }
            catch (error) {
                this.logger.error("War room join error:", error);
                socket.emit("war_room_error", { error: "Failed to join war room" });
            }
        });
        socket.on("war_room_leave", async (data) => {
            try {
                const { roomId } = data;
                await this.warRoomSync.leaveWarRoom(socket, roomId, socket.userId);
                this.logger.info(`User ${socket.userId} left war room ${roomId}`);
            }
            catch (error) {
                this.logger.error("War room leave error:", error);
            }
        });
        socket.on("war_room_graph_operation", async (data) => {
            try {
                const { roomId, operation } = data;
                operation.userId = socket.userId; // Ensure operation has user ID
                await this.warRoomSync.handleGraphOperation(socket, roomId, socket.userId, operation);
            }
            catch (error) {
                this.logger.error("War room graph operation error:", error);
                socket.emit("war_room_error", {
                    error: "Failed to apply graph operation",
                });
            }
        });
        socket.on("war_room_cursor_move", (data) => {
            try {
                const { roomId, cursor } = data;
                this.warRoomSync.handleCursorMove(roomId, socket.userId, cursor);
            }
            catch (error) {
                this.logger.error("War room cursor move error:", error);
            }
        });
        socket.on("war_room_node_lock", (data) => {
            try {
                const { roomId, nodeId, operation } = data;
                const locked = this.warRoomSync.lockNode(roomId, socket.userId, nodeId, operation);
                socket.emit("war_room_node_lock_result", { nodeId, locked });
            }
            catch (error) {
                this.logger.error("War room node lock error:", error);
            }
        });
        socket.on("war_room_node_unlock", (data) => {
            try {
                const { roomId, nodeId } = data;
                this.warRoomSync.unlockNode(roomId, socket.userId, nodeId);
            }
            catch (error) {
                this.logger.error("War room node unlock error:", error);
            }
        });
        // Cursor synchronization for SharedCursors component
        socket.on("cursor_update", (data) => {
            try {
                const { userId, userName, x, y, containerWidth, containerHeight } = data;
                // Broadcast to all connected sockets except sender
                socket.broadcast.emit("cursor_update", {
                    userId: userId || socket.userId,
                    userName: userName || socket.user?.firstName || "User",
                    x,
                    y,
                    containerWidth,
                    containerHeight,
                });
            }
            catch (error) {
                this.logger.error("Cursor update error:", error);
            }
        });
        socket.on("cursor_leave", (data) => {
            try {
                const { userId } = data;
                socket.broadcast.emit("cursor_leave", {
                    userId: userId || socket.userId,
                });
            }
            catch (error) {
                this.logger.error("Cursor leave error:", error);
            }
        });
    }
    isRateLimited(socket) {
        const now = Date.now();
        if (now - socket.rateState.ts > 1000) {
            socket.rateState = { count: 0, ts: now };
        }
        socket.rateState.count += 1;
        return socket.rateState.count > MAX_OPS_PER_SEC;
    }
    handleCollabBatch(socket, batch = []) {
        if (this.isRateLimited(socket)) {
            socket.emit('rate_limited');
            return;
        }
        batch.forEach((op) => {
            if (socket.processedOps.has(op.opId))
                return;
            socket.processedOps.add(op.opId);
            this.io.to(socket.id).emit('op:ack', {
                opId: op.opId,
                serverReceivedAt: Date.now(),
            });
            if (op.event && op.payload) {
                socket.broadcast.emit(op.event, {
                    ...op.payload,
                    opId: op.opId,
                    seq: op.seq,
                });
            }
        });
    }
    // Investigation room handlers
    handleJoinInvestigation(socket, data) {
        const { investigationId } = data;
        const session = this.userSessions.get(socket.id);
        if (!investigationId) {
            socket.emit("error", { message: "Investigation ID required" });
            return;
        }
        // Leave previous investigation if any
        if (session.currentInvestigation) {
            this.handleLeaveInvestigation(socket, {
                investigationId: session.currentInvestigation,
            });
        }
        // Join new investigation room
        socket.join(`investigation:${investigationId}`);
        session.currentInvestigation = investigationId;
        // Track investigation room
        if (!this.investigationRooms.has(investigationId)) {
            this.investigationRooms.set(investigationId, new Set());
        }
        this.investigationRooms.get(investigationId).add(socket.id);
        // Notify others in the investigation
        socket
            .to(`investigation:${investigationId}`)
            .emit("investigation:user_joined", {
            userId: session.userId,
            user: session.user,
            timestamp: new Date(),
        });
        // Send current investigation state to joining user
        socket.emit("investigation:joined", {
            investigationId,
            participants: this.getInvestigationParticipants(investigationId),
            timestamp: new Date(),
        });
        this.logger.info(`User ${session.user.email} joined investigation ${investigationId}`);
    }
    handleLeaveInvestigation(socket, data) {
        const { investigationId } = data;
        const session = this.userSessions.get(socket.id);
        if (!investigationId)
            return;
        socket.leave(`investigation:${investigationId}`);
        session.currentInvestigation = null;
        // Remove from investigation room tracking
        if (this.investigationRooms.has(investigationId)) {
            this.investigationRooms.get(investigationId).delete(socket.id);
            if (this.investigationRooms.get(investigationId).size === 0) {
                this.investigationRooms.delete(investigationId);
            }
        }
        // Notify others
        socket
            .to(`investigation:${investigationId}`)
            .emit("investigation:user_left", {
            userId: session.userId,
            user: session.user,
            timestamp: new Date(),
        });
        this.logger.info(`User ${session.user.email} left investigation ${investigationId}`);
    }
    // Graph collaboration handlers
    handleGraphNodeAdded(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, node } = data;
        const eventData = {
            type: "node_added",
            node,
            user: session.user,
            timestamp: new Date(),
        };
        // Broadcast to investigation room
        socket
            .to(`investigation:${investigationId}`)
            .emit("graph:update", eventData);
        this.logger.info(`Node added by ${session.user.email} in investigation ${investigationId}`);
        this.writeAuditLog(session.userId, "GRAPH_NODE_ADD", "Investigation", investigationId, { nodeId: node?.id || node?.uuid });
    }
    handleGraphNodeUpdated(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, node, changes } = data;
        const eventData = {
            type: "node_updated",
            node,
            changes,
            user: session.user,
            timestamp: new Date(),
        };
        socket
            .to(`investigation:${investigationId}`)
            .emit("graph:update", eventData);
        this.writeAuditLog(session.userId, "GRAPH_NODE_UPDATE", "Investigation", investigationId, { nodeId: node?.id || node?.uuid, changes });
    }
    handleGraphNodeDeleted(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, nodeId } = data;
        const eventData = {
            type: "node_deleted",
            nodeId,
            user: session.user,
            timestamp: new Date(),
        };
        socket
            .to(`investigation:${investigationId}`)
            .emit("graph:update", eventData);
        this.writeAuditLog(session.userId, "GRAPH_NODE_DELETE", "Investigation", investigationId, { nodeId });
    }
    handleGraphEdgeAdded(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, edge } = data;
        const eventData = {
            type: "edge_added",
            edge,
            user: session.user,
            timestamp: new Date(),
        };
        socket
            .to(`investigation:${investigationId}`)
            .emit("graph:update", eventData);
        this.writeAuditLog(session.userId, "GRAPH_EDGE_ADD", "Investigation", investigationId, { edgeId: edge?.id });
    }
    handleGraphEdgeUpdated(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, edge, changes } = data;
        const eventData = {
            type: "edge_updated",
            edge,
            changes,
            user: session.user,
            timestamp: new Date(),
        };
        socket
            .to(`investigation:${investigationId}`)
            .emit("graph:update", eventData);
        this.writeAuditLog(session.userId, "GRAPH_EDGE_UPDATE", "Investigation", investigationId, { edgeId: edge?.id, changes });
    }
    handleGraphEdgeDeleted(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, edgeId } = data;
        const eventData = {
            type: "edge_deleted",
            edgeId,
            user: session.user,
            timestamp: new Date(),
        };
        socket
            .to(`investigation:${investigationId}`)
            .emit("graph:update", eventData);
        this.writeAuditLog(session.userId, "GRAPH_EDGE_DELETE", "Investigation", investigationId, { edgeId });
    }
    handleGraphLayoutChanged(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, layout } = data;
        const eventData = {
            type: "layout_changed",
            layout,
            user: session.user,
            timestamp: new Date(),
        };
        socket
            .to(`investigation:${investigationId}`)
            .emit("graph:update", eventData);
        this.writeAuditLog(session.userId, "GRAPH_LAYOUT_CHANGE", "Investigation", investigationId, { layout });
    }
    // Cursor tracking handlers
    handleCursorMove(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, position } = data;
        session.cursor = position;
        socket.to(`investigation:${investigationId}`).emit("cursor:update", {
            userId: session.userId,
            user: {
                id: session.user.id,
                firstName: session.user.firstName,
                lastName: session.user.lastName,
            },
            position,
            timestamp: new Date(),
        });
    }
    handleCursorClick(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, position, target } = data;
        socket.to(`investigation:${investigationId}`).emit("cursor:click", {
            userId: session.userId,
            user: {
                id: session.user.id,
                firstName: session.user.firstName,
                lastName: session.user.lastName,
            },
            position,
            target,
            timestamp: new Date(),
        });
    }
    // Comment and annotation handlers
    async handleCommentAdd(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, comment } = data;
        try {
            const { getPostgresPool } = require("../config/database");
            const pool = getPostgresPool();
            const res = await pool.query(`INSERT INTO comments (investigation_id, target_id, user_id, content, metadata)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`, [
                investigationId,
                comment.targetId,
                session.userId,
                comment.content || "",
                comment.metadata || {},
            ]);
            await this.writeAuditLog(session.userId, "COMMENT_CREATE", "investigation", investigationId, { targetId: comment.targetId });
            const eventData = {
                type: "comment_added",
                comment: {
                    id: res.rows[0].id,
                    ...comment,
                    author: session.user,
                    timestamp: res.rows[0].created_at,
                },
            };
            this.io
                .to(`investigation:${investigationId}`)
                .emit("comment:update", eventData);
        }
        catch (e) {
            this.logger.error("handleCommentAdd error", e);
        }
    }
    async handleCommentUpdate(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, comment } = data;
        try {
            const { getPostgresPool } = require("../config/database");
            const pool = getPostgresPool();
            await pool.query(`UPDATE comments SET content = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, [comment.content || "", comment.metadata || {}, comment.id]);
            await this.writeAuditLog(session.userId, "COMMENT_UPDATE", "investigation", investigationId, { commentId: comment.id });
            const eventData = {
                type: "comment_updated",
                comment: {
                    ...comment,
                    updatedBy: session.user,
                    updatedAt: new Date(),
                },
            };
            this.io
                .to(`investigation:${investigationId}`)
                .emit("comment:update", eventData);
        }
        catch (e) {
            this.logger.error("handleCommentUpdate error", e);
        }
    }
    async handleCommentDelete(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, commentId } = data;
        try {
            const { getPostgresPool } = require("../config/database");
            const pool = getPostgresPool();
            await pool.query("UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1", [commentId]);
            await this.writeAuditLog(session.userId, "COMMENT_DELETE", "investigation", investigationId, { commentId });
            const eventData = {
                type: "comment_deleted",
                commentId,
                deletedBy: session.user,
                timestamp: new Date(),
            };
            this.io
                .to(`investigation:${investigationId}`)
                .emit("comment:update", eventData);
        }
        catch (e) {
            this.logger.error("handleCommentDelete error", e);
        }
    }
    handleAnnotationAdd(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, annotation } = data;
        const eventData = {
            type: "annotation_added",
            annotation: {
                ...annotation,
                author: session.user,
                timestamp: new Date(),
            },
        };
        this.io
            .to(`investigation:${investigationId}`)
            .emit("annotation:update", eventData);
    }
    handleAnnotationUpdate(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, annotation } = data;
        const eventData = {
            type: "annotation_updated",
            annotation: {
                ...annotation,
                updatedBy: session.user,
                updatedAt: new Date(),
            },
        };
        this.io
            .to(`investigation:${investigationId}`)
            .emit("annotation:update", eventData);
    }
    handleAnnotationDelete(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, annotationId } = data;
        const eventData = {
            type: "annotation_deleted",
            annotationId,
            deletedBy: session.user,
            timestamp: new Date(),
        };
        this.io
            .to(`investigation:${investigationId}`)
            .emit("annotation:update", eventData);
    }
    // Analysis handlers
    handleAnalysisResult(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, analysisType, results } = data;
        const eventData = {
            type: "analysis_result",
            analysisType,
            results,
            user: session.user,
            timestamp: new Date(),
        };
        this.io
            .to(`investigation:${investigationId}`)
            .emit("analysis:update", eventData);
    }
    handleAnalysisRequest(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, analysisType, parameters } = data;
        const eventData = {
            type: "analysis_requested",
            analysisType,
            parameters,
            user: session.user,
            timestamp: new Date(),
        };
        socket
            .to(`investigation:${investigationId}`)
            .emit("analysis:update", eventData);
    }
    // Activity and presence handlers
    updateUserActivity(socket) {
        const session = this.userSessions.get(socket.id);
        if (session) {
            session.lastActivity = new Date();
            this.updateUserPresence(session.userId, {
                lastSeen: new Date(),
            });
        }
    }
    updateUserPresence(userId, presenceData) {
        const currentPresence = this.presenceTracker.get(userId) || {};
        const updatedPresence = {
            ...currentPresence,
            ...presenceData,
            userId,
        };
        this.presenceTracker.set(userId, updatedPresence);
        // Broadcast presence update
        this.io.emit("presence:update", {
            userId,
            presence: updatedPresence,
        });
    }
    handleTypingIndicator(socket, data) {
        const session = this.userSessions.get(socket.id);
        const { investigationId, isTyping, context } = data;
        socket.to(`investigation:${investigationId}`).emit("activity:typing", {
            userId: session.userId,
            user: {
                id: session.user.id,
                firstName: session.user.firstName,
                lastName: session.user.lastName,
            },
            isTyping,
            context,
            timestamp: new Date(),
        });
    }
    handleDisconnection(socket, reason) {
        const session = this.userSessions.get(socket.id);
        if (!session)
            return;
        const userId = session.userId;
        this.logger.info(`User ${session.user.email} disconnected: ${reason}`);
        // Remove from connected users
        if (this.connectedUsers.has(userId)) {
            this.connectedUsers.get(userId).delete(socket.id);
            if (this.connectedUsers.get(userId).size === 0) {
                this.connectedUsers.delete(userId);
                // Update presence to offline
                this.updateUserPresence(userId, {
                    status: "offline",
                    lastSeen: new Date(),
                    activeConnections: 0,
                });
                // Broadcast user went offline
                socket.broadcast.emit("presence:user_offline", {
                    userId,
                    timestamp: new Date(),
                });
            }
            else {
                // Update connection count
                this.updateUserPresence(userId, {
                    activeConnections: this.connectedUsers.get(userId).size,
                });
            }
        }
        // Remove from investigation rooms
        if (session.currentInvestigation) {
            this.handleLeaveInvestigation(socket, {
                investigationId: session.currentInvestigation,
            });
        }
        // Clean up session
        this.userSessions.delete(socket.id);
    }
    // Utility methods
    getOnlineUsers() {
        const onlineUsers = [];
        this.connectedUsers.forEach((socketIds, userId) => {
            const session = this.userSessions.get([...socketIds][0]);
            if (session) {
                onlineUsers.push({
                    userId,
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        firstName: session.user.firstName,
                        lastName: session.user.lastName,
                    },
                    presence: this.presenceTracker.get(userId),
                    activeConnections: socketIds.size,
                });
            }
        });
        return onlineUsers;
    }
    getInvestigationParticipants(investigationId) {
        const participants = [];
        const socketIds = this.investigationRooms.get(investigationId) || new Set();
        socketIds.forEach((socketId) => {
            const session = this.userSessions.get(socketId);
            if (session) {
                participants.push({
                    userId: session.userId,
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        firstName: session.user.firstName,
                        lastName: session.user.lastName,
                    },
                    connectedAt: session.connectedAt,
                    lastActivity: session.lastActivity,
                    cursor: session.cursor,
                });
            }
        });
        return participants;
    }
    // Broadcast methods for external services
    broadcastToInvestigation(investigationId, event, data) {
        this.io.to(`investigation:${investigationId}`).emit(event, data);
    }
    broadcastToUser(userId, event, data) {
        const socketIds = this.connectedUsers.get(userId);
        if (socketIds) {
            socketIds.forEach((socketId) => {
                this.io.to(socketId).emit(event, data);
            });
        }
    }
    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }
    // Statistics and monitoring
    getConnectionStats() {
        return {
            totalConnections: this.userSessions.size,
            uniqueUsers: this.connectedUsers.size,
            activeInvestigations: this.investigationRooms.size,
            activeWarRooms: this.warRoomSync.warRooms.size,
            onlineUsers: this.getOnlineUsers().length,
            warRoomMetrics: this.warRoomSync.metrics,
        };
    }
    // Get War Room Sync Service for external access
    getWarRoomSyncService() {
        return this.warRoomSync;
    }
}
WebSocketService.prototype.writeAuditLog = async function (userId, action, resourceType, resourceId, details) {
    try {
        const { getPostgresPool } = require("../config/database");
        const pool = getPostgresPool();
        await pool.query(`INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`, [userId, action, resourceType, resourceId, details || {}]);
    }
    catch (err) {
        logger.error("writeAuditLog error", err);
    }
};
module.exports = WebSocketService;
//# sourceMappingURL=WebSocketService.js.map