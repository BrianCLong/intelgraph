# Audit Log Operations

- Append-only storage with periodic Merkle roots.
- Roots should be anchored externally for tamper evidence.
- Storage should emulate WORM; retention controlled via `AUDIT_RETENTION_DAYS`.
