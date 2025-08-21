import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Registry, collectDefaultMetrics } from 'prom-client';
import type { Request, Response } from 'express';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

let started = false;

export async function startObservability() {
  if (started) return;
  await sdk.start();
  started = true;
}

export async function stopObservability() {
  if (!started) return;
  await sdk.shutdown();
  started = false;
}

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export async function metricsHandler(_req: Request, res: Response) {
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}
