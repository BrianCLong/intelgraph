import { createHash, sign, verify, KeyObject } from 'crypto';

export interface CustodyEvent {
  caseId: string;
  attachmentId?: string;
  actorId: string;
  action: string;
  at?: Date;
  payload?: Record<string, any>;
}

/**
 * Append a custody event to the chain with an Ed25519 signature.
 * Returns the computed event hash which should be used as the next prevHash.
 */
export async function writeCoC(
  db: any,
  event: CustodyEvent,
  prevHash: string,
  privateKey: KeyObject,
): Promise<string> {
  const payload = JSON.stringify(event);
  const eventHash = createHash('sha256')
    .update(prevHash + payload)
    .digest('hex');
  const signature = sign(null, Buffer.from(eventHash), privateKey).toString('base64');
  await db.custodyEvent.create({ data: { ...event, prevHash, eventHash, signature } });
  return eventHash;
}

/**
 * Verify a chain of custody events. Returns true if the chain is intact and
 * signatures are valid.
 */
export function verifyChain(events: any[], publicKey: KeyObject): boolean {
  let prevHash = 'GENESIS';
  for (const e of events) {
    const { caseId, attachmentId, actorId, action, at, payload } = e;
    const payloadStr = JSON.stringify({ caseId, attachmentId, actorId, action, at, payload });
    const hash = createHash('sha256')
      .update(prevHash + payloadStr)
      .digest('hex');
    if (hash !== e.eventHash) return false;
    const ok = verify(
      null,
      Buffer.from(e.eventHash),
      publicKey,
      Buffer.from(e.signature, 'base64'),
    );
    if (!ok) return false;
    prevHash = e.eventHash;
  }
  return true;
}
