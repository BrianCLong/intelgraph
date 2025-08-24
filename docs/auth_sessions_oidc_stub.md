# Auth, Sessions & OIDC Stub

Local authentication uses Argon2id hashed passwords. Sessions issue short‑lived JWTs signed with rotating RSA keys and refresh tokens with reuse detection. A minimal OIDC provider exposes discovery, token and userinfo endpoints for deterministic test users.
