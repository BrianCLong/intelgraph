const fs = require('fs');
const path = require('path');
const { runMigration, rollback } = require('./runner');

describe('migration runner', () => {
  const stateFile = path.join(__dirname, '__state.json');

  afterEach(() => {
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  });

  test('resumes after interruption', async () => {
    const executed = [];
    const plan = [
      { run: () => executed.push('step1') },
      { run: () => executed.push('step2') }
    ];

    await runMigration(plan.slice(0, 1), { stateFile });
    expect(executed).toEqual(['step1']);

    await runMigration(plan, { stateFile });
    expect(executed).toEqual(['step1', 'step2']);
  });

  test('rollback reverses steps', async () => {
    const executed = [];
    const plan = [
      { run: () => executed.push('up1'), rollback: () => executed.push('down1') },
      { run: () => executed.push('up2'), rollback: () => executed.push('down2') }
    ];

    await runMigration(plan, { stateFile });
    await rollback(plan, { stateFile });
    expect(executed).toEqual(['up1', 'up2', 'down2', 'down1']);
  });
});
