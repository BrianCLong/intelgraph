# Privacy & Redaction Layer

This document outlines the design for IntelGraph's privacy service. The service detects personal data, performs reversible tokenization, and enforces differential privacy on exported aggregates.

## DPIA Template

1. **Purpose**: Describe processing activity and lawful basis.
2. **Data Types**: Enumerate PII fields and retention periods.
3. **Risks**: Linkage attacks, key misuse, model drift.
4. **Mitigations**: Tokenization, ABAC gates, DP budgets.
5. **Review**: Security and legal sign‑off; provenance manifest attached.

## Lawful Bases

- **Operational necessity** – reversible tokens.
- **Legal requirement** – irreversible purge using BLAKE3.
- **Consent** – user initiated processing with opt‑out.

## Data Subject Workflows

- **Access**: Detokenization requires reason for access and ABAC approval.
- **Erasure**: `POST /settings/purge` replaces tokens with one‑way hashes.
- **Audit**: Provenance ledger records all redaction decisions.

## Incident Runbook

1. Alert triggers on anomalous detokenize requests.
2. Freeze budgets for affected tenants.
3. Rotate AES‑SIV keys and peppers via KMS.
4. Notify stakeholders and generate DPIA addendum.
