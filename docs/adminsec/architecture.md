# GA-AdminSec Architecture

This document provides a high level overview of the GA-AdminSec vertical slice. It covers the IAM, policy engine, secrets vault, licensing, and compliance reporting components.

```
[Tenant/User] -> [Auth Service (OIDC)] -> [Gateway] -> [Policy Service] -> [Resource]
                                    \-> [Vault]
                                    \-> [Compliance]
```

## Components

### Auth Service
- Stub OIDC provider implementing the Authorization Code + PKCE flow.
- Issues JWTs signed with per-tenant RSA keys.

### Policy Service
- Evaluates RBAC and ABAC policies using a minimal CEL-like DSL.
- Exposes feature flag and license verification endpoints.

### Secrets Vault
- Stores encrypted secrets metadata and supports basic key rotation.

### Compliance Service
- Generates simple audit summaries.

### Gateway
- GraphQL API that orchestrates the services and enforces authorization middleware.

```
+------------+       +-----------+       +---------+
| Auth/Z JWT |-----> | Gateway   |-----> | Policy  |
+------------+       | GraphQL   |       +---------+
       |              |           |             |
       v              v           |             v
   [JWKS]         [Audit Log]     |        [Feature Flags]
```
