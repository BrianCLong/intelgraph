import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

export type TelemetryEventType = 'task_started' | 'task_completed' | 'error' | 'abandon';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  decision_latency_ms?: number;
  details?: string;
}

const consent = process.env.TELEMETRY_CONSENT === 'true';
const storage = process.env.TELEMETRY_STORAGE === 'session' ? 'session' : 'device';
const samplePct = Number(process.env.TELEMETRY_SAMPLE_PCT ?? '100');
const sink = process.env.TELEMETRY_SINK === 'file' ? 'file' : 'stdout';
const filePath = process.env.TELEMETRY_FILE ?? 'telemetry.log';

function shouldSample() {
  return Math.random() * 100 < samplePct;
}

function writeEvent(event: TelemetryEvent) {
  if (!consent || !shouldSample()) return;
  const line = JSON.stringify(event);
  if (sink === 'stdout') {
    process.stdout.write(line + '\n');
  } else {
    fs.appendFileSync(filePath, line + '\n');
  }
}

export function telemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!consent) return next();
  (req as any).telemetry = { events: [] as TelemetryEvent[] };
  const start = Date.now();
  logEvent(req, { type: 'task_started', timestamp: new Date().toISOString() });
  req.on('close', () => {
    if (!res.writableEnded) {
      logEvent(req, { type: 'abandon', timestamp: new Date().toISOString() });
      flushSession(req);
    }
  });
  res.on('finish', () => {
    const latency = Date.now() - start;
    logEvent(req, {
      type: 'task_completed',
      timestamp: new Date().toISOString(),
      decision_latency_ms: latency,
    });
    flushSession(req);
  });
  next();
}

export function telemetryErrorMiddleware(
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  logEvent(req, {
    type: 'error',
    timestamp: new Date().toISOString(),
    details: err.name,
  });
  flushSession(req);
  next(err);
}

function logEvent(req: Request, event: TelemetryEvent) {
  if (storage === 'session') {
    ((req as any).telemetry.events as TelemetryEvent[]).push(event);
  } else {
    writeEvent(event);
  }
}

function flushSession(req: Request) {
  if (storage === 'session') {
    const events = ((req as any).telemetry?.events ?? []) as TelemetryEvent[];
    events.forEach(writeEvent);
    (req as any).telemetry.events = [];
  }
}
