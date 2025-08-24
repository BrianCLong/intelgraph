export interface Host {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  assetCriticality: 'low' | 'medium' | 'high';
  policyLabels: string[];
}

export const HostSchema = {
  $id: 'Host',
  type: 'object',
  properties: {
    id: { type: 'string' },
    hostname: { type: 'string' },
    ip: { type: 'string', format: 'ipv4' },
    os: { type: 'string' },
    assetCriticality: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
    },
    policyLabels: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['id', 'hostname', 'ip', 'os', 'assetCriticality', 'policyLabels'],
  additionalProperties: false,
} as const;

export interface Indicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'yara';
  value: string;
  labels: string[];
  sources: string[];
  firstSeen: string;
  lastSeen: string;
  policyLabels: string[];
}

export const IndicatorSchema = {
  $id: 'Indicator',
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: {
      type: 'string',
      enum: ['ip', 'domain', 'url', 'hash', 'email', 'yara'],
    },
    value: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
    firstSeen: { type: 'string', format: 'date-time' },
    lastSeen: { type: 'string', format: 'date-time' },
    policyLabels: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'type', 'value', 'labels', 'sources', 'firstSeen', 'lastSeen', 'policyLabels'],
  additionalProperties: false,
} as const;

export interface Rule {
  id: string;
  kind: 'SIGMA' | 'YARA';
  name: string;
  version: string;
  source: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  content: string;
  policyLabels: string[];
}

export const RuleSchema = {
  $id: 'Rule',
  type: 'object',
  properties: {
    id: { type: 'string' },
    kind: { type: 'string', enum: ['SIGMA', 'YARA'] },
    name: { type: 'string' },
    version: { type: 'string' },
    source: { type: 'string' },
    enabled: { type: 'boolean' },
    severity: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
    },
    tags: { type: 'array', items: { type: 'string' } },
    content: { type: 'string' },
    policyLabels: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'id',
    'kind',
    'name',
    'version',
    'source',
    'enabled',
    'severity',
    'tags',
    'content',
    'policyLabels',
  ],
  additionalProperties: false,
} as const;

export type EntitySchemas = {
  Host: typeof HostSchema;
  Indicator: typeof IndicatorSchema;
  Rule: typeof RuleSchema;
};

export const schemas: EntitySchemas = {
  Host: HostSchema,
  Indicator: IndicatorSchema,
  Rule: RuleSchema,
};
