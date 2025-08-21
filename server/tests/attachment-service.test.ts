import { Readable } from 'stream';
import { createHash } from 'crypto';
import * as path from 'path';
import { AttachmentService, detectPII, redactPII } from '../src/services/AttachmentService';
import { createProvenanceRecord } from '../../packages/shared/provenance';

const TMP_DIR = path.join(__dirname, '..', '..', 'tmp-test');

describe('AttachmentService', () => {
  it('stores file and computes sha256', async () => {
    const service = new AttachmentService(TMP_DIR);
    const content = 'hello world';
    const stream = Readable.from(content);
    const meta = await service.save(stream, { filename: 'test.txt', mimeType: 'text/plain' });
    expect(meta.sha256).toBe(createHash('sha256').update(content).digest('hex'));
  });

  it('detects and redacts PII', () => {
    const text = 'Email test@example.com phone 555-123-4567 ssn 123-45-6789';
    const found = detectPII(text);
    expect(found.emails).toContain('test@example.com');
    expect(found.phones[0]).toBe('555-123-4567');
    expect(found.ssns[0]).toBe('123-45-6789');
    const redacted = redactPII(text);
    expect(redacted).not.toContain('test@example.com');
    expect(redacted).not.toContain('555-123-4567');
    expect(redacted).not.toContain('123-45-6789');
  });

  it('creates deterministic provenance record', () => {
    const timestamp = '2020-01-01T00:00:00.000Z';
    const rec1 = createProvenanceRecord('data', 'SHA-256', '1', timestamp);
    const rec2 = createProvenanceRecord('data', 'SHA-256', '1', timestamp);
    expect(rec1.inputHash).toBe(rec2.inputHash);
    expect(rec1.signature).toBe(rec2.signature);
  });
});
