# OIDC Gateway

A minimal authentication service that publishes a JSON Web Key Set (JWKS) and
enforces Authentication Context Class Reference (ACR) based step-up
requirements on protected routes.

## Endpoints

- `GET /.well-known/jwks.json` – public JWKS for verifying tokens.
- `POST /token` – issues a demo token. Body accepts `{ "sub": "user", "acr": "urn:pwd" }`.
- `GET /sensitive` – example protected route requiring `acr` of `urn:mfa`.

## Running

```bash
npm install
node server.js
```

Generate a token with MFA and access the sensitive route:

```bash
curl -X POST http://localhost:3000/token -H 'Content-Type: application/json' \
  -d '{"sub":"alice","acr":"urn:mfa"}'
# => { "token": "..." }

curl http://localhost:3000/sensitive -H 'Authorization: Bearer <token>'
```
