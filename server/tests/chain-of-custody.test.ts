import { generateKeyPairSync, KeyObject, verify } from 'crypto';
import { writeCoC, verifyChain } from '../src/cases/chain-of-custody';

describe('chain of custody', () => {
  it('builds a hash-linked signed chain', async () => {
    const events: any[] = [];
    const db = {
      custodyEvent: {
        create: ({ data }: any) => {
          events.push(data);
        },
      },
    };
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    let prevHash = 'GENESIS';
    prevHash = await writeCoC(
      db,
      { caseId: 'c1', actorId: 'u1', action: 'CREATE', payload: { device: 'a' } },
      prevHash,
      privateKey,
    );
    prevHash = await writeCoC(
      db,
      { caseId: 'c1', actorId: 'u2', action: 'TRANSFER', payload: { reason: 'review' } },
      prevHash,
      privateKey,
    );
    expect(events[1].prevHash).toBe(events[0].eventHash);
    const firstValid = verify(
      null,
      Buffer.from(events[0].eventHash),
      publicKey,
      Buffer.from(events[0].signature, 'base64'),
    );
    expect(firstValid).toBe(true);
    expect(verifyChain(events, publicKey)).toBe(true);
  });
});
