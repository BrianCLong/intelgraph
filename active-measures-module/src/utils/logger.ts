import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        service: 'active-measures',
        ...meta,
      });
    })
  ),
  defaultMeta: {
    service: 'active-measures-module',
    classification: 'CONFIDENTIAL',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/active-measures-error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/active-measures-combined.log',
    }),
  ],
});

// In production, log to remote logging service
if (process.env.NODE_ENV === 'production') {
  // Add remote logging transport here (e.g., CloudWatch, Elasticsearch)
  logger.add(new winston.transports.Console({
    format: winston.format.json(),
  }));
}

export default logger;