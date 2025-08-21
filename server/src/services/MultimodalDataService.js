/**
 * Multimodal Data Service
 * P0 Critical - MVP1 requirement for cross-modal entity extraction
 * Manages entities and relationships from text, image, audio, and video sources
 */

import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

class MultimodalDataService {
  constructor(neo4jDriver, authService, storageService) {
    this.driver = neo4jDriver;
    this.auth = authService;
    this.storage = storageService;

    // Extraction pipeline registry
    this.extractors = new Map();

    // Quality thresholds
    this.qualityThresholds = {
      minConfidence: 0.3,
      duplicateSimilarity: 0.95,
      crossModalThreshold: 0.7,
      verificationThreshold: 0.8,
    };

    this.initializeExtractors();
  }

  /**
   * Initialize extraction pipeline components
   */
  initializeExtractors() {
    // Register available extractors
    this.extractors.set("NLP_SPACY", {
      name: "spaCy NLP Pipeline",
      version: "3.4.0",
      mediaTypes: ["TEXT", "DOCUMENT"],
      entityTypes: ["PERSON", "ORGANIZATION", "LOCATION", "EVENT"],
      confidence: 0.85,
    });

    this.extractors.set("NLP_TRANSFORMERS", {
      name: "HuggingFace Transformers",
      version: "4.21.0",
      mediaTypes: ["TEXT", "DOCUMENT"],
      entityTypes: ["PERSON", "ORGANIZATION", "LOCATION", "EVENT", "CUSTOM"],
      confidence: 0.9,
    });

    this.extractors.set("COMPUTER_VISION", {
      name: "Computer Vision Pipeline",
      version: "1.0.0",
      mediaTypes: ["IMAGE", "VIDEO"],
      entityTypes: ["PERSON", "VEHICLE", "LOCATION", "DEVICE"],
      confidence: 0.8,
    });

    this.extractors.set("OCR_TESSERACT", {
      name: "Tesseract OCR",
      version: "5.0.0",
      mediaTypes: ["IMAGE", "DOCUMENT"],
      entityTypes: ["TEXT_CONTENT"],
      confidence: 0.75,
    });

    this.extractors.set("SPEECH_TO_TEXT", {
      name: "Speech Recognition",
      version: "1.0.0",
      mediaTypes: ["AUDIO", "VIDEO"],
      entityTypes: ["PERSON", "LOCATION", "EVENT"],
      confidence: 0.7,
    });
  }

  /**
   * Upload and register a media source
   */
  async uploadMediaSource(mediaData, userId) {
    const session = this.driver.session();

    try {
      const mediaId = uuidv4();
      const checksum = this.generateChecksum(mediaData.content);

      // Store file content
      const uri = await this.storage.store(
        mediaData.content,
        mediaData.filename,
      );

      const result = await session.run(
        `
        CREATE (m:MediaSource {
          id: $id,
          uri: $uri,
          mediaType: $mediaType,
          mimeType: $mimeType,
          filename: $filename,
          filesize: $filesize,
          duration: $duration,
          dimensions: $dimensions,
          quality: $quality,
          checksum: $checksum,
          uploadedBy: $uploadedBy,
          uploadedAt: datetime(),
          metadata: $metadata
        })
        RETURN m
      `,
        {
          id: mediaId,
          uri,
          mediaType: mediaData.mediaType,
          mimeType: mediaData.mimeType,
          filename: mediaData.filename,
          filesize: mediaData.filesize || 0,
          duration: mediaData.duration || null,
          dimensions: mediaData.dimensions || null,
          quality: mediaData.quality || "MEDIUM",
          checksum,
          uploadedBy: userId,
          metadata: mediaData.metadata || {},
        },
      );

      return this.formatMediaSource(result.records[0].get("m").properties);
    } finally {
      await session.close();
    }
  }

  /**
   * Create a multimodal entity from extraction results
   */
  async createMultimodalEntity(entityData, userId) {
    const session = this.driver.session();

    try {
      const entityId = uuidv4();
      const entityUuid = uuidv4();

      // Validate confidence level
      const confidenceLevel = this.determineConfidenceLevel(
        entityData.confidence,
      );

      const result = await session.run(
        `
        CREATE (e:MultimodalEntity:Entity {
          id: $id,
          uuid: $uuid,
          type: $type,
          label: $label,
          description: $description,
          properties: $properties,
          confidence: $confidence,
          confidenceLevel: $confidenceLevel,
          extractionMethod: $extractionMethod,
          boundingBoxes: $boundingBoxes,
          temporalBounds: $temporalBounds,
          spatialContext: $spatialContext,
          verified: false,
          verifiedBy: null,
          verifiedAt: null,
          createdBy: $createdBy,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        WITH e
        
        // Link to media sources
        UNWIND $mediaSourceIds AS mediaSourceId
        MATCH (m:MediaSource {id: mediaSourceId})
        CREATE (e)-[:EXTRACTED_FROM {
          confidence: $confidence,
          extractedAt: datetime()
        }]->(m)
        
        // Link to investigation
        WITH e
        MATCH (i:Investigation {id: $investigationId})
        CREATE (e)-[:BELONGS_TO]->(i)
        
        RETURN e
      `,
        {
          id: entityId,
          uuid: entityUuid,
          type: entityData.type,
          label: entityData.label,
          description: entityData.description || null,
          properties: entityData.properties,
          confidence: entityData.confidence,
          confidenceLevel,
          extractionMethod: entityData.extractionMethod,
          boundingBoxes: entityData.boundingBoxes || [],
          temporalBounds: entityData.temporalBounds || [],
          spatialContext: entityData.spatialContext || null,
          createdBy: userId,
          mediaSourceIds: entityData.extractedFrom,
          investigationId: entityData.investigationId,
        },
      );

      // Create extraction provenance
      await this.createExtractionProvenance(entityId, entityData, userId);

      const entity = this.formatMultimodalEntity(
        result.records[0].get("e").properties,
      );

      // Automatically find cross-modal matches
      setTimeout(() => this.findCrossModalMatches(entityId), 1000);

      return entity;
    } finally {
      await session.close();
    }
  }

  /**
   * Create a multimodal relationship
   */
  async createMultimodalRelationship(relationshipData, userId) {
    const session = this.driver.session();

    try {
      const relationshipId = uuidv4();
      const relationshipUuid = uuidv4();

      const confidenceLevel = this.determineConfidenceLevel(
        relationshipData.confidence,
      );

      const result = await session.run(
        `
        MATCH (source:MultimodalEntity {id: $sourceId})
        MATCH (target:MultimodalEntity {id: $targetId})
        
        CREATE (source)-[r:MultimodalRelationship {
          id: $id,
          uuid: $uuid,
          type: $type,
          label: $label,
          description: $description,
          properties: $properties,
          weight: $weight,
          confidence: $confidence,
          confidenceLevel: $confidenceLevel,
          validFrom: $validFrom,
          validTo: $validTo,
          extractionMethod: $extractionMethod,
          spatialContext: $spatialContext,
          temporalContext: $temporalContext,
          verified: false,
          verifiedBy: null,
          verifiedAt: null,
          createdBy: $createdBy,
          createdAt: datetime(),
          updatedAt: datetime()
        }]->(target)
        
        WITH r
        
        // Link to media sources
        UNWIND $mediaSourceIds AS mediaSourceId
        MATCH (m:MediaSource {id: mediaSourceId})
        CREATE (r)-[:EXTRACTED_FROM {
          confidence: $confidence,
          extractedAt: datetime()
        }]->(m)
        
        RETURN r, source, target
      `,
        {
          id: relationshipId,
          uuid: relationshipUuid,
          sourceId: relationshipData.sourceId,
          targetId: relationshipData.targetId,
          type: relationshipData.type,
          label: relationshipData.label || relationshipData.type,
          description: relationshipData.description || null,
          properties: relationshipData.properties || {},
          weight: relationshipData.weight || 1.0,
          confidence: relationshipData.confidence,
          confidenceLevel,
          validFrom: relationshipData.validFrom || null,
          validTo: relationshipData.validTo || null,
          extractionMethod: relationshipData.extractionMethod,
          spatialContext: relationshipData.spatialContext || [],
          temporalContext: relationshipData.temporalContext || [],
          createdBy: userId,
          mediaSourceIds: relationshipData.extractedFrom || [],
        },
      );

      return this.formatMultimodalRelationship(result.records[0]);
    } finally {
      await session.close();
    }
  }

  /**
   * Start extraction job for media source
   */
  async startExtractionJob(jobData, userId) {
    const session = this.driver.session();

    try {
      const jobId = uuidv4();

      // Validate extraction methods
      const validMethods = jobData.extractionMethods.filter((method) =>
        this.extractors.has(method),
      );

      if (validMethods.length === 0) {
        throw new Error("No valid extraction methods specified");
      }

      const result = await session.run(
        `
        CREATE (j:ExtractionJob {
          id: $id,
          mediaSourceId: $mediaSourceId,
          extractionMethods: $extractionMethods,
          status: 'PENDING',
          progress: 0.0,
          startedAt: null,
          completedAt: null,
          duration: null,
          entitiesExtracted: 0,
          relationshipsExtracted: 0,
          errors: [],
          warnings: [],
          createdBy: $createdBy,
          createdAt: datetime(),
          processingParams: $processingParams
        })
        
        WITH j
        MATCH (m:MediaSource {id: $mediaSourceId})
        CREATE (j)-[:PROCESSES]->(m)
        
        WITH j
        MATCH (i:Investigation {id: $investigationId})
        CREATE (j)-[:FOR_INVESTIGATION]->(i)
        
        RETURN j
      `,
        {
          id: jobId,
          mediaSourceId: jobData.mediaSourceId,
          extractionMethods: validMethods,
          createdBy: userId,
          investigationId: jobData.investigationId,
          processingParams: jobData.processingParams || {},
        },
      );

      // Start processing asynchronously
      setTimeout(() => this.processExtractionJob(jobId), 100);

      return this.formatExtractionJob(result.records[0].get("j").properties);
    } finally {
      await session.close();
    }
  }

  /**
   * Process extraction job
   */
  async processExtractionJob(jobId) {
    const session = this.driver.session();

    try {
      // Update job status to IN_PROGRESS
      await session.run(
        `
        MATCH (j:ExtractionJob {id: $jobId})
        SET j.status = 'IN_PROGRESS',
            j.startedAt = datetime(),
            j.progress = 0.1
      `,
        { jobId },
      );

      // Get job details
      const jobResult = await session.run(
        `
        MATCH (j:ExtractionJob {id: $jobId})-[:PROCESSES]->(m:MediaSource)
        MATCH (j)-[:FOR_INVESTIGATION]->(i:Investigation)
        RETURN j, m, i
      `,
        { jobId },
      );

      if (jobResult.records.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }

      const job = jobResult.records[0].get("j").properties;
      const mediaSource = jobResult.records[0].get("m").properties;
      const investigation = jobResult.records[0].get("i").properties;

      let totalEntities = 0;
      let totalRelationships = 0;
      const errors = [];
      const warnings = [];

      // Process each extraction method
      for (const method of job.extractionMethods) {
        try {
          const extractor = this.extractors.get(method);

          // Simulate extraction (in real implementation, call actual extraction services)
          const extractionResults = await this.simulateExtraction(
            mediaSource,
            method,
            extractor,
            investigation.id,
          );

          totalEntities += extractionResults.entities.length;
          totalRelationships += extractionResults.relationships.length;

          // Update progress
          const progress = Math.min(
            0.9,
            0.1 +
              (0.8 * (job.extractionMethods.indexOf(method) + 1)) /
                job.extractionMethods.length,
          );
          await session.run(
            `
            MATCH (j:ExtractionJob {id: $jobId})
            SET j.progress = $progress
          `,
            { jobId, progress },
          );
        } catch (error) {
          errors.push({
            code: "EXTRACTION_FAILED",
            message: error.message,
            severity: "ERROR",
            timestamp: new Date().toISOString(),
            context: { method },
          });
        }
      }

      // Complete the job
      await session.run(
        `
        MATCH (j:ExtractionJob {id: $jobId})
        SET j.status = 'COMPLETED',
            j.completedAt = datetime(),
            j.duration = duration.inSeconds(datetime(), j.startedAt).seconds * 1000,
            j.progress = 1.0,
            j.entitiesExtracted = $entitiesExtracted,
            j.relationshipsExtracted = $relationshipsExtracted,
            j.errors = $errors,
            j.warnings = $warnings
      `,
        {
          jobId,
          entitiesExtracted: totalEntities,
          relationshipsExtracted: totalRelationships,
          errors,
          warnings,
        },
      );
    } catch (error) {
      // Mark job as failed
      await session.run(
        `
        MATCH (j:ExtractionJob {id: $jobId})
        SET j.status = 'FAILED',
            j.completedAt = datetime(),
            j.errors = j.errors + [{
              code: 'JOB_FAILED',
              message: $errorMessage,
              severity: 'CRITICAL',
              timestamp: $timestamp
            }]
      `,
        {
          jobId,
          errorMessage: error.message,
          timestamp: new Date().toISOString(),
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Simulate extraction results (placeholder for actual extraction)
   */
  async simulateExtraction(mediaSource, method, extractor, investigationId) {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const entities = [];
    const relationships = [];

    // Generate mock entities based on media type and extraction method
    if (mediaSource.mediaType === "TEXT" && method.includes("NLP")) {
      entities.push({
        type: "PERSON",
        label: "Extracted Person",
        confidence: extractor.confidence,
        properties: { source: "text_extraction" },
        extractionMethod: method,
        extractedFrom: [mediaSource.id],
        investigationId,
      });
    }

    if (mediaSource.mediaType === "IMAGE" && method === "COMPUTER_VISION") {
      entities.push({
        type: "VEHICLE",
        label: "Detected Vehicle",
        confidence: extractor.confidence,
        properties: { color: "blue", type: "sedan" },
        extractionMethod: method,
        extractedFrom: [mediaSource.id],
        boundingBoxes: [
          {
            mediaSourceId: mediaSource.id,
            x: 0.2,
            y: 0.3,
            width: 0.4,
            height: 0.3,
            confidence: 0.85,
          },
        ],
        investigationId,
      });
    }

    return { entities, relationships };
  }

  /**
   * Find cross-modal matches for an entity
   */
  async findCrossModalMatches(entityId, targetMediaTypes = null) {
    const session = this.driver.session();

    try {
      // Get entity details
      const entityResult = await session.run(
        `
        MATCH (e:MultimodalEntity {id: $entityId})
        RETURN e
      `,
        { entityId },
      );
      // Defensive: handle undefined or empty results in test/mocked environments
      if (
        !entityResult ||
        !entityResult.records ||
        entityResult.records.length === 0
      ) {
        return [];
      }

      const entity = entityResult.records[0].get("e").properties;
      const matches = [];

      // Find potential matches based on label similarity and type
      const candidatesResult = await session.run(
        `
        MATCH (e1:MultimodalEntity {id: $entityId})
        MATCH (e2:MultimodalEntity)
        WHERE e1 <> e2 
        AND e1.type = e2.type
        AND e1.label CONTAINS e2.label OR e2.label CONTAINS e1.label
        
        OPTIONAL MATCH (e1)-[:EXTRACTED_FROM]->(m1:MediaSource)
        OPTIONAL MATCH (e2)-[:EXTRACTED_FROM]->(m2:MediaSource)
        
        WITH e1, e2, m1.mediaType as sourceType, m2.mediaType as targetType
        WHERE sourceType <> targetType
        ${targetMediaTypes ? "AND targetType IN $targetMediaTypes" : ""}
        
        RETURN e2, sourceType, targetType
        LIMIT 10
      `,
        {
          entityId,
          targetMediaTypes,
        },
      );

      // Calculate similarity and create cross-modal matches
      const candidateRecords =
        candidatesResult && candidatesResult.records
          ? candidatesResult.records
          : [];
      for (const record of candidateRecords) {
        const candidate = record.get("e2").properties;
        const sourceType = record.get("sourceType");
        const targetType = record.get("targetType");

        const similarity = this.calculateSimilarity(entity, candidate);

        if (similarity >= this.qualityThresholds.crossModalThreshold) {
          const matchId = uuidv4();

          await session.run(
            `
            CREATE (c:CrossModalMatch {
              id: $matchId,
              matchedEntityId: $candidateId,
              sourceMediaType: $sourceType,
              targetMediaType: $targetType,
              similarity: $similarity,
              matchingFeatures: $matchingFeatures,
              confidence: $confidence,
              algorithm: 'label_similarity',
              computedAt: datetime()
            })
            
            WITH c
            MATCH (e:MultimodalEntity {id: $entityId})
            CREATE (e)-[:HAS_CROSS_MODAL_MATCH]->(c)
          `,
            {
              matchId,
              entityId,
              candidateId: candidate.id,
              sourceType,
              targetType,
              similarity,
              matchingFeatures: ["label", "type"],
              confidence: similarity,
            },
          );

          matches.push({
            id: matchId,
            matchedEntityId: candidate.id,
            similarity,
            confidence: similarity,
          });
        }
      }

      return matches;
    } finally {
      await session.close();
    }
  }

  /**
   * Multimodal search across entities
   */
  async multimodalSearch(searchInput) {
    const session = this.driver.session();

    try {
      const cypher = `
        CALL db.index.fulltext.queryNodes("multimodalEntitySearch", $query)
        YIELD node, score
        
        MATCH (node:MultimodalEntity)
        WHERE ($minConfidence IS NULL OR node.confidence >= $minConfidence)
        ${searchInput.mediaTypes ? "AND EXISTS { MATCH (node)-[:EXTRACTED_FROM]->(m:MediaSource) WHERE m.mediaType IN $mediaTypes }" : ""}
        ${searchInput.entityTypes ? "AND node.type IN $entityTypes" : ""}
        ${searchInput.investigationId ? "AND EXISTS { MATCH (node)-[:BELONGS_TO]->(:Investigation {id: $investigationId}) }" : ""}
        
        WITH node, score
        ORDER BY score DESC
        LIMIT $limit
        
        OPTIONAL MATCH (node)-[:EXTRACTED_FROM]->(m:MediaSource)
        OPTIONAL MATCH (node)-[:HAS_CROSS_MODAL_MATCH]->(c:CrossModalMatch)
        
        RETURN node, collect(DISTINCT m) as mediaSources, collect(DISTINCT c) as crossModalMatches
      `;

      const result = await session.run(cypher, {
        query: searchInput.query,
        minConfidence: searchInput.minConfidence || null,
        mediaTypes: searchInput.mediaTypes || null,
        entityTypes: searchInput.entityTypes || null,
        investigationId: searchInput.investigationId || null,
        limit: searchInput.limit || 50,
      });

      const entities = result.records.map((record) => {
        const entity = this.formatMultimodalEntity(
          record.get("node").properties,
        );
        entity.mediaSources = record
          .get("mediaSources")
          .map((m) => this.formatMediaSource(m.properties));
        entity.crossModalMatches = record
          .get("crossModalMatches")
          .map((c) => this.formatCrossModalMatch(c.properties));
        return entity;
      });

      return {
        entities,
        relationships: [], // TODO: Add relationship search
        mediaSources: [],
        crossModalMatches: [],
        totalCount: entities.length,
        searchTime: 0,
        qualityScore: 1.0,
      };
    } finally {
      await session.close();
    }
  }

  // Helper methods

  determineConfidenceLevel(confidence) {
    if (confidence >= 0.9) return "VERY_HIGH";
    if (confidence >= 0.8) return "HIGH";
    if (confidence >= 0.6) return "MEDIUM";
    if (confidence >= 0.4) return "LOW";
    return "VERY_LOW";
  }

  calculateSimilarity(entity1, entity2) {
    // Simple label similarity (in production, use more sophisticated algorithms)
    const label1 = entity1.label.toLowerCase();
    const label2 = entity2.label.toLowerCase();

    if (label1 === label2) return 1.0;
    if (label1.includes(label2) || label2.includes(label1)) return 0.8;

    // Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(label1, label2);
    const maxLength = Math.max(label1.length, label2.length);
    return 1 - distance / maxLength;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  generateChecksum(content) {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  async createExtractionProvenance(entityId, entityData, userId) {
    const session = this.driver.session();

    try {
      const provenanceId = uuidv4();
      const extractor = this.extractors.get(entityData.extractionMethod);

      await session.run(
        `
        CREATE (p:ExtractionProvenance {
          id: $id,
          extractorName: $extractorName,
          extractorVersion: $extractorVersion,
          modelName: $modelName,
          modelVersion: $modelVersion,
          extractionMethod: $extractionMethod,
          processingParams: $processingParams,
          confidence: $confidence,
          processedAt: datetime(),
          processingDuration: 1000.0,
          errors: [],
          warnings: []
        })
        
        WITH p
        MATCH (e:MultimodalEntity {id: $entityId})
        CREATE (e)-[:HAS_PROVENANCE]->(p)
      `,
        {
          id: provenanceId,
          entityId,
          extractorName: extractor ? extractor.name : "Unknown",
          extractorVersion: extractor ? extractor.version : "1.0.0",
          modelName: null,
          modelVersion: null,
          extractionMethod: entityData.extractionMethod,
          processingParams: {},
          confidence: entityData.confidence,
        },
      );
    } finally {
      await session.close();
    }
  }

  // Formatting methods
  formatMediaSource(properties) {
    return {
      id: properties.id,
      uri: properties.uri,
      mediaType: properties.mediaType,
      mimeType: properties.mimeType,
      filename: properties.filename,
      filesize: properties.filesize,
      quality: properties.quality,
      uploadedAt: properties.uploadedAt,
    };
  }

  formatMultimodalEntity(properties) {
    return {
      id: properties.id,
      uuid: properties.uuid,
      type: properties.type,
      label: properties.label,
      confidence: properties.confidence,
      confidenceLevel: properties.confidenceLevel,
      extractionMethod: properties.extractionMethod,
      verified: properties.verified,
      createdAt: properties.createdAt,
      updatedAt: properties.updatedAt,
    };
  }

  formatMultimodalRelationship(record) {
    const rel = record.get("r").properties;
    return {
      id: rel.id,
      uuid: rel.uuid,
      type: rel.type,
      label: rel.label,
      confidence: rel.confidence,
      confidenceLevel: rel.confidenceLevel,
      extractionMethod: rel.extractionMethod,
      verified: rel.verified,
      createdAt: rel.createdAt,
    };
  }

  formatExtractionJob(properties) {
    return {
      id: properties.id,
      mediaSourceId: properties.mediaSourceId,
      extractionMethods: properties.extractionMethods,
      status: properties.status,
      progress: properties.progress,
      entitiesExtracted: properties.entitiesExtracted,
      relationshipsExtracted: properties.relationshipsExtracted,
    };
  }

  formatCrossModalMatch(properties) {
    return {
      id: properties.id,
      matchedEntityId: properties.matchedEntityId,
      similarity: properties.similarity,
      confidence: properties.confidence,
      sourceMediaType: properties.sourceMediaType,
      targetMediaType: properties.targetMediaType,
    };
  }
}

export default MultimodalDataService;
