import { execute } from '../src/executor.ts';

class MockDriver {
  session() {
    return {
      run: async () => ({ records: [] }),
      close: async () => {}
    };
  }
}

describe('execute', () => {
  test('rejects unauthorized ticket', async () => {
    await expect(execute('MATCH (n) RETURN n', 'DENY', new MockDriver() as any)).rejects.toThrow('Unauthorized');
  });
});
