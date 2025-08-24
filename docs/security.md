# Security Model

GA-Field applies defense in depth across client and server components.

- Device keys use Ed25519 and sign every request.
- Blobs are encrypted with per-blob keys wrapped by tenant master keys.
- The service worker enforces a passcode lock and supports remote wipe.
- Postgres tables employ row level security; policy labels restrict graph visibility.
- CSP and CSRF defenses are enabled for the web application.
