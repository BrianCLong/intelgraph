// Jest global setup with retries and noise reduction
jest.retryTimes(process.env.CI ? 2 : 0, { logErrorsBeforeRetry: true });

// Tone down noisy logs in CI
const origError = console.error;
console.error = (...args) => {
  if (/Warning: React state update on an unmounted/i.test(args[0])) return;
  if (/Warning: Can't perform a React state update/i.test(args[0])) return;
  if (/Warning: componentWillReceiveProps has been renamed/i.test(args[0])) return;
  origError(...args);
};

const origWarn = console.warn;
console.warn = (...args) => {
  if (/Warning: React state update on an unmounted/i.test(args[0])) return;
  if (/Warning: Can't perform a React state update/i.test(args[0])) return;
  origWarn(...args);
};

// Set reasonable timeouts for CI
jest.setTimeout(process.env.CI ? 30000 : 5000);
