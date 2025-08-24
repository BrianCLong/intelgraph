import pino from 'pino';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

let sdk;
let logger;

export async function setup(config = {}) {
  const serviceName = config.serviceName || process.env.SERVICE_NAME || 'intelgraph-service';
  logger = pino({
    level: config.logLevel || 'info',
    redact: ['req.headers.authorization', 'password', 'ssn']
  });

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName
  });

  const prometheus = new PrometheusExporter({ port: config.metricsPort || 9464 });
  sdk = new NodeSDK({
    resource,
    metricReader: new PeriodicExportingMetricReader({ exporter: prometheus }),
    instrumentations: [getNodeAutoInstrumentations()]
  });

  await sdk.start();
  logger.info('observability initialized', { serviceName });
}

export async function shutdown() {
  await sdk?.shutdown();
}

export function getLogger(child) {
  return child ? logger.child({ child }) : logger;
}
