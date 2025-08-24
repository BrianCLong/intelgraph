import Keyv from 'keyv';
const keyv = new Keyv(process.env.REDIS_URL || 'redis://redis:6379');
export function persistedOnlyPlugin() {
  const enabled = (process.env.ENFORCE_PERSISTED || 'true') === 'true';
  return {
    async requestDidStart(ctx: any) {
      if (!enabled) return;
      const h = ctx.request.http?.headers.get('x-persisted-hash') || '';
      const tenant = ctx.request.http?.headers.get('x-tenant') || 'default';
      const ok = h.startsWith('sha256:') && (await keyv.get(`pq:${tenant}:${h}`));
      if (!ok) throw new Error('Persisted queries only in production');
    },
  };
}
