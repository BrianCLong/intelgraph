import { Session } from "neo4j-driver";
import logger from '../config/logger';
import { getPostgresPool } from "../config/database";
import {
  BehavioralFingerprintService,
  BehavioralTelemetry,
  BehavioralFingerprint,
} from "./BehavioralFingerprintService.js";
import EmbeddingService from "./EmbeddingService.js";

const log = logger.child({ name: "EntityResolutionService" });

interface NormalizedProperties {
  name?: string;
  email?: string;
  url?: string;
}

export class EntityResolutionService {
  private behavioralService = new BehavioralFingerprintService();
  private embeddingService = new EmbeddingService();

  private fuzzyStringSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const m = this.matchingCharacters(a, b);
    if (m === 0) return 0;
    const t = this.transpositions(a, b) / (2 * m);
    return (m / a.length + m / b.length + (m - t) / m) / 3;
  }

  private matchingCharacters(a: string, b: string): number {
    const range = Math.max(a.length, b.length) / 2 - 1;
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);
    let matches = 0;
    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - range);
      const end = Math.min(i + range + 1, b.length);
      for (let j = start; j < end; j++) {
        if (bMatches[j]) continue;
        if (a[i] === b[j]) {
          aMatches[i] = true;
          bMatches[j] = true;
          matches++;
          break;
        }
      }
    }
    return matches;
  }

  private transpositions(a: string, b: string): number {
    const range = Math.max(a.length, b.length) / 2 - 1;
    const aMatches: string[] = [];
    const bMatches: string[] = [];
    const aMatched = new Array(a.length).fill(false);
    const bMatched = new Array(b.length).fill(false);
    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - range);
      const end = Math.min(i + range + 1, b.length);
      for (let j = start; j < end; j++) {
        if (bMatched[j]) continue;
        if (a[i] === b[j]) {
          aMatched[i] = true;
          bMatched[j] = true;
          aMatches.push(a[i]);
          break;
        }
      }
    }
    for (let j = 0; j < b.length; j++) {
      if (bMatched[j]) bMatches.push(b[j]);
    }
    let t = 0;
    for (let i = 0; i < aMatches.length; i++) {
      if (aMatches[i] !== bMatches[i]) t++;
    }
    return t;
  }

  public async computeSimilarityFeatures(
    left: any,
    right: any,
  ): Promise<Record<string, number>> {
    const leftNorm = this.normalizeEntityProperties(left);
    const rightNorm = this.normalizeEntityProperties(right);
    const features: Record<string, number> = {};
    features.name_exact = leftNorm.name === rightNorm.name ? 1 : 0;
    features.email_exact = leftNorm.email === rightNorm.email ? 1 : 0;
    features.url_exact = leftNorm.url === rightNorm.url ? 1 : 0;
    if (leftNorm.name && rightNorm.name) {
      features.name_fuzzy = this.fuzzyStringSimilarity(
        leftNorm.name,
        rightNorm.name,
      );
      try {
        features.name_embedding = await this.embeddingService.calculateSimilarity(
          leftNorm.name,
          rightNorm.name,
        );
      } catch (e) {
        log.warn("Embedding similarity failed", { error: (e as Error).message });
        features.name_embedding = 0;
      }
    } else {
      features.name_fuzzy = 0;
      features.name_embedding = 0;
    }
    return features;
  }

  public async generateExplanation(
    left: any,
    right: any,
    overrides: Record<string, number> = {},
  ): Promise<{ score: number; features: Record<string, number>; weights: Record<string, number>; overrides: Record<string, number> }> {
    const weights: Record<string, number> = {
      name_exact: 0.4,
      email_exact: 0.4,
      url_exact: 0.2,
      name_fuzzy: 0.3,
      name_embedding: 0.3,
    };
    const features = await this.computeSimilarityFeatures(left, right);
    let score = 0;
    for (const [key, value] of Object.entries(features)) {
      const weight = overrides[key] ?? weights[key] ?? 0;
      score += value * weight;
    }
    return { score, features, weights, overrides };
  }

  /**
   * Normalizes entity properties for deterministic comparison.
   * @param entity The entity object, typically from Neo4j, with properties.
   * @returns Normalized properties.
   */
  private normalizeEntityProperties(entity: any): NormalizedProperties {
    const normalized: NormalizedProperties = {};
    if (entity.name) {
      normalized.name = String(entity.name).trim().toLowerCase();
    }
    if (entity.email) {
      normalized.email = String(entity.email).trim().toLowerCase();
    }
    if (entity.url) {
      try {
        const url = new URL(String(entity.url).trim().toLowerCase());
        normalized.url = url.hostname + url.pathname; // Basic normalization
      } catch (e) {
        log.warn(`Invalid URL for normalization: ${entity.url}`);
      }
    }
    return normalized;
  }

  /**
   * Generates a canonical key for an entity based on its normalized properties.
   * This key is used to identify potential duplicates.
   * @param normalizedProps Normalized entity properties.
   * @returns A canonical string key.
   */
  private generateCanonicalKey(normalizedProps: NormalizedProperties): string {
    const parts: string[] = [];
    if (normalizedProps.name) parts.push(`name:${normalizedProps.name}`);
    if (normalizedProps.email) parts.push(`email:${normalizedProps.email}`);
    if (normalizedProps.url) parts.push(`url:${normalizedProps.url}`);

    if (parts.length === 0) {
      return ""; // Cannot generate a canonical key without identifying properties
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

  public async unmergeEntity(
    session: Session,
    restored: { id: string; name?: string; email?: string; url?: string },
    masterEntityId: string,
  ): Promise<void> {
    await session.run(
      `CREATE (e:Entity {id:$id, name:$name, email:$email, url:$url, canonicalId:$id})`,
      restored,
    );
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4)`,
      [
        "entity_unmerge",
        "Entity",
        restored.id,
        { unmerged_from: masterEntityId },
      ],
    );
    log.info(`Unmerged entity ${restored.id} from ${masterEntityId}`);
  }

  public async candidateDuplicates(
    session: Session,
    entityId: string,
  ): Promise<{ id: string; score: number; explanation: any }[]> {
    const result = await session.run(
      `MATCH (e:Entity {id:$id}) RETURN e.name AS name, e.email AS email, e.url AS url`,
      { id: entityId },
    );
    if (result.records.length === 0) return [];
    const entity = result.records[0].toObject();
    const normalized = this.normalizeEntityProperties(entity);
    const key = this.generateCanonicalKey(normalized);
    if (!key) return [];
    const candidates = await session.run(
      `MATCH (other:Entity)
       WHERE other.id <> $id
         AND (other.name IS NOT NULL OR other.email IS NOT NULL OR other.url IS NOT NULL)
       RETURN other.id AS id, other.name AS name, other.email AS email, other.url AS url`,
      { id: entityId },
    );
    const scored: { id: string; score: number; explanation: any }[] = [];
    for (const record of candidates.records) {
      const other = record.toObject();
      const explanation = await this.generateExplanation(entity, other);
      scored.push({ id: other.id, score: explanation.score, explanation });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  public async decideMerge(
    session: Session,
    leftId: string,
    rightId: string,
    decision: "MERGE" | "SKIP",
    overrides: Record<string, number> = {},
  ): Promise<{ merged: boolean; explanation: any }> {
    const leftRes = await session.run(
      `MATCH (e:Entity {id:$id}) RETURN e.name AS name, e.email AS email, e.url AS url`,
      { id: leftId },
    );
    const rightRes = await session.run(
      `MATCH (e:Entity {id:$id}) RETURN e.name AS name, e.email AS email, e.url AS url`,
      { id: rightId },
    );
    if (leftRes.records.length === 0 || rightRes.records.length === 0) {
      throw new Error("Entities not found");
    }
    const left = leftRes.records[0].toObject();
    const right = rightRes.records[0].toObject();
    const explanation = await this.generateExplanation(left, right, overrides);
    if (decision === "MERGE") {
      await this.mergeEntities(session, leftId, [rightId]);
      return { merged: true, explanation };
    }
    return { merged: false, explanation };
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
}
