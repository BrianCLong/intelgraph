export interface Subscriber {
  id: string;
  msisdn: string;
  label?: string;
  risk?: string;
}

export const subscriberSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Subscriber',
  type: 'object',
  properties: {
    id: { type: 'string' },
    msisdn: { type: 'string' },
    label: { type: 'string' },
    risk: { type: 'string' }
  },
  required: ['id', 'msisdn'],
  additionalProperties: false
} as const;
