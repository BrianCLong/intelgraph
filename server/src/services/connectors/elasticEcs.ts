import neo4j from 'neo4j-driver';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { v4 as uuid } from 'uuid';
import baseLogger from '../../config/logger.js';

const log = baseLogger.child({ name: 'elastic-ecs' });

/**
 * Minimal ECS -> Graph mapping
 * Entities: Host, User, IP, Event
 * Relationships: OBSERVED_ON (Event->Host), INVOLVES_USER (Event->User), COMMUNICATES_WITH (IP->IP)
 */
export async function ingestEcsEvents(events: any, opts: { source: string; batchId?: string; normalize?: boolean; }) {
  const driver = getNeo4jDriver();
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  const batchId = opts.batchId || uuid();
  let received = 0, accepted = 0, rejected = 0;

  try {
    if (!Array.isArray(events)) throw new Error('events must be an array');
    received = events.length;

    await session.writeTransaction(async tx => {
      for (const ev of events) {
        try {
          const e = sanitizeEcs(ev);
          const params = {
            id: e.event_id,
            ts: e['@timestamp'],
            category: e.category,
            action: e.action,
            outcome: e.outcome,
            src_ip: e.src_ip,
            dst_ip: e.dst_ip,
            host: e.host_name,
            user: e.user_name,
            source: opts.source,
            batchId
          };

          // Parameterized Cypher to prevent injection
          await tx.run(
            `
            MERGE (h:Host {name:$host})
            MERGE (u:User {name:$user})
            MERGE (s:IP {address:$src_ip})
            MERGE (d:IP {address:$dst_ip})
            MERGE (e:Event {id:$id})
              ON CREATE SET e.createdAt = datetime($ts)
              ON MATCH  SET e.lastSeen  = datetime($ts)
            SET e.category=$category, e.action=$action, e.outcome=$outcome, e.source=$source, e.batchId=$batchId
            MERGE (e)-[:OBSERVED_ON]->(h)
            MERGE (e)-[:INVOLVES_USER]->(u)
            MERGE (s)-[:COMMUNICATES_WITH {batchId:$batchId}]->(d)
            `,
            params
          );
          accepted++;
        } catch (err) {
          rejected++;
          log.warn({ err }, 'reject-ecs-event');
        }
      }
    });

    log.info({ batchId, accepted, rejected }, 'ecs-ingest-complete');
    return { received, accepted, rejected, batchId };
  } finally {
    await session.close();
  }
}

function sanitizeEcs(ev: any) {
  const safe = (v: any) => (typeof v === 'string' ? v.slice(0, 512) : v);
  return {
    event_id: safe(ev?.event?.id || ev?.['event.id'] || uuid()),
    '@timestamp': ev?.['@timestamp'] || new Date().toISOString(),
    category: safe(ev?.event?.category || 'unknown'),
    action: safe(ev?.event?.action || 'observe'),
    outcome: safe(ev?.event?.outcome || 'unknown'),
    src_ip: safe(ev?.source?.ip || ev?.['source.ip'] || '0.0.0.0'),
    dst_ip: safe(ev?.destination?.ip || ev?.['destination.ip'] || '0.0.0.0'),
    host_name: safe(ev?.host?.name || ev?.['host.name'] || 'unknown'),
    user_name: safe(ev?.user?.name || ev?.['user.name'] || 'unknown'),
  };
}
