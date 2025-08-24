/**
 * War Room API Routes
 * RESTful endpoints for war room management
 */
const express = require('express');
const WarRoomController = require('../controllers/WarRoomController');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiting');
// Validation schemas
const createWarRoomSchema = {
    name: {
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 100
    },
    description: {
        type: 'string',
        maxLength: 500
    },
    investigationId: {
        type: 'string',
        required: true
    },
    participants: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                userId: { type: 'string', required: true },
                role: {
                    type: 'string',
                    enum: ['admin', 'lead', 'analyst', 'viewer'],
                    default: 'analyst'
                }
            }
        }
    }
};
const updateWarRoomSchema = {
    name: {
        type: 'string',
        minLength: 3,
        maxLength: 100
    },
    description: {
        type: 'string',
        maxLength: 500
    },
    settings: {
        type: 'object',
        properties: {
            maxParticipants: { type: 'number', min: 2, max: 50 },
            allowGuestAccess: { type: 'boolean' },
            recordSession: { type: 'boolean' },
            autoArchiveAfterHours: { type: 'number', min: 1, max: 168 }
        }
    }
};
const addParticipantSchema = {
    userId: {
        type: 'string',
        required: true
    },
    role: {
        type: 'string',
        enum: ['admin', 'lead', 'analyst', 'viewer'],
        default: 'analyst'
    }
};
const resolveConflictSchema = {
    resolution: {
        type: 'string',
        enum: ['accept', 'reject', 'manual'],
        required: true
    },
    selectedOperation: {
        type: 'object'
    }
};
const initializeRoutes = (warRoomSyncService, authService) => {
    const router = express.Router();
    const warRoomController = new WarRoomController(warRoomSyncService, authService);
    // Apply authentication to all routes
    router.use(ensureAuthenticated);
    /**
     * @swagger
     * /api/war-rooms:
     *   post:
     *     summary: Create a new war room
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - investigationId
     *             properties:
     *               name:
     *                 type: string
     *                 description: War room name
     *               description:
     *                 type: string
     *                 description: Optional description
     *               investigationId:
     *                 type: string
     *                 description: Associated investigation ID
     *               participants:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     userId:
     *                       type: string
     *                     role:
     *                       type: string
     *                       enum: [admin, lead, analyst, viewer]
     *     responses:
     *       201:
     *         description: War room created successfully
     *       400:
     *         description: Invalid request data
     *       403:
     *         description: Insufficient permissions
     */
    router.post('/', rateLimiter({ windowMs: 60000, max: 10 }), // 10 requests per minute
    validateRequest(createWarRoomSchema), requirePermission('warroom:manage'), async (req, res) => {
        await warRoomController.createWarRoom(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms:
     *   get:
     *     summary: List user's war rooms
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: status
     *         in: query
     *         schema:
     *           type: string
     *           enum: [active, archived]
     *       - name: investigationId
     *         in: query
     *         schema:
     *           type: string
     *       - name: limit
     *         in: query
     *         schema:
     *           type: integer
     *           default: 20
     *       - name: offset
     *         in: query
     *         schema:
     *           type: integer
     *           default: 0
     *     responses:
     *       200:
     *         description: List of war rooms
     */
    router.get('/', async (req, res) => {
        await warRoomController.listWarRooms(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms/{id}:
     *   get:
     *     summary: Get war room details
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: War room details
     *       404:
     *         description: War room not found
     *       403:
     *         description: Access denied
     */
    router.get('/:id', async (req, res) => {
        await warRoomController.getWarRoom(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms/{id}:
     *   patch:
     *     summary: Update war room settings
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     *               settings:
     *                 type: object
     *     responses:
     *       200:
     *         description: War room updated successfully
     *       403:
     *         description: Insufficient permissions
     *       404:
     *         description: War room not found
     */
    router.patch('/:id', validateRequest(updateWarRoomSchema), requirePermission('warroom:manage'), async (req, res) => {
        await warRoomController.updateWarRoom(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms/{id}/participants:
     *   post:
     *     summary: Add participant to war room
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - userId
     *             properties:
     *               userId:
     *                 type: string
     *               role:
     *                 type: string
     *                 enum: [admin, lead, analyst, viewer]
     *     responses:
     *       200:
     *         description: Participant added successfully
     *       400:
     *         description: Invalid request or user already participant
     *       403:
     *         description: Insufficient permissions
     */
    router.post('/:id/participants', validateRequest(addParticipantSchema), requirePermission('warroom:manage'), async (req, res) => {
        await warRoomController.addParticipant(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms/{id}/participants/{userId}:
     *   delete:
     *     summary: Remove participant from war room
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *       - name: userId
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Participant removed successfully
     *       403:
     *         description: Insufficient permissions
     *       404:
     *         description: War room not found
     */
    router.delete('/:id/participants/:userId', async (req, res) => {
        await warRoomController.removeParticipant(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms/{id}/archive:
     *   post:
     *     summary: Archive war room
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: War room archived successfully
     *       403:
     *         description: Insufficient permissions
     *       404:
     *         description: War room not found
     */
    router.post('/:id/archive', requirePermission('warroom:manage'), async (req, res) => {
        await warRoomController.archiveWarRoom(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms/{id}/history:
     *   get:
     *     summary: Get war room operation history
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *       - name: limit
     *         in: query
     *         schema:
     *           type: integer
     *           default: 50
     *       - name: offset
     *         in: query
     *         schema:
     *           type: integer
     *           default: 0
     *       - name: operation_type
     *         in: query
     *         schema:
     *           type: string
     *       - name: user_id
     *         in: query
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Operation history
     *       403:
     *         description: Access denied
     *       404:
     *         description: War room not found
     */
    router.get('/:id/history', async (req, res) => {
        await warRoomController.getOperationHistory(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms/{id}/conflicts:
     *   get:
     *     summary: Get war room conflicts
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Current conflicts
     *       403:
     *         description: Access denied
     *       404:
     *         description: War room not found
     */
    router.get('/:id/conflicts', async (req, res) => {
        await warRoomController.getConflicts(req, res);
    });
    /**
     * @swagger
     * /api/war-rooms/{id}/conflicts/{conflictId}/resolve:
     *   post:
     *     summary: Resolve manual conflict
     *     tags: [WarRooms]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *       - name: conflictId
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - resolution
     *             properties:
     *               resolution:
     *                 type: string
     *                 enum: [accept, reject, manual]
     *               selectedOperation:
     *                 type: object
     *     responses:
     *       200:
     *         description: Conflict resolved successfully
     *       403:
     *         description: Insufficient permissions
     *       404:
     *         description: Conflict not found
     */
    router.post('/:id/conflicts/:conflictId/resolve', validateRequest(resolveConflictSchema), requirePermission('warroom:manage'), async (req, res) => {
        await warRoomController.resolveConflict(req, res);
    });
    // Health check for war room service
    router.get('/health', (req, res) => {
        const activeRooms = warRoomController.warRoomSync ? warRoomController.warRoomSync.warRooms.size : 0;
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            activeWarRooms: activeRooms,
            service: 'war-room-api',
            version: '1.0.0'
        });
    });
    return router;
};
module.exports = {
    initializeRoutes
};
//# sourceMappingURL=warRoomRoutes.js.map