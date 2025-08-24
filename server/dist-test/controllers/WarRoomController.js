/**
 * War Room Controller
 * Handles HTTP API endpoints for war room management
 */
const WarRoomSyncService = require('../services/WarRoomSyncService');
class WarRoomController {
    constructor(warRoomSyncService, authService) {
        this.warRoomSync = warRoomSyncService;
        this.auth = authService;
    }
    /**
     * Create a new war room
     * POST /api/war-rooms
     */
    async createWarRoom(req, res) {
        try {
            const { name, description, investigationId, participants = [] } = req.body;
            const userId = req.user.id;
            // Validate required fields
            if (!name || !investigationId) {
                return res.status(400).json({
                    error: 'Name and investigation ID are required'
                });
            }
            // Check permissions
            const hasPermission = await this.auth.canCreateWarRoom(userId, investigationId);
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Insufficient permissions to create war room'
                });
            }
            const warRoomId = `wr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Initialize war room
            const warRoom = await this.warRoomSync.initializeWarRoom(warRoomId, null);
            // Store war room metadata
            const metadata = {
                id: warRoomId,
                name,
                description,
                investigationId,
                createdBy: userId,
                createdAt: new Date(),
                participants: [
                    { userId, role: 'admin', joinedAt: new Date() },
                    ...participants.map(p => ({ ...p, joinedAt: new Date() }))
                ],
                status: 'active',
                settings: {
                    maxParticipants: 20,
                    allowGuestAccess: false,
                    recordSession: true,
                    autoArchiveAfterHours: 24
                }
            };
            // Save to database (would use proper DB in production)
            await this.saveWarRoomMetadata(metadata);
            res.status(201).json({
                warRoom: metadata,
                joinUrl: `/war-rooms/${warRoomId}`,
                message: 'War room created successfully'
            });
        }
        catch (error) {
            console.error('Error creating war room:', error);
            res.status(500).json({
                error: 'Failed to create war room',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    /**
     * Get war room details
     * GET /api/war-rooms/:id
     */
    async getWarRoom(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            // Check if user has access to this war room
            const hasAccess = await this.auth.canAccessWarRoom(userId, id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: 'Access denied to this war room'
                });
            }
            const metadata = await this.getWarRoomMetadata(id);
            if (!metadata) {
                return res.status(404).json({
                    error: 'War room not found'
                });
            }
            // Get current statistics
            const stats = this.warRoomSync.getRoomStats(id);
            res.json({
                warRoom: metadata,
                stats,
                currentUser: {
                    userId,
                    role: this.getUserRoleInRoom(metadata, userId)
                }
            });
        }
        catch (error) {
            console.error('Error getting war room:', error);
            res.status(500).json({
                error: 'Failed to retrieve war room'
            });
        }
    }
    /**
     * List user's war rooms
     * GET /api/war-rooms
     */
    async listWarRooms(req, res) {
        try {
            const userId = req.user.id;
            const { status, investigationId, limit = 20, offset = 0 } = req.query;
            const warRooms = await this.getUserWarRooms(userId, {
                status,
                investigationId,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            // Add current statistics for active rooms
            const warRoomsWithStats = await Promise.all(warRooms.map(async (room) => {
                const stats = room.status === 'active' ?
                    this.warRoomSync.getRoomStats(room.id) :
                    null;
                return {
                    ...room,
                    stats,
                    userRole: this.getUserRoleInRoom(room, userId)
                };
            }));
            res.json({
                warRooms: warRoomsWithStats,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: warRoomsWithStats.length
                }
            });
        }
        catch (error) {
            console.error('Error listing war rooms:', error);
            res.status(500).json({
                error: 'Failed to list war rooms'
            });
        }
    }
    /**
     * Update war room settings
     * PATCH /api/war-rooms/:id
     */
    async updateWarRoom(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const updates = req.body;
            // Check permissions
            const hasPermission = await this.auth.canModifyWarRoom(userId, id);
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Insufficient permissions to modify war room'
                });
            }
            const metadata = await this.getWarRoomMetadata(id);
            if (!metadata) {
                return res.status(404).json({
                    error: 'War room not found'
                });
            }
            // Validate and apply updates
            const allowedUpdates = ['name', 'description', 'settings'];
            const validUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                if (allowedUpdates.includes(key)) {
                    validUpdates[key] = value;
                }
            }
            const updatedMetadata = {
                ...metadata,
                ...validUpdates,
                updatedAt: new Date(),
                updatedBy: userId
            };
            await this.updateWarRoomMetadata(id, updatedMetadata);
            res.json({
                warRoom: updatedMetadata,
                message: 'War room updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating war room:', error);
            res.status(500).json({
                error: 'Failed to update war room'
            });
        }
    }
    /**
     * Add participant to war room
     * POST /api/war-rooms/:id/participants
     */
    async addParticipant(req, res) {
        try {
            const { id } = req.params;
            const { userId: targetUserId, role = 'analyst' } = req.body;
            const requesterId = req.user.id;
            // Check permissions
            const hasPermission = await this.auth.canModifyWarRoom(requesterId, id);
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Insufficient permissions to add participants'
                });
            }
            const metadata = await this.getWarRoomMetadata(id);
            if (!metadata) {
                return res.status(404).json({
                    error: 'War room not found'
                });
            }
            // Check if user is already a participant
            const existingParticipant = metadata.participants.find(p => p.userId === targetUserId);
            if (existingParticipant) {
                return res.status(400).json({
                    error: 'User is already a participant'
                });
            }
            // Add participant
            metadata.participants.push({
                userId: targetUserId,
                role,
                joinedAt: new Date(),
                addedBy: requesterId
            });
            await this.updateWarRoomMetadata(id, metadata);
            res.json({
                participant: {
                    userId: targetUserId,
                    role,
                    joinedAt: new Date()
                },
                message: 'Participant added successfully'
            });
        }
        catch (error) {
            console.error('Error adding participant:', error);
            res.status(500).json({
                error: 'Failed to add participant'
            });
        }
    }
    /**
     * Remove participant from war room
     * DELETE /api/war-rooms/:id/participants/:userId
     */
    async removeParticipant(req, res) {
        try {
            const { id, userId: targetUserId } = req.params;
            const requesterId = req.user.id;
            // Check permissions (can remove self or if admin)
            const hasPermission = targetUserId === requesterId ||
                await this.auth.canModifyWarRoom(requesterId, id);
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Insufficient permissions to remove participant'
                });
            }
            const metadata = await this.getWarRoomMetadata(id);
            if (!metadata) {
                return res.status(404).json({
                    error: 'War room not found'
                });
            }
            // Remove participant
            metadata.participants = metadata.participants.filter(p => p.userId !== targetUserId);
            await this.updateWarRoomMetadata(id, metadata);
            // Force disconnect from sync service if currently connected
            await this.warRoomSync.leaveWarRoom(null, id, targetUserId);
            res.json({
                message: 'Participant removed successfully'
            });
        }
        catch (error) {
            console.error('Error removing participant:', error);
            res.status(500).json({
                error: 'Failed to remove participant'
            });
        }
    }
    /**
     * Archive/close war room
     * POST /api/war-rooms/:id/archive
     */
    async archiveWarRoom(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            // Check permissions
            const hasPermission = await this.auth.canModifyWarRoom(userId, id);
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Insufficient permissions to archive war room'
                });
            }
            const metadata = await this.getWarRoomMetadata(id);
            if (!metadata) {
                return res.status(404).json({
                    error: 'War room not found'
                });
            }
            if (metadata.status === 'archived') {
                return res.status(400).json({
                    error: 'War room is already archived'
                });
            }
            // Archive the war room
            metadata.status = 'archived';
            metadata.archivedAt = new Date();
            metadata.archivedBy = userId;
            await this.updateWarRoomMetadata(id, metadata);
            await this.warRoomSync.archiveWarRoom(id);
            res.json({
                warRoom: metadata,
                message: 'War room archived successfully'
            });
        }
        catch (error) {
            console.error('Error archiving war room:', error);
            res.status(500).json({
                error: 'Failed to archive war room'
            });
        }
    }
    /**
     * Get war room operation history
     * GET /api/war-rooms/:id/history
     */
    async getOperationHistory(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { limit = 50, offset = 0, operation_type, user_id } = req.query;
            // Check access
            const hasAccess = await this.auth.canAccessWarRoom(userId, id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: 'Access denied to this war room'
                });
            }
            const room = this.warRoomSync.warRooms.get(id);
            if (!room) {
                return res.status(404).json({
                    error: 'War room not found or not active'
                });
            }
            let operations = [...room.operationLog];
            // Apply filters
            if (operation_type) {
                operations = operations.filter(op => op.type === operation_type);
            }
            if (user_id) {
                operations = operations.filter(op => op.userId === user_id);
            }
            // Sort by most recent first
            operations.sort((a, b) => b.appliedAt - a.appliedAt);
            // Paginate
            const paginatedOps = operations.slice(offset, offset + limit);
            res.json({
                operations: paginatedOps,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: operations.length
                }
            });
        }
        catch (error) {
            console.error('Error getting operation history:', error);
            res.status(500).json({
                error: 'Failed to retrieve operation history'
            });
        }
    }
    /**
     * Get war room conflicts
     * GET /api/war-rooms/:id/conflicts
     */
    async getConflicts(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const hasAccess = await this.auth.canAccessWarRoom(userId, id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: 'Access denied to this war room'
                });
            }
            const room = this.warRoomSync.warRooms.get(id);
            if (!room) {
                return res.status(404).json({
                    error: 'War room not found or not active'
                });
            }
            res.json({
                conflicts: room.conflictQueue || [],
                pendingResolution: room.conflictQueue.filter(c => !c.resolved).length
            });
        }
        catch (error) {
            console.error('Error getting conflicts:', error);
            res.status(500).json({
                error: 'Failed to retrieve conflicts'
            });
        }
    }
    /**
     * Resolve manual conflict
     * POST /api/war-rooms/:id/conflicts/:conflictId/resolve
     */
    async resolveConflict(req, res) {
        try {
            const { id, conflictId } = req.params;
            const { resolution, selectedOperation } = req.body;
            const userId = req.user.id;
            const hasPermission = await this.auth.canModifyWarRoom(userId, id);
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Insufficient permissions to resolve conflicts'
                });
            }
            const room = this.warRoomSync.warRooms.get(id);
            if (!room) {
                return res.status(404).json({
                    error: 'War room not found'
                });
            }
            const conflict = room.conflictQueue.find(c => c.id === conflictId);
            if (!conflict) {
                return res.status(404).json({
                    error: 'Conflict not found'
                });
            }
            // Apply the resolution
            conflict.resolved = true;
            conflict.resolvedBy = userId;
            conflict.resolvedAt = new Date();
            conflict.resolution = resolution;
            if (selectedOperation && resolution === 'manual') {
                // Apply the selected operation
                await this.warRoomSync.applyOperation(room, selectedOperation, userId);
            }
            res.json({
                conflict,
                message: 'Conflict resolved successfully'
            });
        }
        catch (error) {
            console.error('Error resolving conflict:', error);
            res.status(500).json({
                error: 'Failed to resolve conflict'
            });
        }
    }
    // Helper methods
    async saveWarRoomMetadata(metadata) {
        // In production, this would save to a database
        // For now, we'll use in-memory storage
        if (!this.warRoomMetadataStore) {
            this.warRoomMetadataStore = new Map();
        }
        this.warRoomMetadataStore.set(metadata.id, metadata);
    }
    async getWarRoomMetadata(id) {
        if (!this.warRoomMetadataStore) {
            return null;
        }
        return this.warRoomMetadataStore.get(id);
    }
    async updateWarRoomMetadata(id, metadata) {
        if (!this.warRoomMetadataStore) {
            this.warRoomMetadataStore = new Map();
        }
        this.warRoomMetadataStore.set(id, metadata);
    }
    async getUserWarRooms(userId, filters = {}) {
        if (!this.warRoomMetadataStore) {
            return [];
        }
        let rooms = Array.from(this.warRoomMetadataStore.values());
        // Filter by user participation
        rooms = rooms.filter(room => room.participants.some(p => p.userId === userId));
        // Apply additional filters
        if (filters.status) {
            rooms = rooms.filter(room => room.status === filters.status);
        }
        if (filters.investigationId) {
            rooms = rooms.filter(room => room.investigationId === filters.investigationId);
        }
        // Sort by creation date (most recent first)
        rooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // Paginate
        const start = filters.offset || 0;
        const end = start + (filters.limit || 20);
        return rooms.slice(start, end);
    }
    getUserRoleInRoom(roomMetadata, userId) {
        const participant = roomMetadata.participants.find(p => p.userId === userId);
        return participant ? participant.role : null;
    }
}
module.exports = WarRoomController;
//# sourceMappingURL=WarRoomController.js.map