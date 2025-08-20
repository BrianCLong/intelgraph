import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { MediaUploadService, MediaMetadata, MediaType } from './MediaUploadService.js';
import { ExtractionJobService } from './ExtractionJobService.js';

const logger = logger.child({ name: 'MultimodalDataService' });

export interface MediaSource {
  id: string;
  uri: string;
  filename?: string;
  mediaType: MediaType;
  mimeType: string;
  filesize?: number;
  duration?: number;
  checksum: string;
  width?: number;
  height?: number;
  channels?: number;
  bitRate?: number;
  frameRate?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  gpsAccuracy?: number;
  gpsTimestamp?: Date;
  processingStatus: ProcessingStatus;
  extractionCount: number;
  metadata: Record<string, any>;
  uploadedBy?: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MultimodalEntity {
  id: string;
  investigationId: string;
  mediaSourceId: string;
  entityType: string;
  extractedText?: string;
  bboxX?: number;
  bboxY?: number;
  bboxWidth?: number;
  bboxHeight?: number;
  bboxConfidence?: number;
  temporalStart?: number;
  temporalEnd?: number;
  temporalConfidence?: number;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  qualityScore?: number;
  extractionMethod: string;
  extractionVersion: string;
  humanVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
  textEmbedding?: number[];
  visualEmbedding?: number[];
  audioEmbedding?: number[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrossModalMatch {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  matchType: CrossModalMatchType;
  confidence: number;
  algorithm: string;
  explanation: Record<string, any>;
  similarityScore?: number;
  humanVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface SemanticCluster {
  id: string;
  investigationId: string;
  name?: string;
  description?: string;
  centroid: number[];
  algorithm: ClusteringAlgorithm;
  algorithmParams: Record<string, any>;
  coherenceScore?: number;
  silhouetteScore?: number;
  temporalStart?: Date;
  temporalEnd?: Date;
  geoNorthLat?: number;
  geoSouthLat?: number;
  geoEastLng?: number;
  geoWestLng?: number;
  dominantTopics: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export enum CrossModalMatchType {
  VISUAL_SIMILARITY = 'VISUAL_SIMILARITY',
  SEMANTIC_SIMILARITY = 'SEMANTIC_SIMILARITY',
  TEMPORAL_CORRELATION = 'TEMPORAL_CORRELATION',
  SPATIAL_PROXIMITY = 'SPATIAL_PROXIMITY',
  ENTITY_MENTION = 'ENTITY_MENTION',
  FACIAL_RECOGNITION = 'FACIAL_RECOGNITION',
  VOICE_RECOGNITION = 'VOICE_RECOGNITION',
  OBJECT_DETECTION = 'OBJECT_DETECTION',
  OCR_CORRELATION = 'OCR_CORRELATION'
}

export enum ClusteringAlgorithm {
  KMEANS = 'KMEANS',
  DBSCAN = 'DBSCAN',
  HIERARCHICAL = 'HIERARCHICAL',
  SPECTRAL = 'SPECTRAL',
  HDBSCAN = 'HDBSCAN'
}

export interface MediaSourceInput {
  uri: string;
  filename?: string;
  mediaType: MediaType;
  mimeType: string;
  metadata?: Record<string, any>;
  geospatialContext?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    accuracy?: number;
    timestamp?: Date;
  };
}

export interface MultimodalEntityInput {
  investigationId: string;
  mediaSourceId: string;
  entityType: string;
  extractedText?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence?: number;
  };
  temporalRange?: {
    startTime: number;
    endTime: number;
    confidence?: number;
  };
  confidence: number;
  extractionMethod: string;
  extractionVersion: string;
  metadata?: Record<string, any>;
}

export interface VerificationInput {
  verified: boolean;
  notes?: string;
  qualityScore?: number;
}

export class MultimodalDataService {
  private db: Pool;
  private mediaUploadService: MediaUploadService;
  private extractionJobService: ExtractionJobService;

  constructor(
    db: Pool,
    mediaUploadService: MediaUploadService,
    extractionJobService: ExtractionJobService
  ) {
    this.db = db;
    this.mediaUploadService = mediaUploadService;
    this.extractionJobService = extractionJobService;
  }

  // ===== MEDIA SOURCE OPERATIONS =====

  /**
   * Create a new media source from uploaded metadata
   */
  async createMediaSource(
    metadata: MediaMetadata,
    userId?: string,
    geospatialContext?: any
  ): Promise<MediaSource> {
    const id = uuidv4();
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

    } catch (error) {
      logger.error(`Failed to create media source:`, error);
      throw error;
    }
  }

  /**
   * Get media source by ID
   */
  async getMediaSource(id: string): Promise<MediaSource | null> {
    try {
      const query = 'SELECT * FROM media_sources WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      return result.rows.length > 0 ? this.mapRowToMediaSource(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to get media source ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get media sources for investigation with filtering
   */
  async getMediaSources(
    investigationId: string,
    filters: {
      mediaType?: MediaType;
      status?: ProcessingStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MediaSource[]> {
    try {
      let query = `
        SELECT ms.* FROM media_sources ms
        JOIN multimodal_entities me ON ms.id = me.media_source_id
        WHERE me.investigation_id = $1
      `;
      
      const values: any[] = [investigationId];
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

    } catch (error) {
      logger.error(`Failed to get media sources for investigation ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Update media source processing status
   */
  async updateMediaSourceStatus(id: string, status: ProcessingStatus): Promise<MediaSource> {
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
    } catch (error) {
      logger.error(`Failed to update media source status ${id}:`, error);
      throw error;
    }
  }

  // ===== MULTIMODAL ENTITY OPERATIONS =====

  /**
   * Create a new multimodal entity
   */
  async createMultimodalEntity(input: MultimodalEntityInput, userId?: string): Promise<MultimodalEntity> {
    const id = uuidv4();
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

    } catch (error) {
      logger.error(`Failed to create multimodal entity:`, error);
      throw error;
    }
  }

  /**
   * Get multimodal entity by ID
   */
  async getMultimodalEntity(id: string): Promise<MultimodalEntity | null> {
    try {
      const query = 'SELECT * FROM multimodal_entities WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      return result.rows.length > 0 ? this.mapRowToMultimodalEntity(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to get multimodal entity ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get multimodal entities with filtering
   */
  async getMultimodalEntities(
    investigationId: string,
    filters: {
      mediaType?: MediaType;
      entityType?: string;
      verified?: boolean;
      confidenceLevel?: ConfidenceLevel;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MultimodalEntity[]> {
    try {
      let query = `
        SELECT me.* FROM multimodal_entities me
        JOIN media_sources ms ON me.media_source_id = ms.id
        WHERE me.investigation_id = $1
      `;
      
      const values: any[] = [investigationId];
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

    } catch (error) {
      logger.error(`Failed to get multimodal entities for investigation ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Update multimodal entity
   */
  async updateMultimodalEntity(id: string, input: Partial<MultimodalEntityInput>): Promise<MultimodalEntity> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
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
    } catch (error) {
      logger.error(`Failed to update multimodal entity ${id}:`, error);
      throw error;
    }
  }

  /**
   * Verify multimodal entity
   */
  async verifyMultimodalEntity(
    id: string,
    verification: VerificationInput,
    userId: string
  ): Promise<MultimodalEntity> {
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
    } catch (error) {
      logger.error(`Failed to verify multimodal entity ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete multimodal entity
   */
  async deleteMultimodalEntity(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM multimodal_entities WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      const deleted = result.rowCount > 0;
      
      if (deleted) {
        logger.info(`Deleted multimodal entity: ${id}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error(`Failed to delete multimodal entity ${id}:`, error);
      throw error;
    }
  }

  // ===== SEMANTIC SEARCH OPERATIONS =====

  /**
   * Perform semantic search using vector similarity
   */
  async semanticSearch(
    investigationId: string,
    query: {
      text?: string;
      entityId?: string;
      topK?: number;
      threshold?: number;
      mediaTypes?: MediaType[];
      includeText?: boolean;
    }
  ): Promise<MultimodalEntity[]> {
    try {
      // This is a simplified implementation
      // In production, you'd generate embeddings for the query and use vector similarity
      let sqlQuery = `
        SELECT me.* FROM multimodal_entities me
        JOIN media_sources ms ON me.media_source_id = ms.id
        WHERE me.investigation_id = $1
      `;
      
      const values: any[] = [investigationId];
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

    } catch (error) {
      logger.error(`Failed to perform semantic search:`, error);
      throw error;
    }
  }

  /**
   * Find similar entities using vector embeddings
   */
  async findSimilarEntities(
    entityId: string,
    topK: number = 10,
    threshold: number = 0.8
  ): Promise<MultimodalEntity[]> {
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

    } catch (error) {
      logger.error(`Failed to find similar entities for ${entityId}:`, error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  private async incrementExtractionCount(mediaSourceId: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE media_sources SET extraction_count = extraction_count + 1 WHERE id = $1',
        [mediaSourceId]
      );
    } catch (error) {
      logger.warn(`Failed to increment extraction count for ${mediaSourceId}:`, error);
    }
  }

  private mapRowToMediaSource(row: any): MediaSource {
    return {
      id: row.id,
      uri: row.uri,
      filename: row.filename,
      mediaType: row.media_type as MediaType,
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
      processingStatus: row.processing_status as ProcessingStatus,
      extractionCount: row.extraction_count,
      metadata: row.metadata || {},
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToMultimodalEntity(row: any): MultimodalEntity {
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
      confidenceLevel: row.confidence_level as ConfidenceLevel,
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

export default MultimodalDataService;