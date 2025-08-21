# AuthZ Gateway

Node-based authentication and authorization reverse proxy that issues JWTs, exposes JWKS, and enforces OPA policies.

## Observability

The gateway emits structured logs via Pino, exports Prometheus metrics on `/metrics`, and initializes OpenTelemetry tracing.

## Development

```bash
npm install
npm run dev
```
