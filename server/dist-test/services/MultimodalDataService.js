"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultimodalDataService = exports.ClusteringAlgorithm = exports.CrossModalMatchType = exports.ConfidenceLevel = exports.ProcessingStatus = void 0;
const uuid_1 = require("uuid");
const logger = logger.child({ name: 'MultimodalDataService' });
var ProcessingStatus;
(function (ProcessingStatus) {
    ProcessingStatus["PENDING"] = "PENDING";
    ProcessingStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ProcessingStatus["COMPLETED"] = "COMPLETED";
    ProcessingStatus["FAILED"] = "FAILED";
    ProcessingStatus["CANCELLED"] = "CANCELLED";
})(ProcessingStatus || (exports.ProcessingStatus = ProcessingStatus = {}));
var ConfidenceLevel;
(function (ConfidenceLevel) {
    ConfidenceLevel["LOW"] = "LOW";
    ConfidenceLevel["MEDIUM"] = "MEDIUM";
    ConfidenceLevel["HIGH"] = "HIGH";
    ConfidenceLevel["VERY_HIGH"] = "VERY_HIGH";
})(ConfidenceLevel || (exports.ConfidenceLevel = ConfidenceLevel = {}));
var CrossModalMatchType;
(function (CrossModalMatchType) {
    CrossModalMatchType["VISUAL_SIMILARITY"] = "VISUAL_SIMILARITY";
    CrossModalMatchType["SEMANTIC_SIMILARITY"] = "SEMANTIC_SIMILARITY";
    CrossModalMatchType["TEMPORAL_CORRELATION"] = "TEMPORAL_CORRELATION";
    CrossModalMatchType["SPATIAL_PROXIMITY"] = "SPATIAL_PROXIMITY";
    CrossModalMatchType["ENTITY_MENTION"] = "ENTITY_MENTION";
    CrossModalMatchType["FACIAL_RECOGNITION"] = "FACIAL_RECOGNITION";
    CrossModalMatchType["VOICE_RECOGNITION"] = "VOICE_RECOGNITION";
    CrossModalMatchType["OBJECT_DETECTION"] = "OBJECT_DETECTION";
    CrossModalMatchType["OCR_CORRELATION"] = "OCR_CORRELATION";
})(CrossModalMatchType || (exports.CrossModalMatchType = CrossModalMatchType = {}));
var ClusteringAlgorithm;
(function (ClusteringAlgorithm) {
    ClusteringAlgorithm["KMEANS"] = "KMEANS";
    ClusteringAlgorithm["DBSCAN"] = "DBSCAN";
    ClusteringAlgorithm["HIERARCHICAL"] = "HIERARCHICAL";
    ClusteringAlgorithm["SPECTRAL"] = "SPECTRAL";
    ClusteringAlgorithm["HDBSCAN"] = "HDBSCAN";
})(ClusteringAlgorithm || (exports.ClusteringAlgorithm = ClusteringAlgorithm = {}));
class MultimodalDataService {
    constructor(db, mediaUploadService, extractionJobService) {
        this.db = db;
        this.mediaUploadService = mediaUploadService;
        this.extractionJobService = extractionJobService;
    }
    // ===== MEDIA SOURCE OPERATIONS =====
    /**
     * Create a new media source from uploaded metadata
     */
    async createMediaSource(metadata, userId, geospatialContext) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        try {
            const query = `
        INSERT INTO media_sources (
          id, uri, filename, media_type, mime_type, filesize, duration, checksum,
          width, height, channels, bit_rate, frame_rate,
          latitude, longitude, altitude, gps_accuracy, gps_timestamp,
          processing_status, extraction_count, metadata, uploaded_by, uploaded_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) RETURNING *
      `;
            const values = [
                id,
                metadata.filename, // URI points to the uploaded file
                metadata.originalName,
                metadata.mediaType,
                metadata.mimeType,
                metadata.filesize,
                metadata.duration,
                metadata.checksum,
                metadata.dimensions?.width,
                metadata.dimensions?.height,
                metadata.dimensions?.channels,
                metadata.dimensions?.bitRate,
                metadata.dimensions?.frameRate,
                geospatialContext?.latitude,
                geospatialContext?.longitude,
                geospatialContext?.altitude,
                geospatialContext?.accuracy,
                geospatialContext?.timestamp,
                ProcessingStatus.PENDING,
                0,
                JSON.stringify(metadata.metadata),
                userId,
                now,
                now,
                now
            ];
            const result = await this.db.query(query, values);
            const mediaSource = this.mapRowToMediaSource(result.rows[0]);
            logger.info(`Created media source: ${id}, type: ${metadata.mediaType}, size: ${metadata.filesize}`);
            return mediaSource;
        }
        catch (error) {
            logger.error(`Failed to create media source:`, error);
            throw error;
        }
    }
    /**
     * Get media source by ID
     */
    async getMediaSource(id) {
        try {
            const query = 'SELECT * FROM media_sources WHERE id = $1';
            const result = await this.db.query(query, [id]);
            return result.rows.length > 0 ? this.mapRowToMediaSource(result.rows[0]) : null;
        }
        catch (error) {
            logger.error(`Failed to get media source ${id}:`, error);
            throw error;
        }
    }
    /**
     * Get media sources for investigation with filtering
     */
    async getMediaSources(investigationId, filters = {}) {
        try {
            let query = `
        SELECT ms.* FROM media_sources ms
        JOIN multimodal_entities me ON ms.id = me.media_source_id
        WHERE me.investigation_id = $1
      `;
            const values = [investigationId];
            let paramCount = 1;
            if (filters.mediaType) {
                query += ` AND ms.media_type = $${++paramCount}`;
                values.push(filters.mediaType);
            }
            if (filters.status) {
                query += ` AND ms.processing_status = $${++paramCount}`;
                values.push(filters.status);
            }
            query += ` ORDER BY ms.created_at DESC`;
            if (filters.limit) {
                query += ` LIMIT $${++paramCount}`;
                values.push(filters.limit);
            }
            if (filters.offset) {
                query += ` OFFSET $${++paramCount}`;
                values.push(filters.offset);
            }
            const result = await this.db.query(query, values);
            return result.rows.map(row => this.mapRowToMediaSource(row));
        }
        catch (error) {
            logger.error(`Failed to get media sources for investigation ${investigationId}:`, error);
            throw error;
        }
    }
    /**
     * Update media source processing status
     */
    async updateMediaSourceStatus(id, status) {
        try {
            const query = `
        UPDATE media_sources 
        SET processing_status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
            const result = await this.db.query(query, [status, id]);
            if (result.rows.length === 0) {
                throw new Error(`Media source ${id} not found`);
            }
            return this.mapRowToMediaSource(result.rows[0]);
        }
        catch (error) {
            logger.error(`Failed to update media source status ${id}:`, error);
            throw error;
        }
    }
    // ===== MULTIMODAL ENTITY OPERATIONS =====
    /**
     * Create a new multimodal entity
     */
    async createMultimodalEntity(input, userId) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        try {
            const query = `
        INSERT INTO multimodal_entities (
          id, investigation_id, media_source_id, entity_type, extracted_text,
          bbox_x, bbox_y, bbox_width, bbox_height, bbox_confidence,
          temporal_start, temporal_end, temporal_confidence,
          confidence, extraction_method, extraction_version,
          human_verified, metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *
      `;
            const values = [
                id,
                input.investigationId,
                input.mediaSourceId,
                input.entityType,
                input.extractedText,
                input.boundingBox?.x,
                input.boundingBox?.y,
                input.boundingBox?.width,
                input.boundingBox?.height,
                input.boundingBox?.confidence,
                input.temporalRange?.startTime,
                input.temporalRange?.endTime,
                input.temporalRange?.confidence,
                input.confidence,
                input.extractionMethod,
                input.extractionVersion,
                false, // human_verified defaults to false
                JSON.stringify(input.metadata || {}),
                now,
                now
            ];
            const result = await this.db.query(query, values);
            const entity = this.mapRowToMultimodalEntity(result.rows[0]);
            // Update extraction count for media source
            await this.incrementExtractionCount(input.mediaSourceId);
            logger.info(`Created multimodal entity: ${id}, type: ${input.entityType}, confidence: ${input.confidence}`);
            return entity;
        }
        catch (error) {
            logger.error(`Failed to create multimodal entity:`, error);
            throw error;
        }
    }
    /**
     * Get multimodal entity by ID
     */
    async getMultimodalEntity(id) {
        try {
            const query = 'SELECT * FROM multimodal_entities WHERE id = $1';
            const result = await this.db.query(query, [id]);
            return result.rows.length > 0 ? this.mapRowToMultimodalEntity(result.rows[0]) : null;
        }
        catch (error) {
            logger.error(`Failed to get multimodal entity ${id}:`, error);
            throw error;
        }
    }
    /**
     * Get multimodal entities with filtering
     */
    async getMultimodalEntities(investigationId, filters = {}) {
        try {
            let query = `
        SELECT me.* FROM multimodal_entities me
        JOIN media_sources ms ON me.media_source_id = ms.id
        WHERE me.investigation_id = $1
      `;
            const values = [investigationId];
            let paramCount = 1;
            if (filters.mediaType) {
                query += ` AND ms.media_type = $${++paramCount}`;
                values.push(filters.mediaType);
            }
            if (filters.entityType) {
                query += ` AND me.entity_type = $${++paramCount}`;
                values.push(filters.entityType);
            }
            if (filters.verified !== undefined) {
                query += ` AND me.human_verified = $${++paramCount}`;
                values.push(filters.verified);
            }
            if (filters.confidenceLevel) {
                query += ` AND me.confidence_level = $${++paramCount}`;
                values.push(filters.confidenceLevel);
            }
            query += ` ORDER BY me.confidence DESC, me.created_at DESC`;
            if (filters.limit) {
                query += ` LIMIT $${++paramCount}`;
                values.push(filters.limit);
            }
            if (filters.offset) {
                query += ` OFFSET $${++paramCount}`;
                values.push(filters.offset);
            }
            const result = await this.db.query(query, values);
            return result.rows.map(row => this.mapRowToMultimodalEntity(row));
        }
        catch (error) {
            logger.error(`Failed to get multimodal entities for investigation ${investigationId}:`, error);
            throw error;
        }
    }
    /**
     * Update multimodal entity
     */
    async updateMultimodalEntity(id, input) {
        try {
            const updates = [];
            const values = [];
            let paramCount = 0;
            if (input.entityType !== undefined) {
                updates.push(`entity_type = $${++paramCount}`);
                values.push(input.entityType);
            }
            if (input.extractedText !== undefined) {
                updates.push(`extracted_text = $${++paramCount}`);
                values.push(input.extractedText);
            }
            if (input.boundingBox) {
                updates.push(`bbox_x = $${++paramCount}, bbox_y = $${++paramCount}, bbox_width = $${++paramCount}, bbox_height = $${++paramCount}, bbox_confidence = $${++paramCount}`);
                values.push(input.boundingBox.x, input.boundingBox.y, input.boundingBox.width, input.boundingBox.height, input.boundingBox.confidence);
                paramCount += 4; // Adjust for the 5 parameters added
            }
            if (input.temporalRange) {
                updates.push(`temporal_start = $${++paramCount}, temporal_end = $${++paramCount}, temporal_confidence = $${++paramCount}`);
                values.push(input.temporalRange.startTime, input.temporalRange.endTime, input.temporalRange.confidence);
                paramCount += 2; // Adjust for the 3 parameters added
            }
            if (input.confidence !== undefined) {
                updates.push(`confidence = $${++paramCount}`);
                values.push(input.confidence);
            }
            if (input.metadata !== undefined) {
                updates.push(`metadata = $${++paramCount}`);
                values.push(JSON.stringify(input.metadata));
            }
            if (updates.length === 0) {
                throw new Error('No updates provided');
            }
            updates.push(`updated_at = NOW()`);
            values.push(id);
            const query = `
        UPDATE multimodal_entities 
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;
            const result = await this.db.query(query, values);
            if (result.rows.length === 0) {
                throw new Error(`Multimodal entity ${id} not found`);
            }
            return this.mapRowToMultimodalEntity(result.rows[0]);
        }
        catch (error) {
            logger.error(`Failed to update multimodal entity ${id}:`, error);
            throw error;
        }
    }
    /**
     * Verify multimodal entity
     */
    async verifyMultimodalEntity(id, verification, userId) {
        try {
            const query = `
        UPDATE multimodal_entities 
        SET human_verified = $1, verified_by = $2, verified_at = $3, 
            verification_notes = $4, quality_score = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `;
            const values = [
                verification.verified,
                userId,
                verification.verified ? new Date() : null,
                verification.notes,
                verification.qualityScore,
                id
            ];
            const result = await this.db.query(query, values);
            if (result.rows.length === 0) {
                throw new Error(`Multimodal entity ${id} not found`);
            }
            const entity = this.mapRowToMultimodalEntity(result.rows[0]);
            logger.info(`Verified multimodal entity: ${id}, verified: ${verification.verified}, by: ${userId}`);
            return entity;
        }
        catch (error) {
            logger.error(`Failed to verify multimodal entity ${id}:`, error);
            throw error;
        }
    }
    /**
     * Delete multimodal entity
     */
    async deleteMultimodalEntity(id) {
        try {
            const query = 'DELETE FROM multimodal_entities WHERE id = $1';
            const result = await this.db.query(query, [id]);
            const deleted = result.rowCount > 0;
            if (deleted) {
                logger.info(`Deleted multimodal entity: ${id}`);
            }
            return deleted;
        }
        catch (error) {
            logger.error(`Failed to delete multimodal entity ${id}:`, error);
            throw error;
        }
    }
    // ===== SEMANTIC SEARCH OPERATIONS =====
    /**
     * Perform semantic search using vector similarity
     */
    async semanticSearch(investigationId, query) {
        try {
            // This is a simplified implementation
            // In production, you'd generate embeddings for the query and use vector similarity
            let sqlQuery = `
        SELECT me.* FROM multimodal_entities me
        JOIN media_sources ms ON me.media_source_id = ms.id
        WHERE me.investigation_id = $1
      `;
            const values = [investigationId];
            let paramCount = 1;
            if (query.text && query.includeText !== false) {
                sqlQuery += ` AND me.extracted_text ILIKE $${++paramCount}`;
                values.push(`%${query.text}%`);
            }
            if (query.mediaTypes && query.mediaTypes.length > 0) {
                sqlQuery += ` AND ms.media_type = ANY($${++paramCount})`;
                values.push(query.mediaTypes);
            }
            sqlQuery += ` ORDER BY me.confidence DESC`;
            if (query.topK) {
                sqlQuery += ` LIMIT $${++paramCount}`;
                values.push(query.topK);
            }
            const result = await this.db.query(sqlQuery, values);
            return result.rows.map(row => this.mapRowToMultimodalEntity(row));
        }
        catch (error) {
            logger.error(`Failed to perform semantic search:`, error);
            throw error;
        }
    }
    /**
     * Find similar entities using vector embeddings
     */
    async findSimilarEntities(entityId, topK = 10, threshold = 0.8) {
        try {
            // This would use vector similarity search in production
            // For now, return entities with similar types and high confidence
            const entity = await this.getMultimodalEntity(entityId);
            if (!entity) {
                throw new Error(`Entity ${entityId} not found`);
            }
            const query = `
        SELECT * FROM multimodal_entities 
        WHERE investigation_id = $1 
        AND entity_type = $2 
        AND id != $3 
        AND confidence >= $4
        ORDER BY confidence DESC
        LIMIT $5
      `;
            const result = await this.db.query(query, [
                entity.investigationId,
                entity.entityType,
                entityId,
                threshold,
                topK
            ]);
            return result.rows.map(row => this.mapRowToMultimodalEntity(row));
        }
        catch (error) {
            logger.error(`Failed to find similar entities for ${entityId}:`, error);
            throw error;
        }
    }
    // ===== UTILITY METHODS =====
    async incrementExtractionCount(mediaSourceId) {
        try {
            await this.db.query('UPDATE media_sources SET extraction_count = extraction_count + 1 WHERE id = $1', [mediaSourceId]);
        }
        catch (error) {
            logger.warn(`Failed to increment extraction count for ${mediaSourceId}:`, error);
        }
    }
    mapRowToMediaSource(row) {
        return {
            id: row.id,
            uri: row.uri,
            filename: row.filename,
            mediaType: row.media_type,
            mimeType: row.mime_type,
            filesize: row.filesize,
            duration: row.duration,
            checksum: row.checksum,
            width: row.width,
            height: row.height,
            channels: row.channels,
            bitRate: row.bit_rate,
            frameRate: row.frame_rate,
            latitude: row.latitude,
            longitude: row.longitude,
            altitude: row.altitude,
            gpsAccuracy: row.gps_accuracy,
            gpsTimestamp: row.gps_timestamp,
            processingStatus: row.processing_status,
            extractionCount: row.extraction_count,
            metadata: row.metadata || {},
            uploadedBy: row.uploaded_by,
            uploadedAt: row.uploaded_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    mapRowToMultimodalEntity(row) {
        return {
            id: row.id,
            investigationId: row.investigation_id,
            mediaSourceId: row.media_source_id,
            entityType: row.entity_type,
            extractedText: row.extracted_text,
            bboxX: row.bbox_x,
            bboxY: row.bbox_y,
            bboxWidth: row.bbox_width,
            bboxHeight: row.bbox_height,
            bboxConfidence: row.bbox_confidence,
            temporalStart: row.temporal_start,
            temporalEnd: row.temporal_end,
            temporalConfidence: row.temporal_confidence,
            confidence: row.confidence,
            confidenceLevel: row.confidence_level,
            qualityScore: row.quality_score,
            extractionMethod: row.extraction_method,
            extractionVersion: row.extraction_version,
            humanVerified: row.human_verified,
            verifiedBy: row.verified_by,
            verifiedAt: row.verified_at,
            verificationNotes: row.verification_notes,
            textEmbedding: row.text_embedding,
            visualEmbedding: row.visual_embedding,
            audioEmbedding: row.audio_embedding,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.MultimodalDataService = MultimodalDataService;
exports.default = MultimodalDataService;
//# sourceMappingURL=MultimodalDataService.js.map