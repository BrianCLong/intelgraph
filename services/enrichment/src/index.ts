import http from 'http';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from 'redis';
import { TokenBucket } from './rateLimiter.js';
import { CircuitBreaker } from './circuitBreaker.js';
import { normalize } from './normalizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const quotaPath = path.resolve(__dirname, '../../../ops/enrichment/quota.json');
const breakerPath = path.resolve(__dirname, '../../../ops/enrichment/circuit-breaker.json');
const quotaConfig = JSON.parse(readFileSync(quotaPath, 'utf8'));
const breakerConfig = JSON.parse(readFileSync(breakerPath, 'utf8'));

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const buckets = new Map<string, TokenBucket>();
const breakers = new Map<string, CircuitBreaker>();
const jobs = new Map<string, { status: string; result: any[] }>();

for (const [provider, cfg] of Object.entries(quotaConfig)) {
  buckets.set(provider, new TokenBucket(cfg.capacity, cfg.refillPerSecond));
}
for (const [provider, cfg] of Object.entries(breakerConfig)) {
  breakers.set(provider, new CircuitBreaker(cfg.failureThreshold, cfg.resetTimeoutMs));
}

function signKey(key: string) {
  const secret = process.env.CACHE_SIGNING_KEY || 'dev';
  return crypto.createHmac('sha256', secret).update(key).digest('hex');
}

async function getCache(key: string) {
  const v = await redis.get(signKey(key));
  return v ? JSON.parse(v) : null;
}

async function setCache(key: string, value: unknown) {
  await redis.set(signKey(key), JSON.stringify(value), { EX: 3600 });
}

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 100));
      attempt += 1;
    }
  }
}

async function callProvider(provider: string, query: any) {
  const bucket = buckets.get(provider);
  const breaker = breakers.get(provider);
  if (!bucket || !breaker) throw new Error('unknown provider');
  if (!bucket.take()) throw new Error('rate limit exceeded');
  if (!breaker.canRequest()) throw new Error('circuit open');
  try {
    // Placeholder for real provider call using env license keys
    const raw = { query };
    const normalized = normalize(provider, raw);
    breaker.success();
    return { ...normalized, source: 'live' };
  } catch (e) {
    breaker.failure();
    throw e;
  }
}

async function processJob(jobId: string, body: any) {
  const results: any[] = [];
  for (const item of body || []) {
    const cacheKey = `${item.provider}:${item.query}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      results.push({ ...cached, source: 'cache' });
      continue;
    }
    const res = await fetchWithRetry(() => callProvider(item.provider, item.query));
    await setCache(cacheKey, res);
    results.push(res);
  }
  jobs.set(jobId, { status: 'completed', result: results });
  // TODO: emit to enrichment.results.v1
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/enrich') {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      const jobId = crypto.randomUUID();
      jobs.set(jobId, { status: 'running', result: [] });
      processJob(jobId, JSON.parse(data).items).catch(() => {
        jobs.set(jobId, { status: 'error', result: [] });
      });
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jobId }));
    });
    return;
  }
  const match = req.url?.match(/^\/enrich\/(.+)$/);
  if (req.method === 'GET' && match) {
    const job = jobs.get(match[1]);
    if (!job) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(job));
    return;
  }
  res.writeHead(404);
  res.end();
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  server.listen(port);
}

export default server;
