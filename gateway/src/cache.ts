import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.error('Redis error', err));
    client.connect().catch(() => {});
  }
  return client;
}

export async function cacheGet(key: string) {
  return getClient().get(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds: number) {
  await getClient().set(key, value, { EX: ttlSeconds });
}
