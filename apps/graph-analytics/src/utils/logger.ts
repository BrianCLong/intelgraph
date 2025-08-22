import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

export const logger = winston.createLogger({
  level: config.monitoring.logLevel,
  format: logFormat,
  defaultMeta: { service: 'graph-analytics' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    new winston.transports.File({
      filename: 'logs/graph-analytics-error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: 'logs/graph-analytics-combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

// Performance logging helper
export const performanceLogger = {
  start: (operation: string) => {
    if (config.monitoring.enablePerformanceLogging) {
      const startTime = process.hrtime.bigint();
      return {
        end: () => {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
          logger.info(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`);
        }
      };
    }
    return { end: () => {} };
  }
};

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}