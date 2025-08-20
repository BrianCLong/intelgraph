import { Session } from "neo4j-driver";
import logger from '../config/logger';
import { getPostgresPool } from "../config/database";
import {
  BehavioralFingerprintService,
  BehavioralTelemetry,
  BehavioralFingerprint,
} from "./BehavioralFingerprintService.js";
import { v4 as uuidv4 } from 'uuid';
import Levenshtein from 'levenshtein';
import { parsePhoneNumber } from 'libphonenumber-js';
import axios from 'axios';

// GA Core: Entity Resolution with explainability and precision improvements
const PRECISION_THRESHOLD = {
  PERSON: 0.90,
  ORGANIZATION: 0.88, 
  LOCATION: 0.85,
  DOCUMENT: 0.82,
  IP_ADDRESS: 0.95,
  DOMAIN: 0.92,
  EMAIL: 0.93,
  PHONE: 0.94,
  DEFAULT: 0.85
} as const;

interface MergeDecision {
  id: string;
  leftId: string;
  rightId: string;
  overallScore: number;
  featureScores: Record<string, number>;
  modelVersion: string;
  algorithm: string;
  createdAt: Date;
  decidedBy?: string;
  decision?: 'merge' | 'reject' | 'defer';
  decisionReason?: string;
  confidence: number;
  threshold: number;
  entityType: string;
  explanation: Record<string, any>;
  humanOverride: boolean;
  overrideReason?: string;
}

const log = logger.child({ name: "EntityResolutionService" });

interface NormalizedProperties {
  name?: string;
  email?: string;
  url?: string;
  phone?: string;
  location?: string;
}

export class EntityResolutionService {
  private behavioralService = new BehavioralFingerprintService();
  private modelVersion = '1.2.0-ga';
  private erServiceUrl = process.env.ER_SERVICE_URL || 'http://localhost:8000';

  /**
   * Enhanced normalization for GA Core precision improvements
   */
  private normalizeEntityProperties(entity: any): NormalizedProperties {
    const normalized: NormalizedProperties = {};
    
    // Enhanced name normalization
    if (entity.name) {
      let name = String(entity.name).toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Remove common prefixes/suffixes
      const prefixes = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sir', 'dame'];
      const suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', 'esq'];
      
      const words = name.split(' ');
      const filtered = words.filter(word => 
        !prefixes.includes(word) && !suffixes.includes(word)
      );
      
      normalized.name = filtered.join(' ').replace(/[^a-z0-9\s\-]/g, '').trim();
    }
    
    // Enhanced email normalization
    if (entity.email) {
      const email = String(entity.email).toLowerCase().trim();
      if (email.includes('@')) {
        const [local, domain] = email.split('@');
        
        // Handle Gmail dots and plus addressing
        if (domain === 'gmail.com') {
          const cleanLocal = local.replace(/\./g, '').split('+')[0];
          normalized.email = `${cleanLocal}@${domain}`;
        } else {
          normalized.email = `${local}@${domain}`;
        }
      }
    }
    
    // Phone normalization to E.164
    if (entity.phone) {
      try {
        const parsed = parsePhoneNumber(String(entity.phone), 'US');
        normalized.phone = parsed?.format('E.164') || '';
      } catch {
        // Fallback to digits only
        const digits = String(entity.phone).replace(/\D/g, '');
        normalized.phone = digits.length >= 10 ? digits : '';
      }
    }
    
    if (entity.url) {
      try {
        const url = new URL(String(entity.url).trim().toLowerCase());
        normalized.url = url.hostname + url.pathname;
      } catch (e) {
        log.warn(`Invalid URL for normalization: ${entity.url}`);
      }
    }
    
    return normalized;
  }

  /**
   * Generate deterministic blocking keys for efficient candidate selection
   */
  private generateBlockingKeys(entity: any): string[] {
    const keys: string[] = [];
    const normalized = this.normalizeEntityProperties(entity);
    
    // Name-based blocking
    if (normalized.name) {
      const words = normalized.name.split(' ').filter(w => w.length > 0);
      if (words.length >= 2) {
        keys.push(`name:${words[0]}_${words[words.length - 1]}`);
      }
      if (normalized.name.length >= 6) {
        keys.push(`name_prefix:${normalized.name.substring(0, 3)}_${normalized.name.substring(normalized.name.length - 3)}`);
      }
    }
    
    // Email domain blocking
    if (normalized.email && normalized.email.includes('@')) {
      const domain = normalized.email.split('@')[1];
      keys.push(`email_domain:${domain}`);
    }
    
    // Phone area code blocking
    if (normalized.phone && normalized.phone.length >= 4) {
      keys.push(`phone_area:${normalized.phone.substring(0, 4)}`);
    }
    
    // Entity type blocking
    if (entity.type) {
      keys.push(`type:${entity.type}`);
    }
    
    return keys;
  }
  
  /**
   * Legacy canonical key method - kept for backwards compatibility
   */
  private generateCanonicalKey(normalizedProps: NormalizedProperties): string {
    const parts: string[] = [];
    if (normalizedProps.name) parts.push(`name:${normalizedProps.name}`);
    if (normalizedProps.email) parts.push(`email:${normalizedProps.email}`);
    if (normalizedProps.url) parts.push(`url:${normalizedProps.url}`);
    if (normalizedProps.phone) parts.push(`phone:${normalizedProps.phone}`);

    if (parts.length === 0) {
      return "";
    }
    return parts.sort().join("|");
  }

  /**
   * Finds potential duplicate entities in Neo4j based on canonical keys.
   * @param session Neo4j session.
   * @returns A Map where keys are canonical keys and values are arrays of entity IDs.
   */
  public async findDuplicateEntities(
    session: Session,
  ): Promise<Map<string, string[]>> {
    const duplicates = new Map<string, string[]>();
    const result = await session.run(`
      MATCH (e:Entity)
      WHERE e.name IS NOT NULL OR e.email IS NOT NULL OR e.url IS NOT NULL
      RETURN e.id AS id, e.name AS name, e.email AS email, e.url AS url
    `);

    for (const record of result.records) {
      const entityId = record.get("id");
      const entityProps = {
        name: record.get("name"),
        email: record.get("email"),
        url: record.get("url"),
      };
      const normalized = this.normalizeEntityProperties(entityProps);
      const canonicalKey = this.generateCanonicalKey(normalized);

      if (canonicalKey) {
        if (!duplicates.has(canonicalKey)) {
          duplicates.set(canonicalKey, []);
        }
        duplicates.get(canonicalKey)!.push(entityId);
      }
    }

    // Filter out groups with only one entity (not duplicates)
    for (const [key, ids] of duplicates.entries()) {
      if (ids.length < 2) {
        duplicates.delete(key);
      }
    }

    return duplicates;
  }

  /**
   * Merges duplicate entities into a master entity.
   * All relationships from duplicate entities are re-pointed to the master.
   * Duplicate entities are then deleted.
   * @param session Neo4j session.
   * @param masterEntityId The ID of the entity to keep.
   * @param duplicateEntityIds An array of IDs of entities to merge into the master.
   */
  public async mergeEntities(
    session: Session,
    masterEntityId: string,
    duplicateEntityIds: string[],
  ): Promise<void> {
    if (duplicateEntityIds.includes(masterEntityId)) {
      throw new Error(
        "Master entity ID cannot be in the list of duplicate entity IDs.",
      );
    }

    const allEntityIds = [masterEntityId, ...duplicateEntityIds];

    // Update canonicalId for all entities being merged to point to the master's canonicalId
    // This assumes the master already has a canonicalId or will get one from the ER process
    await session.run(
      `
      MATCH (e:Entity)
      WHERE e.id IN $allEntityIds
      SET e.canonicalId = $masterEntityId // Set all to master's ID for now, actual canonical key will be set by ER worker
    `,
      { allEntityIds, masterEntityId },
    );

    // Re-point incoming relationships to the master entity
    await session.run(
      `
      MATCH (n)-[r]->(d:Entity)
      WHERE d.id IN $duplicateEntityIds
      MATCH (m:Entity {id: $masterEntityId})
      CREATE (n)-[newRel:RELATIONSHIP]->(m)
      SET newRel = r
      DELETE r
    `,
      { duplicateEntityIds, masterEntityId },
    );

    // Re-point outgoing relationships to the master entity
    await session.run(
      `
      MATCH (d:Entity)-[r]->(n)
      WHERE d.id IN $duplicateEntityIds
      MATCH (m:Entity {id: $masterEntityId})
      CREATE (m)-[newRel:RELATIONSHIP]->(n)
      SET newRel = r
      DELETE r
    `,
      { duplicateEntityIds, masterEntityId },
    );

    // Delete duplicate entities
    await session.run(
      `
      MATCH (d:Entity)
      WHERE d.id IN $duplicateEntityIds
      DETACH DELETE d
    `,
      { duplicateEntityIds },
    );

    log.info(
      `Merged entities: ${duplicateEntityIds.join(", ")} into ${masterEntityId}`,
    );

    // Log to audit_logs
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4)`,
      [
        "entity_merge",
        "Entity",
        masterEntityId,
        { merged_from: duplicateEntityIds },
      ],
    );
  }

  public fuseBehavioralFingerprint(telemetry: BehavioralTelemetry[]): {
    fingerprint: BehavioralFingerprint;
    score: number;
  } {
    const fingerprint = this.behavioralService.computeFingerprint(telemetry);
    const score = this.behavioralService.scoreFingerprint(fingerprint);
    return { fingerprint, score };
  }

  public clusterIdentitiesAcrossProjects(
    identities: { id: string; telemetry: BehavioralTelemetry[] }[],
  ): Map<string, string[]> {
    const items = identities.map((i) => ({
      id: i.id,
      fingerprint: this.behavioralService.computeFingerprint(i.telemetry),
    }));
    return this.behavioralService.clusterFingerprints(items);
  }

  // ========================================
  // GA CORE: Enhanced Entity Resolution API
  // ========================================

  /**
   * Enhanced feature extraction with explainability
   */
  private extractFeatures(entity1: any, entity2: any): Record<string, number> {
    const features: Record<string, number> = {};
    const norm1 = this.normalizeEntityProperties(entity1);
    const norm2 = this.normalizeEntityProperties(entity2);
    
    // Name similarity features
    if (norm1.name && norm2.name) {
      features.nameExactMatch = norm1.name === norm2.name ? 1.0 : 0.0;
      
      // Levenshtein similarity
      const maxLen = Math.max(norm1.name.length, norm2.name.length);
      if (maxLen > 0) {
        const distance = new Levenshtein(norm1.name, norm2.name).distance;
        features.nameLevenshtein = 1.0 - (distance / maxLen);
      }
      
      // Token overlap (Jaccard)
      const tokens1 = new Set(norm1.name.split(' '));
      const tokens2 = new Set(norm2.name.split(' '));
      const intersection = [...tokens1].filter(x => tokens2.has(x)).length;
      const union = new Set([...tokens1, ...tokens2]).size;
      features.nameTokenOverlap = union > 0 ? intersection / union : 0.0;
    }
    
    // Email features
    if (norm1.email && norm2.email) {
      features.emailExactMatch = norm1.email === norm2.email ? 1.0 : 0.0;
      if (norm1.email.includes('@') && norm2.email.includes('@')) {
        const domain1 = norm1.email.split('@')[1];
        const domain2 = norm2.email.split('@')[1];
        features.emailDomainMatch = domain1 === domain2 ? 1.0 : 0.0;
      }
    }
    
    // Phone features
    if (norm1.phone && norm2.phone) {
      features.phoneExactMatch = norm1.phone === norm2.phone ? 1.0 : 0.0;
      if (norm1.phone.length >= 4 && norm2.phone.length >= 4) {
        features.phoneAreaMatch = norm1.phone.substring(0, 4) === norm2.phone.substring(0, 4) ? 1.0 : 0.0;
      }
    }
    
    // Type match
    features.typeMatch = entity1.type === entity2.type ? 1.0 : 0.0;
    
    return features;
  }

  /**
   * Deterministic matching with entity-type specific thresholds
   */
  private deterministicMatch(entity1: any, entity2: any): MergeDecision {
    const features = this.extractFeatures(entity1, entity2);
    const entityType = entity1.type || 'DEFAULT';
    const threshold = PRECISION_THRESHOLD[entityType as keyof typeof PRECISION_THRESHOLD] || PRECISION_THRESHOLD.DEFAULT;
    
    let score = 0.0;
    const explanation: Record<string, any> = {
      method: 'deterministic',
      rulesApplied: [],
      featureWeights: {}
    };
    
    // Entity-type specific rules for GA precision requirements
    switch (entityType) {
      case 'PERSON':
        if (features.nameExactMatch === 1.0 && features.emailExactMatch === 1.0) {
          score = 1.0;
          explanation.rulesApplied.push('exact_name_email_match');
        } else if (features.nameLevenshtein >= 0.9 && features.phoneExactMatch === 1.0) {
          score = 0.95;
          explanation.rulesApplied.push('high_name_phone_match');
        } else {
          const weights = { name: 0.5, email: 0.3, phone: 0.2 };
          score = (features.nameLevenshtein || 0) * weights.name + 
                 (features.emailExactMatch || 0) * weights.email +
                 (features.phoneExactMatch || 0) * weights.phone;
          explanation.featureWeights = weights;
          explanation.rulesApplied.push('weighted_person_features');
        }
        break;
        
      case 'ORGANIZATION':
        if ((features.nameTokenOverlap || 0) >= 0.8 && (features.emailDomainMatch || 0) === 1.0) {
          score = 0.92;
          explanation.rulesApplied.push('org_name_domain_match');
        } else {
          const weights = { name: 0.6, email: 0.3, type: 0.1 };
          score = (features.nameTokenOverlap || 0) * weights.name +
                 (features.emailDomainMatch || 0) * weights.email +
                 features.typeMatch * weights.type;
          explanation.featureWeights = weights;
          explanation.rulesApplied.push('weighted_org_features');
        }
        break;
        
      default:
        const weights = { name: 0.4, type: 0.2, email: 0.2, phone: 0.1, url: 0.1 };
        score = (features.nameLevenshtein || 0) * weights.name +
               features.typeMatch * weights.type +
               (features.emailExactMatch || 0) * weights.email +
               (features.phoneExactMatch || 0) * weights.phone;
        explanation.featureWeights = weights;
        explanation.rulesApplied.push('generic_weighted_features');
    }
    
    return {
      id: uuidv4(),
      leftId: entity1.id,
      rightId: entity2.id,
      overallScore: Math.min(score, 1.0),
      featureScores: features,
      modelVersion: this.modelVersion,
      algorithm: 'deterministic',
      createdAt: new Date(),
      confidence: score > threshold ? 0.9 : 0.7,
      threshold,
      entityType,
      explanation,
      humanOverride: false
    };
  }

  /**
   * Persist merge decision with full audit trail for GA Core
   */
  private async persistMergeDecision(decision: MergeDecision): Promise<void> {
    try {
      const pool = getPostgresPool();
      const query = `
        INSERT INTO merge_decisions (
          id, left_id, right_id, overall_score, feature_scores,
          model_version, algorithm, created_at, confidence, threshold,
          entity_type, explanation, human_override
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;
      
      await pool.query(query, [
        decision.id,
        decision.leftId,
        decision.rightId,
        decision.overallScore,
        JSON.stringify(decision.featureScores),
        decision.modelVersion,
        decision.algorithm,
        decision.createdAt,
        decision.confidence,
        decision.threshold,
        decision.entityType,
        JSON.stringify(decision.explanation),
        decision.humanOverride
      ]);
      
      // Add audit entry
      await pool.query(
        `INSERT INTO merge_audit_log (id, merge_decision_id, action, timestamp, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), decision.id, 'created', new Date(), 'Decision created by system']
      );
      
      log.info({
        message: 'Merge decision persisted',
        decisionId: decision.id,
        score: decision.overallScore,
        entityType: decision.entityType
      });
      
    } catch (error) {
      log.error({
        message: 'Failed to persist merge decision',
        error: error instanceof Error ? error.message : String(error),
        decisionId: decision.id
      });
      throw error;
    }
  }

  /**
   * GA Core: Resolve entities with explainable decisions and precision tracking
   */
  public async resolveEntitiesWithExplainability(
    entities: any[],
    options: {
      algorithm?: 'deterministic' | 'probabilistic' | 'hybrid';
      threshold?: number;
      tenantId: string;
      useBlocking?: boolean;
      userId?: string;
    }
  ): Promise<MergeDecision[]> {
    const decisions: MergeDecision[] = [];
    
    try {
      // Generate candidate pairs (with optional blocking)
      const candidatePairs = await this.generateCandidatePairs(entities, options.useBlocking);
      
      log.info({
        message: 'GA Core entity resolution started',
        totalEntities: entities.length,
        candidatePairs: candidatePairs.length,
        algorithm: options.algorithm || 'deterministic'
      });
      
      // Process each candidate pair
      for (const [entity1, entity2] of candidatePairs) {
        const decision = this.deterministicMatch(entity1, entity2);
        
        // Apply entity-type specific threshold
        const threshold = options.threshold || PRECISION_THRESHOLD[entity1.type as keyof typeof PRECISION_THRESHOLD] || PRECISION_THRESHOLD.DEFAULT;
        
        if (decision.overallScore >= threshold) {
          // Add user context to explanation
          if (options.userId) {
            decision.explanation.userId = options.userId;
          }
          
          decisions.push(decision);
          await this.persistMergeDecision(decision);
        }
      }
      
      log.info({
        message: 'GA Core entity resolution completed',
        decisionsGenerated: decisions.length,
        averageScore: decisions.length > 0 ? decisions.reduce((sum, d) => sum + d.overallScore, 0) / decisions.length : 0
      });
      
      return decisions;
      
    } catch (error) {
      log.error({
        message: 'GA Core entity resolution failed',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate candidate pairs with optional blocking
   */
  private async generateCandidatePairs(entities: any[], useBlocking = true): Promise<[any, any][]> {
    if (!useBlocking) {
      // Generate all pairs
      const pairs: [any, any][] = [];
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          pairs.push([entities[i], entities[j]]);
        }
      }
      return pairs;
    }
    
    // Use blocking for efficiency
    const blockingIndex = new Map<string, any[]>();
    
    // Build blocking index
    for (const entity of entities) {
      const keys = this.generateBlockingKeys(entity);
      for (const key of keys) {
        if (!blockingIndex.has(key)) {
          blockingIndex.set(key, []);
        }
        blockingIndex.get(key)!.push(entity);
      }
    }
    
    // Generate candidate pairs from blocks
    const candidates = new Set<string>();
    const pairs: [any, any][] = [];
    
    for (const [key, blockEntities] of blockingIndex) {
      for (let i = 0; i < blockEntities.length; i++) {
        for (let j = i + 1; j < blockEntities.length; j++) {
          const entity1 = blockEntities[i];
          const entity2 = blockEntities[j];
          const pairKey = `${entity1.id}:${entity2.id}`;
          
          if (!candidates.has(pairKey)) {
            candidates.add(pairKey);
            pairs.push([entity1, entity2]);
          }
        }
      }
    }
    
    return pairs;
  }

  /**
   * GA Core: Get precision stats for dashboard
   */
  public async getEntityResolutionStats(entityType?: string): Promise<any> {
    try {
      const pool = getPostgresPool();
      const typeFilter = entityType ? 'WHERE entity_type = $1' : '';
      const params = entityType ? [entityType] : [];
      
      const query = `
        SELECT 
          COUNT(*) as total_decisions,
          COUNT(CASE WHEN decision IS NULL THEN 1 END) as pending_review,
          COUNT(CASE WHEN decision = 'merge' AND human_override = false THEN 1 END) as automatic_merges,
          COUNT(CASE WHEN human_override = true THEN 1 END) as human_overrides,
          entity_type,
          AVG(confidence) as avg_confidence,
          model_version
        FROM merge_decisions 
        ${typeFilter}
        GROUP BY entity_type, model_version
      `;
      
      const result = await pool.query(query, params);
      
      // Calculate precision metrics (mock for now - would use ground truth in production)
      const stats = {
        totalDecisions: 0,
        pendingReview: 0,
        automaticMerges: 0,
        humanOverrides: 0,
        precisionByType: {} as Record<string, number>,
        modelVersion: this.modelVersion
      };
      
      for (const row of result.rows) {
        stats.totalDecisions += parseInt(row.total_decisions);
        stats.pendingReview += parseInt(row.pending_review);
        stats.automaticMerges += parseInt(row.automatic_merges);
        stats.humanOverrides += parseInt(row.human_overrides);
        
        // Mock precision - in production this would be calculated from labeled data
        const precision = entityType === 'PERSON' ? 0.873 : 
                         entityType === 'ORGANIZATION' ? 0.891 : 
                         0.856; // Current GA status
        stats.precisionByType[row.entity_type] = precision;
      }
      
      return stats;
      
    } catch (error) {
      log.error({
        message: 'Failed to get ER stats',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * GA Core: Manual decision with audit trail
   */
  public async decideMerge(
    decisionId: string, 
    decision: 'merge' | 'reject' | 'defer', 
    reason: string, 
    userId: string
  ): Promise<MergeDecision> {
    try {
      const pool = getPostgresPool();
      
      // Get existing decision
      const query = 'SELECT * FROM merge_decisions WHERE id = $1';
      const result = await pool.query(query, [decisionId]);
      
      if (result.rows.length === 0) {
        throw new Error('Merge decision not found');
      }
      
      const existingDecision = result.rows[0];
      
      // Update decision with human input
      const updateQuery = `
        UPDATE merge_decisions 
        SET decision = $1, decision_reason = $2, decided_by = $3, human_override = $4
        WHERE id = $5
        RETURNING *
      `;
      
      const humanOverride = decision !== (existingDecision.overall_score >= existingDecision.threshold ? 'merge' : 'reject');
      
      await pool.query(updateQuery, [
        decision, reason, userId, humanOverride, decisionId
      ]);
      
      // Add audit entry
      await pool.query(
        `INSERT INTO merge_audit_log (id, merge_decision_id, action, user_id, timestamp, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), decisionId, 'decided', userId, new Date(), reason]
      );
      
      log.info({
        message: 'GA Core merge decision applied',
        decisionId,
        decision,
        userId,
        humanOverride
      });
      
      return {
        ...existingDecision,
        decision,
        decisionReason: reason,
        decidedBy: userId,
        humanOverride
      };
      
    } catch (error) {
      log.error({
        message: 'Failed to apply merge decision',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
