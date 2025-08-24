import { Tenant } from '../packages/common-types/src/index';

export async function seed() {
  const tenants: Tenant[] = [
    { id: 't1', name: 'Tenant A' },
    { id: 't2', name: 'Tenant B' }
  ];
  console.log('Seeding demo tenants', tenants);
}

if (require.main === module) {
  seed();
}
