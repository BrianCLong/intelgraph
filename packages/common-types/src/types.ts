import { z } from 'zod';

export const entityKinds = [
  'Person',
  'Org',
  'Location',
  'Event',
  'Document',
  'Indicator',
  'Case',
  'Claim',
] as const;

export const edgeTypes = [
  'relatesTo',
  'locatedAt',
  'participatesIn',
  'derivedFrom',
  'mentions',
  'contradicts',
  'supports',
  'enrichedFrom',
] as const;

export const entitySchema = z.object({
  id: z.string(),
  kind: z.enum(entityKinds),
  payload: z.record(z.unknown()),
  observedAt: z.string().datetime(),
  tenantId: z.string(),
  policyLabels: z.array(z.string()).default([]),
  provenance: z
    .object({
      chain: z.array(z.string()),
    })
    .default({ chain: [] }),
});

export const edgeSchema = z.object({
  id: z.string(),
  type: z.enum(edgeTypes),
  sourceId: z.string(),
  targetId: z.string(),
  observedAt: z.string().datetime(),
  tenantId: z.string(),
  policyLabels: z.array(z.string()).default([]),
  provenance: z
    .object({
      chain: z.array(z.string()),
    })
    .default({ chain: [] }),
});

export const connectorSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  kind: z.enum(['BUILTIN', 'PLUGIN']),
  entrypoint: z.string(),
  manifestHash: z.string().optional(),
  permissions: z.array(z.string()),
  paramsSchema: z.record(z.unknown()).optional(),
  policyLabels: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

export const runStatusEnum = z.enum(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DLQ']);

export const runSchema = z.object({
  id: z.string(),
  connectorId: z.string(),
  status: runStatusEnum,
  attempt: z.number().int().nonnegative(),
  scheduleId: z.string().optional(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  metrics: z.object({
    items: z.number().int().nonnegative(),
    bytes: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  }),
  provenanceRef: z.string(),
  dedupeKey: z.string().optional(),
  tenantId: z.string(),
});

export const secretSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.enum(['TENANT', 'GLOBAL']),
  valueEnc: z.string(),
  createdAt: z.string().datetime(),
  rotationAt: z.string().datetime().optional(),
});

export const envelopeKindEnum = z.enum(['ENTITY', 'EDGE']);

export const envelopeSchema = z.object({
  tenantId: z.string(),
  source: z.object({
    name: z.string(),
    url: z.string().url().optional(),
    license: z.string().optional(),
  }),
  kind: envelopeKindEnum,
  type: z.string(),
  payload: z.record(z.unknown()),
  observedAt: z.string().datetime(),
  hash: z.string(),
  policyLabels: z.array(z.string()).default([]),
  provenance: z.object({
    chain: z.array(z.string()),
  }),
  dedupeKey: z.string().optional(),
});

export type Entity = z.infer<typeof entitySchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type Run = z.infer<typeof runSchema>;
export type Secret = z.infer<typeof secretSchema>;
export type Envelope = z.infer<typeof envelopeSchema>;
export type RunStatus = z.infer<typeof runStatusEnum>;
