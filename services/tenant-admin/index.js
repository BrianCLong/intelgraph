import express from 'express';

const app = express();
app.use(express.json());

// Audit logging middleware
app.use((req, res, next) => {
  console.log(`audit: ${req.method} ${req.path}`);
  next();
});

// Quota enforcement stub
app.use((req, res, next) => {
  next();
});

// Tenant management endpoints
app.post('/orgs', (req, res) => {
  res.status(201).json({ id: 'org-placeholder' });
});

app.post('/projects', (req, res) => {
  res.status(201).json({ id: 'project-placeholder' });
});

app.post('/quotas', (req, res) => {
  res.status(201).json({ id: 'quota-placeholder' });
});

// Billing events
app.post('/billing/events', (req, res) => {
  res.status(202).json({ status: 'accepted' });
});

// SSO initiation stubs
app.post('/sso/saml/initiate', (req, res) => {
  res.status(200).json({ redirect: '/saml/acs' });
});

app.post('/sso/oidc/initiate', (req, res) => {
  res.status(200).json({ redirect: '/oidc/callback' });
});

// SSO callbacks
app.post('/sso/saml/acs', (req, res) => {
  res.status(200).json({ status: 'saml-acs' });
});

app.post('/sso/oidc/callback', (req, res) => {
  res.status(200).json({ status: 'oidc-callback' });
});

// SCIM subset
app.post('/scim/v2/Users', (req, res) => {
  res.status(201).json({ id: 'user-placeholder' });
});

app.post('/scim/v2/Groups', (req, res) => {
  res.status(201).json({ id: 'group-placeholder' });
});

export default app;

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`tenant-admin listening on ${port}`);
  });
}
