export async function withSession<T>(fn: (s: any) => Promise<T>): Promise<T> {
  const session = {
    run: async () => ({ keys: [], records: [] })
  };
  return await fn(session);
}
