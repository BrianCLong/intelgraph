import fetch from 'node-fetch';

async function seed() {
  const tenantRes = await fetch('http://localhost:8000/tenant/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Acme', slug: 'acme' })
  });
  const tenant = await tenantRes.json();
  await fetch('http://localhost:8000/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tenant.id,
      email: 'owner@example.com',
      password: 'changeme',
      name: 'Owner'
    })
  });
  console.log('seed complete');
}

seed();
