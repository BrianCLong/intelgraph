import { Session } from 'neo4j-driver';
import pino from 'pino';
import { getPostgresPool } from '../config/database';
import {
  BehavioralFingerprintService,
  BehavioralTelemetry,
  BehavioralFingerprint,
} from './BehavioralFingerprintService.js';

const log = pino({ name: 'EntityResolutionService' });

interface NormalizedProperties {
  name?: string;
  email?: string;
  url?: string;
}

export class EntityResolutionService {
  private behavioralService = new BehavioralFingerprintService();

  /**
   * Normalizes entity properties for deterministic comparison.
   * @param entity The entity object, typically from Neo4j, with properties.
   * @returns Normalized properties.
   */
  private normalizeEntityProperties(entity: any): NormalizedProperties {
    const normalized: NormalizedProperties = {};
    if (entity.name) {
      const name = String(entity.name)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      if (name) normalized.name = name;
    }
    if (entity.email) {
      const raw = String(entity.email).trim().toLowerCase();
      const [localPart, domainPart] = raw.split('@');
      if (localPart && domainPart) {
        let local = localPart.split('+')[0];
        if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
          local = local.replace(/\./g, '');
        }
        normalized.email = `${local}@${domainPart}`;
      }
    }
    if (entity.url) {
      try {
        const url = new URL(String(entity.url).trim());
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        const path = decodeURIComponent(url.pathname).replace(/\/+/g, '/');
        const cleanedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
        normalized.url = `${host}${cleanedPath.toLowerCase()}`;
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
    const parts = Object.entries(normalizedProps)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => `${k}:${v}`);
    if (parts.length === 0) {
      return ''; // Cannot generate a canonical key without identifying properties
    }
    return parts.sort().join('|');
  }

  /**
   * Finds potential duplicate entities in Neo4j based on canonical keys.
   * @param session Neo4j session.
   * @returns A Map where keys are canonical keys and values are arrays of entity IDs.
   */
  public async findDuplicateEntities(session: Session): Promise<Map<string, string[]>> {
    const duplicates = new Map<string, string[]>();
    const result = await session.run(`
      MATCH (e:Entity)
      WHERE e.name IS NOT NULL OR e.email IS NOT NULL OR e.url IS NOT NULL
      RETURN e.id AS id, e.name AS name, e.email AS email, e.url AS url
    `);

    for (const record of result.records) {
      const entityId = record.get('id');
      const entityProps = {
        name: record.get('name'),
        email: record.get('email'),
        url: record.get('url'),
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
      throw new Error('Master entity ID cannot be in the list of duplicate entity IDs.');
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

    log.info(`Merged entities: ${duplicateEntityIds.join(', ')} into ${masterEntityId}`);

    // Log to audit_logs
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['entity_merge', 'Entity', masterEntityId, { merged_from: duplicateEntityIds }],
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
}
