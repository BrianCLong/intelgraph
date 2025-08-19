export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function format(level: LogLevel, args: unknown[]) {
  const ts = new Date().toISOString();
  const id = process?.env?.TRACE_ID || process?.env?.REQUEST_ID;
  const prefix = id ? `[${ts}] [${id}]` : `[${ts}]`;
  return [prefix, ...args];
}

function createLogger(level: LogLevel) {
  return (...args: unknown[]): void => {
    // Always write to console in production; methods map one-to-one
    // eslint-disable-next-line no-console
    (console as any)[level](...format(level, args));
  };
}

export const logger = {
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
  debug: createLogger('debug'),
};
