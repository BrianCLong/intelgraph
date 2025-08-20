import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => { return { level: label.toUpperCase() }; },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  browser: {
    asObject: true,
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export default logger;
