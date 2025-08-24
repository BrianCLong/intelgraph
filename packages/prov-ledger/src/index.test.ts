import { signManifest, Manifest } from './index';
import { pki } from 'node-forge';

describe('signManifest', () => {
  it('signs manifest', () => {
    const keys = pki.rsa.generateKeyPair(2048);
    const manifest: Manifest = {
      subject: 'test',
      issuedAt: new Date().toISOString(),
      payloadHash: 'abc123'
    };
    const signature = signManifest(manifest, pki.privateKeyToPem(keys.privateKey));
    expect(typeof signature).toBe('string');
  });
});
