/**
 * Dev seed script populates demo tenants, devices, and cases.
 * Data is written to JSON files for simplicity.
 */
import { writeFileSync } from 'node:fs';

interface DemoData {
  tenants: { id: string; name: string }[];
  devices: { id: string; tenantId: string; name: string }[];
  cases: { id: string; tenantId: string; title: string }[];
}

const data: DemoData = {
  tenants: [
    { id: 't1', name: 'Alpha' },
    { id: 't2', name: 'Bravo' }
  ],
  devices: [
    { id: 'd1', tenantId: 't1', name: 'Demo Device 1' },
    { id: 'd2', tenantId: 't2', name: 'Demo Device 2' }
  ],
  cases: [
    { id: 'c1', tenantId: 't1', title: 'Case One' },
    { id: 'c2', tenantId: 't2', title: 'Case Two' }
  ]
};

writeFileSync('demo-seed.json', JSON.stringify(data, null, 2));
console.log('Demo data written to demo-seed.json');
