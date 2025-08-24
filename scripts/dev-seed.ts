import { RawEntity } from '../packages/common-types/src';

// simple seed of raw entities
const seeds: RawEntity[] = [
  { id: '1', tenantId: 't1', type: 'PERSON', names: ['Alice'], emails_hash: [], phones_hash: [] },
  { id: '2', tenantId: 't1', type: 'PERSON', names: ['Alicia'], emails_hash: [], phones_hash: [] }
];
console.log('Seeded', seeds.length, 'entities');
