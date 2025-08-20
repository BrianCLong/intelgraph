const CopilotOrchestrationService = require('../src/services/CopilotOrchestrationService');

describe('copilotQuery policy', () => {
  test('denies export by license', async () => {
    const service = new CopilotOrchestrationService(null, null, null, console);
    const res = await service.copilotQuery('export all data', 'case1', false);
    expect(res.policy.allowed).toBe(false);
    expect(res.policy.reason).toMatch(/data license/);
  });
});
