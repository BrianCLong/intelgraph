# Security

Access is controlled with JWT based RBAC and ABAC policies.  Postgres
employs row level security per tenant.  The web application enforces a
strict Content Security Policy with no inline scripts.
