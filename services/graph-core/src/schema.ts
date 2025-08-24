import { z } from 'zod';

export const EntityType = z.enum([
  'Person',
  'Org',
  'Asset',
  'Account',
  'Location',
  'Event',
  'Document',
  'Communication',
  'Device',
  'Vehicle',
  'FinancialInstrument',
  'Infrastructure',
  'Claim',
  'Indicator',
  'Case'
]);

export const PolicyTags = z.object({
  origin: z.string().optional(),
  sensitivity: z.string().optional(),
  clearance: z.string().optional(),
  legalBasis: z.string().optional(),
  needToKnow: z.string().optional()
});

export const EntitySchema = z.object({
  id: z.string().optional(),
  type: EntityType,
  attributes: z.record(z.any()).default({}),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  policy: PolicyTags.optional()
});

export const RelationshipSchema = z.object({
  id: z.string().optional(),
  from: z.string(),
  to: z.string(),
  type: z.string(),
  attributes: z.record(z.any()).default({}),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  policy: PolicyTags.optional()
});

export type Entity = z.infer<typeof EntitySchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
