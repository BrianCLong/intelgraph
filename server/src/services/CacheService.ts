interface Entry { value: string; expires: number }

export class CacheService {
  private store: Map<string, Entry> = new Map();
  constructor(private ttlMs = 900000) {}

  async get(key: string): Promise<string | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: any, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.ttlMs;
    this.store.set(key, {
      value: typeof value === 'string' ? value : JSON.stringify(value),
      expires: Date.now() + ttl,
    });
  }
}
