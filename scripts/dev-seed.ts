import fetch from 'node-fetch';

async function seed() {
  const kyc = [{ tenantId: 't1', partyKey: 'P1', name: 'Alice', riskBase: 10 }];
  await fetch('http://localhost:8000/kyc/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: kyc })
  });
  const txs = [{ id: '1', tenantId: 't1', ts: '2024-01-01T00:00:00Z', srcAcctId: 'A1', channel: 'CASH', amount: 9000, currency: 'USD' }];
  await fetch('http://localhost:8000/ingest/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: txs, fxFixture: { USD: 1 } })
  });
  await fetch('http://localhost:8000/scenario/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'STRUCT', name: 'Structuring', rule: { field: 'amount', op: 'lt', value: 10000 }, params: { count: 2 }, severity: 'HIGH', enabled: true })
  });
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
