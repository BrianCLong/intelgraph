import { executeSandbox } from '../nl2cypher/sandbox';
import { execSync } from 'node:child_process';

const dockerAvailable = (() => {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('sandbox execution', () => {
  it('blocks mutating queries', async () => {
    await expect(executeSandbox('CREATE (n:Test)')).rejects.toThrow('Mutations are not allowed');
  });

  (dockerAvailable ? it : it.skip)('runs read-only queries', async () => {
    const rows = await executeSandbox('RETURN 1 AS n');
    expect(rows[0].n).toBe(1);
  });
});
