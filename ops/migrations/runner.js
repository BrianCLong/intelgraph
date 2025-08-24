const fs = require('fs');
const path = require('path');

function loadState(stateFile) {
  if (fs.existsSync(stateFile)) {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  }
  return { index: 0 };
}

function saveState(stateFile, state) {
  fs.writeFileSync(stateFile, JSON.stringify(state));
}

async function runMigration(plan, options = {}) {
  const stateFile = options.stateFile || path.join(__dirname, 'migration-state.json');
  const state = loadState(stateFile);
  for (let i = state.index; i < plan.length; i++) {
    const step = plan[i];
    if (typeof step.run === 'function') {
      // eslint-disable-next-line no-await-in-loop
      await step.run();
    }
    state.index = i + 1;
    saveState(stateFile, state);
  }
}

async function rollback(plan, options = {}) {
  const stateFile = options.stateFile || path.join(__dirname, 'migration-state.json');
  const state = loadState(stateFile);
  for (let i = state.index - 1; i >= 0; i--) {
    const step = plan[i];
    if (typeof step.rollback === 'function') {
      // eslint-disable-next-line no-await-in-loop
      await step.rollback();
    }
    state.index = i;
    saveState(stateFile, state);
  }
}

module.exports = { runMigration, rollback };
