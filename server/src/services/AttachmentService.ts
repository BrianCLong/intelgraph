import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import * as path from 'path';
import type { Readable } from 'stream';
import { createProvenanceRecord } from '../../../packages/shared/provenance';

export interface AttachmentMetadata {
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  uploader?: string;
  licenseId?: string;
  policyTags: string[];
  provenance: ReturnType<typeof createProvenanceRecord>;
}

export class AttachmentService {
  private baseDir: string;

  constructor(baseDir = path.join(process.cwd(), 'attachments')) {
    this.baseDir = baseDir;
  }

  async save(
    stream: Readable,
    {
      filename,
      mimeType,
      uploader,
      licenseId,
      policyTags = [],
    }: {
      filename: string;
      mimeType: string;
      uploader?: string;
      licenseId?: string;
      policyTags?: string[];
    },
  ): Promise<AttachmentMetadata> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const tempPath = path.join(this.baseDir, `${Date.now()}-${filename}`);
    const hash = createHash('sha256');
    const writeStream = createWriteStream(tempPath);
    await pipeline(
      stream,
      async function* (source) {
        for await (const chunk of source) {
          hash.update(chunk);
          yield chunk;
        }
      },
      writeStream,
    );
    const sha256 = hash.digest('hex');
    const finalPath = path.join(this.baseDir, sha256);
    await fs.rename(tempPath, finalPath);
    const stats = await fs.stat(finalPath);
    const provenance = createProvenanceRecord(sha256);
    return {
      filename: path.basename(filename),
      mimeType,
      size: stats.size,
      sha256,
      uploader,
      licenseId,
      policyTags,
      provenance,
    };
  }
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;

export function detectPII(text: string) {
  return {
    emails: text.match(EMAIL_RE) || [],
    phones: text.match(PHONE_RE) || [],
    ssns: text.match(SSN_RE) || [],
  };
}

export function redactPII(text: string): string {
  return text
    .replace(EMAIL_RE, '[REDACTED]')
    .replace(PHONE_RE, '[REDACTED]')
    .replace(SSN_RE, '[REDACTED]');
}
