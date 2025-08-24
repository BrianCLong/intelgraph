# GA-AdminSec Architecture Overview

This document outlines the high-level architecture for the GA-AdminSec vertical slice. It describes the flow from tenant and user creation through authentication, policy enforcement, secrets handling, licensing, and audit/compliance reporting.

## Components

- **Auth Service**: Provides OIDC endpoints, password and TOTP authentication, JWT issuance, and JWKS rotation.
- **Policy Service**: Evaluates RBAC/ABAC policies, manages feature flags and licenses, and orchestrates backups and key rotation for the secrets vault.
- **Gateway**: Exposes GraphQL APIs, applies authorization directives, and interacts with the Auth and Policy services.
- **Compliance Service**: Generates audit summaries and compliance reports.
- **Web Console**: React application for administrators to manage tenants, users, policies, keys, and audits.

## Data Stores

- PostgreSQL for persistent entities.
- Redis for sessions and rate limiting.
- MinIO for backups, JWKS archives, and reports.

## Flow Summary

1. A tenant and user are created in the Auth service.
2. The user logs in using the Authorization Code + PKCE flow with TOTP verification.
3. The Auth service mints an RS256 JWT and exposes the public key via JWKS.
4. GraphQL requests pass through the Gateway, which enforces RBAC/ABAC policies via the Policy service.
5. Secrets are stored and rotated through the Policy service's vault subsystem.
6. Feature flags and license checks control access to specific functionality.
7. All actions produce audit events. The Compliance service aggregates these events into reports.

## Status

This document serves as a starting point. The implementation is pending.

