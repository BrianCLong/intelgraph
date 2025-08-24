const BASE = process.env.TENANT_ADMIN_URL || 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

export const createOrg = (data) => post('/orgs', data);
export const createProject = (data) => post('/projects', data);
export const createQuota = (data) => post('/quotas', data);
export const initiateSaml = (data) => post('/sso/saml/initiate', data);
export const initiateOidc = (data) => post('/sso/oidc/initiate', data);
export const scimUser = (data) => post('/scim/v2/Users', data);
export const scimGroup = (data) => post('/scim/v2/Groups', data);
export const billingEvent = (data) => post('/billing/events', data);
