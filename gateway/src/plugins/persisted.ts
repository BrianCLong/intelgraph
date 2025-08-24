import type { ApolloServerPlugin } from '@apollo/server';
import crypto from 'node:crypto';
import fs from 'node:fs';

export const makePersistedPlugin = ({ storePath }: { storePath: string }): ApolloServerPlugin => {
  const store: Record<string, string> = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  return {
    async requestDidStart() {
      return {
        async didResolveOperation({ request }) {
          if (process.env.NODE_ENV !== 'production') return;
          const ext = (request.extensions as any)?.persistedQuery?.sha256Hash as string | undefined;
          const text = request.query ?? (ext ? store[ext] : undefined);
          if (!text) {
            throw Object.assign(new Error('Operation not allowed (persisted only)'), {
              code: 'PERSISTED_ONLY',
            });
          }
          const hash = crypto.createHash('sha256').update(text).digest('hex');
          if (!store[hash]) {
            throw Object.assign(new Error('Operation not allowed (persisted only)'), {
              code: 'PERSISTED_ONLY',
            });
          }
          if (ext && ext !== hash) {
            throw Object.assign(new Error('Persisted hash mismatch'), {
              code: 'PERSISTED_MISMATCH',
            });
          }
        },
      };
    },
  };
};
