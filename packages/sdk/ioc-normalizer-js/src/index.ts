/**
 * IOC Normalizer
 * Provides normalization for common indicator types
 */

import { URL } from 'url';
import net from 'node:net';

export type IOCType = 'domain' | 'ip' | 'url' | 'hash' | 'email';

export interface NormalizedIOC {
  type: IOCType;
  value: string;
  key: string;
  confidence: number;
  source?: string;
}

/**
 * Normalize an IOC string into canonical representation.
 * Returns null if the value cannot be parsed.
 */
export function normalizeIOC(value: string, source?: string): NormalizedIOC | null {
  const trimmed = value.trim();

  // Email
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    const val = trimmed.toLowerCase();
    return buildResult('email', val, source);
  }

  // IP address
  if (net.isIP(trimmed)) {
    return buildResult('ip', trimmed, source);
  }

  // URL
  try {
    const url = new URL(trimmed);
    url.hash = '';
    const val = url.toString();
    return buildResult('url', val, source);
  } catch {
    // not a valid URL
  }

  // Domain
  if (/^[a-z0-9.-]+$/i.test(trimmed)) {
    const val = trimmed.toLowerCase();
    return buildResult('domain', val, source);
  }

  // Hash (md5/sha1/sha256 etc)
  if (/^[A-Fa-f0-9]{32,64}$/.test(trimmed)) {
    const val = trimmed.toLowerCase();
    return buildResult('hash', val, source);
  }

  return null;
}

function buildResult(type: IOCType, value: string, source?: string): NormalizedIOC {
  return {
    type,
    value,
    key: `${type}:${value}`,
    confidence: 0.5,
    source
  };
}
