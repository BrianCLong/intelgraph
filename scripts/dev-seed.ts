import fs from 'fs';
import path from 'path';

const data = {
  tenants: [{ id: 't1', name: 'Tenant 1' }],
  users: [{ id: 'u1', tenantId: 't1', name: 'Analyst' }],
  cases: [{ id: 'c1', tenantId: 't1', name: 'Sample Case' }]
};

fs.writeFileSync(path.join(__dirname, 'seed.json'), JSON.stringify(data, null, 2));
console.log('seeded');
