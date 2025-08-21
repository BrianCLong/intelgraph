import path from "path";
import { PythonShell } from "python-shell";
import { Session } from "neo4j-driver";
import logger from '../config/logger';
import { v4 as uuidv4 } from "uuid";
import { EntityResolutionService } from "./EntityResolutionService";
import { getPostgresPool } from "../config/database";

const log = logger.child({ name: "HybridEntityResolutionService" });

// GA Core precision targets from CLAUDE.md
const GA_PRECISION_THRESHOLDS = {
  PERSON: 0.90,   // 90% precision required for GA
  ORG: 0.88,      // 88% precision required for GA  
  LOCATION: 0.85,
  ARTIFACT: 0.82
};

export interface ERServiceResult {
  version: string;
  score: number;
  match: boolean;
  explanation: Record<string, number>;
  traceId: string;
  confidence?: number;
  method?: 'deterministic' | 'ml' | 'clustering' | 'hybrid';
  riskScore?: number;
}

export interface MergeDecision {
  id: string;
  entityA: string;
  entityB: string;
  decision: 'MERGE' | 'NO_MERGE' | 'UNCERTAIN';
  score: number;
  explanation: {
    deterministic?: number;
    jaroWinkler?: number;
    phonetic?: number;
    semantic?: number;
    behavioral?: number;
  };
  riskScore: number;
  method: string;
  reviewRequired: boolean;
  createdAt: Date;
}

export class HybridEntityResolutionService {
  private legacyService = new EntityResolutionService();
  
  /**
   * Enhanced entity resolution with hybrid approach combining:
   * 1. Deterministic matching (exact/canonical)
   * 2. ML-based similarity scoring  
   * 3. HDBSCAN clustering for probabilistic matching
   * 4. Active learning for uncertain cases
   */
  async resolveEntitiesPair(
    entityA: any, 
    entityB: any,
    entityType: string = 'PERSON'
  ): Promise<ERServiceResult> {
    const traceId = uuidv4();
    const startTime = Date.now();
    
    try {
      // Step 1: Try deterministic matching first (fastest, highest precision)
      const deterministicResult = await this.deterministicMatch(entityA, entityB);
      if (deterministicResult.confidence > 0.95) {
        log.info({ traceId, method: 'deterministic', score: deterministicResult.score }, 'er_match_deterministic');
        return {
          ...deterministicResult,
          traceId,
          method: 'deterministic'
        };
      }
      
      // Step 2: ML-based similarity scoring
      const mlResult = await this.mlBasedMatch(entityA, entityB);
      const threshold = GA_PRECISION_THRESHOLDS[entityType as keyof typeof GA_PRECISION_THRESHOLDS] || 0.85;
      
      if (mlResult.confidence > threshold) {
        log.info({ traceId, method: 'ml', score: mlResult.score, confidence: mlResult.confidence }, 'er_match_ml');
        return {
          ...mlResult,
          traceId,
          method: 'ml'
        };
      }
      
      // Step 3: Clustering-based probabilistic matching for uncertain cases
      if (mlResult.confidence > 0.5 && mlResult.confidence < threshold) {
        const clusterResult = await this.clusterBasedMatch(entityA, entityB, entityType);
        if (clusterResult.confidence > threshold - 0.05) { // Slightly lower threshold for clustering
          log.info({ traceId, method: 'clustering', score: clusterResult.score }, 'er_match_clustering');
          return {
            ...clusterResult,
            traceId,
            method: 'clustering'
          };
        }
      }
      
      // Step 4: Hybrid decision with risk assessment
      const hybridResult = await this.hybridDecision(deterministicResult, mlResult, entityType);
      log.info({ 
        traceId, 
        method: 'hybrid', 
        score: hybridResult.score, 
        riskScore: hybridResult.riskScore 
      }, 'er_match_hybrid');
      
      return {
        ...hybridResult,
        traceId,
        method: 'hybrid'
      };
      
    } catch (error) {
      log.error({ traceId, error: error.message }, 'er_match_error');
      throw error;
    }
  }
  
  private async deterministicMatch(entityA: any, entityB: any): Promise<ERServiceResult> {
    // Exact email match
    if (entityA.email && entityB.email && 
        entityA.email.toLowerCase().trim() === entityB.email.toLowerCase().trim()) {
      return {
        version: '2.0-deterministic',
        score: 1.0,
        match: true,
        confidence: 0.98,
        explanation: { exactEmail: 1.0 },
        traceId: '',
        riskScore: 0.02
      };
    }
    
    // Exact name + additional identifier match
    const nameMatch = this.normalizeString(entityA.name) === this.normalizeString(entityB.name);
    const hasSecondaryMatch = (entityA.phone && entityB.phone && entityA.phone === entityB.phone) ||
                             (entityA.address && entityB.address && 
                              this.normalizeString(entityA.address) === this.normalizeString(entityB.address));
    
    if (nameMatch && hasSecondaryMatch) {
      return {
        version: '2.0-deterministic',
        score: 0.95,
        match: true,
        confidence: 0.96,
        explanation: { exactName: nameMatch ? 1.0 : 0, secondaryId: hasSecondaryMatch ? 1.0 : 0 },
        traceId: '',
        riskScore: 0.04
      };
    }
    
    return {
      version: '2.0-deterministic',
      score: 0.0,
      match: false,
      confidence: 0.0,
      explanation: {},
      traceId: '',
      riskScore: 1.0
    };
  }
  
  private async mlBasedMatch(entityA: any, entityB: any): Promise<ERServiceResult> {
    const script = path.join(process.cwd(), "ml", "precision-optimization-train.py");
    
    try {
      const result = await PythonShell.run(script, {
        args: ['predict', JSON.stringify(entityA), JSON.stringify(entityB)],
        pythonOptions: ["-u"],
      });
      
      const parsed = JSON.parse(result[0]);
      return {
        version: '2.0-ml',
        score: parsed.score,
        match: parsed.match,
        confidence: parsed.confidence || parsed.score,
        explanation: parsed.explanation || {},
        traceId: '',
        riskScore: 1.0 - (parsed.confidence || parsed.score)
      };
      
    } catch (error) {
      log.warn({ error: error.message }, 'ml_fallback_to_heuristics');
      
      // Fallback to heuristic-based ML scoring
      return this.heuristicMLScore(entityA, entityB);
    }
  }
  
  private async clusterBasedMatch(entityA: any, entityB: any, entityType: string): Promise<ERServiceResult> {
    // HDBSCAN-based clustering for probabilistic matching
    const script = path.join(process.cwd(), "ml", "clustering-match.py");
    
    try {
      const result = await PythonShell.run(script, {
        args: [JSON.stringify(entityA), JSON.stringify(entityB), entityType],
        pythonOptions: ["-u"],
      });
      
      const parsed = JSON.parse(result[0]);
      return {
        version: '2.0-clustering',
        score: parsed.score,
        match: parsed.match,
        confidence: parsed.confidence,
        explanation: parsed.explanation || {},
        traceId: '',
        riskScore: parsed.riskScore || (1.0 - parsed.confidence)
      };
      
    } catch (error) {
      log.warn({ error: error.message }, 'clustering_fallback');
      
      // Fallback to behavioral clustering
      return this.behavioralClusterMatch(entityA, entityB);
    }
  }
  
  private async hybridDecision(
    deterministicResult: ERServiceResult,
    mlResult: ERServiceResult,
    entityType: string
  ): Promise<ERServiceResult> {
    const weights = {
      deterministic: 0.4,
      ml: 0.6
    };
    
    const combinedScore = (deterministicResult.score * weights.deterministic) + 
                         (mlResult.score * weights.ml);
                         
    const combinedConfidence = Math.max(deterministicResult.confidence || 0, mlResult.confidence || 0);
    const combinedRisk = Math.min(deterministicResult.riskScore || 1.0, mlResult.riskScore || 1.0);
    
    const threshold = GA_PRECISION_THRESHOLDS[entityType as keyof typeof GA_PRECISION_THRESHOLDS] || 0.85;
    
    return {
      version: '2.0-hybrid',
      score: combinedScore,
      match: combinedScore >= threshold,
      confidence: combinedConfidence,
      explanation: {
        ...deterministicResult.explanation,
        ...mlResult.explanation,
        hybridScore: combinedScore
      },
      traceId: '',
      riskScore: combinedRisk
    };
  }
  
  private heuristicMLScore(entityA: any, entityB: any): ERServiceResult {
    let score = 0;
    const explanation: Record<string, number> = {};
    
    // Jaro-Winkler name similarity
    if (entityA.name && entityB.name) {
      const nameScore = this.jaroWinklerSimilarity(
        this.normalizeString(entityA.name),
        this.normalizeString(entityB.name)
      );
      score += nameScore * 0.4;
      explanation.jaroWinkler = nameScore;
    }
    
    // Phonetic matching
    if (entityA.name && entityB.name) {
      const phoneticScore = this.phoneticMatch(entityA.name, entityB.name);
      score += phoneticScore * 0.2;
      explanation.phonetic = phoneticScore;
    }
    
    // Email domain similarity
    if (entityA.email && entityB.email) {
      const emailScore = this.emailSimilarity(entityA.email, entityB.email);
      score += emailScore * 0.3;
      explanation.email = emailScore;
    }
    
    // Behavioral similarity (if available)
    if (entityA.behavioralFingerprint && entityB.behavioralFingerprint) {
      const behavioralScore = this.behavioralSimilarity(
        entityA.behavioralFingerprint, 
        entityB.behavioralFingerprint
      );
      score += behavioralScore * 0.1;
      explanation.behavioral = behavioralScore;
    }
    
    return {
      version: '2.0-heuristic',
      score: Math.min(score, 1.0),
      match: score >= 0.85,
      confidence: score,
      explanation,
      traceId: '',
      riskScore: 1.0 - score
    };
  }
  
  private behavioralClusterMatch(entityA: any, entityB: any): ERServiceResult {
    // Simplified behavioral clustering fallback
    if (!entityA.behavioralFingerprint || !entityB.behavioralFingerprint) {
      return {
        version: '2.0-behavioral-fallback',
        score: 0.0,
        match: false,
        confidence: 0.0,
        explanation: {},
        traceId: '',
        riskScore: 1.0
      };
    }
    
    const similarity = this.behavioralSimilarity(
      entityA.behavioralFingerprint,
      entityB.behavioralFingerprint
    );
    
    return {
      version: '2.0-behavioral',
      score: similarity,
      match: similarity >= 0.75,
      confidence: similarity,
      explanation: { behavioral: similarity },
      traceId: '',
      riskScore: 1.0 - similarity
    };
  }
  
  // Helper methods
  private normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  
  private jaroWinklerSimilarity(s1: string, s2: string): number {
    // Simplified Jaro-Winkler implementation
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
    
    const len1 = s1.length;
    const len2 = s2.length;
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    
    const matches1 = new Array(len1).fill(false);
    const matches2 = new Array(len2).fill(false);
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (matches2[j] || s1[i] !== s2[j]) continue;
        matches1[i] = matches2[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0;
    
    // Count transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!matches1[i]) continue;
      while (!matches2[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    
    // Add Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    
    return jaro + (0.1 * prefix * (1 - jaro));
  }
  
  private phoneticMatch(name1: string, name2: string): number {
    // Simplified Soundex-based phonetic matching
    const soundex1 = this.soundex(name1);
    const soundex2 = this.soundex(name2);
    return soundex1 === soundex2 ? 1.0 : 0.0;
  }
  
  private soundex(name: string): string {
    if (!name) return '0000';
    
    const normalized = name.toUpperCase().replace(/[^A-Z]/g, '');
    if (!normalized) return '0000';
    
    let result = normalized[0];
    
    const mapping: Record<string, string> = {
      'BFPV': '1',
      'CGJKQSXZ': '2',
      'DT': '3',
      'L': '4',
      'MN': '5',
      'R': '6'
    };
    
    for (let i = 1; i < normalized.length && result.length < 4; i++) {
      const char = normalized[i];
      for (const [chars, code] of Object.entries(mapping)) {
        if (chars.includes(char) && result[result.length - 1] !== code) {
          result += code;
          break;
        }
      }
    }
    
    return result.padEnd(4, '0').substring(0, 4);
  }
  
  private emailSimilarity(email1: string, email2: string): number {
    if (!email1 || !email2) return 0;
    
    const domain1 = email1.split('@')[1];
    const domain2 = email2.split('@')[1];
    
    if (domain1 === domain2) return 0.8;
    
    const user1 = email1.split('@')[0];
    const user2 = email2.split('@')[0];
    
    return this.jaroWinklerSimilarity(user1, user2) * 0.6;
  }
  
  private behavioralSimilarity(fp1: any, fp2: any): number {
    if (!fp1 || !fp2) return 0;
    
    // Simplified behavioral fingerprint comparison
    let similarity = 0;
    let comparisons = 0;
    
    const features = ['activityPattern', 'geoLocation', 'deviceFingerprint', 'timeZone'];
    
    for (const feature of features) {
      if (fp1[feature] && fp2[feature]) {
        comparisons++;
        if (typeof fp1[feature] === 'string' && typeof fp2[feature] === 'string') {
          similarity += fp1[feature] === fp2[feature] ? 1 : 0;
        } else if (typeof fp1[feature] === 'number' && typeof fp2[feature] === 'number') {
          const diff = Math.abs(fp1[feature] - fp2[feature]);
          similarity += Math.max(0, 1 - diff);
        }
      }
    }
    
    return comparisons > 0 ? similarity / comparisons : 0;
  }
  
  /**
   * Process merge decisions with explainable AI
   */
  async processMergeDecision(
    session: Session,
    entityAId: string,
    entityBId: string,
    entityType: string = 'PERSON'
  ): Promise<MergeDecision> {
    // Fetch entities from Neo4j
    const result = await session.run(`
      MATCH (a:Entity {id: $entityAId})
      MATCH (b:Entity {id: $entityBId})
      RETURN a, b
    `, { entityAId, entityBId });
    
    if (result.records.length === 0) {
      throw new Error('Entities not found');
    }
    
    const entityA = result.records[0].get('a').properties;
    const entityB = result.records[0].get('b').properties;
    
    // Run hybrid entity resolution
    const erResult = await this.resolveEntitiesPair(entityA, entityB, entityType);
    
    const threshold = GA_PRECISION_THRESHOLDS[entityType as keyof typeof GA_PRECISION_THRESHOLDS] || 0.85;
    const uncertaintyThreshold = 0.1; // If within 10% of threshold, mark as uncertain
    
    let decision: 'MERGE' | 'NO_MERGE' | 'UNCERTAIN';
    let reviewRequired = false;
    
    if (erResult.score >= threshold) {
      decision = 'MERGE';
    } else if (erResult.score >= threshold - uncertaintyThreshold) {
      decision = 'UNCERTAIN';
      reviewRequired = true;
    } else {
      decision = 'NO_MERGE';
    }
    
    // High-risk decisions require review
    if (erResult.riskScore && erResult.riskScore > 0.3) {
      reviewRequired = true;
    }
    
    const mergeDecision: MergeDecision = {
      id: uuidv4(),
      entityA: entityAId,
      entityB: entityBId,
      decision,
      score: erResult.score,
      explanation: erResult.explanation as any,
      riskScore: erResult.riskScore || 0,
      method: erResult.method || 'hybrid',
      reviewRequired,
      createdAt: new Date()
    };
    
    // Store decision in PostgreSQL for audit trail
    const pool = getPostgresPool();
    await pool.query(`
      INSERT INTO merge_decisions (
        id, entity_a_id, entity_b_id, decision, score, explanation, 
        risk_score, method, review_required, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      mergeDecision.id,
      mergeDecision.entityA,
      mergeDecision.entityB,
      mergeDecision.decision,
      mergeDecision.score,
      JSON.stringify(mergeDecision.explanation),
      mergeDecision.riskScore,
      mergeDecision.method,
      mergeDecision.reviewRequired,
      mergeDecision.createdAt
    ]);
    
    log.info({
      mergeDecisionId: mergeDecision.id,
      decision: mergeDecision.decision,
      score: mergeDecision.score,
      riskScore: mergeDecision.riskScore,
      reviewRequired: mergeDecision.reviewRequired
    }, 'merge_decision_created');
    
    return mergeDecision;
  }
}

// Legacy function for backward compatibility  
export async function resolveEntities(
  a: string,
  b: string,
): Promise<ERServiceResult> {
  const service = new HybridEntityResolutionService();
  return await service.resolveEntitiesPair({ name: a }, { name: b });
}
