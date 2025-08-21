# GA-Core Issue Tracker

This file enumerates GA-Core issues for IntelGraph across three workstreams.

## Workstream A — Data Plane & Graph Core

### A-ING-001: Register S3 bucket with minimization policy
- **Story:** Source onboarding & minimization.
- **Acceptance Criteria:**
  - Connector status becomes "READY".
  - Dry-run shows redacted payload examples.
  - Export license and TOS stored with source metadata.

### A-ETL-004: Image OCR and EXIF scrub
- **Story:** Streaming ETL enrichers.
- **Acceptance Criteria:**
  - EXIF GPS removed unless policy allows retention.
  - OCR text added under `enrichment.ocr.text` with confidence.
  - Provenance chain records source and enrichers.
  - Curated event published to `curated.events`.

### A-ER-010: Merge explainability
- **Story:** Entity resolution decisions.
- **Acceptance Criteria:**
  - Merge proposed when score ≥ 0.85 with per-feature contributions.
  - Audit record references ER decision ID.

### A-TMP-015: Snapshot query at time T
- **Story:** Bitemporal & geo queries.
- **Acceptance Criteria:**
  - Query returns only relationships valid at snapshot time.

### A-ANL-020: Policy-aware pathfinding
- **Story:** Analytics readiness.
- **Acceptance Criteria:**
  - Policy check denies traversal without required facets.
  - Denial audited with outcome "denied".

## Workstream B — Governance, Security & Ops

### B-AUTH-001: Step-up required for sensitive export
- **Story:** OIDC + SCIM + step-up.
- **Acceptance Criteria:**
  - Step-up prompt required for sensitive export and must succeed within 5 minutes.
  - Export blocked if step-up fails.

### B-POL-005: Denial returns policy reason and appeal path
- **Story:** ABAC with need-to-know facets (OPA).
- **Acceptance Criteria:**
  - Denied access returns reason "Missing case facet" and request ID.
  - Response includes appeal path.
  - Audit record written with outcome "denied".

### B-SIM-009: Policy simulation dry-run
- **Story:** Policy simulation.
- **Acceptance Criteria:**
  - Dry-run outputs diff of prospective denies/allows.
  - No production decisions changed.

### B-AUD-012: Tamper-evident audit chain
- **Story:** Audit schema & integrity.
- **Acceptance Criteria:**
  - Audit entries hashed and chained hourly.
  - Verification failure raises integrity alert on modification.

### B-ENC-016: Per-tenant envelope encryption
- **Story:** Encryption & key management.
- **Acceptance Criteria:**
  - Data written with tenant-specific DEK wrapped by tenant key.
  - Cross-tenant reads impossible.

### B-SLO-020: Slow-query killer
- **Story:** SLOs & cost guardrails.
- **Acceptance Criteria:**
  - Queries exceeding 5s are terminated and audited.

## Workstream C — Experience & Copilot

### C-TRI-001: Time-brush sync across panes
- **Story:** Tri-pane sync & link canvas.
- **Acceptance Criteria:**
  - Timeline brush filters map and graph views.
  - Graph dims edges outside brushed window.

### C-CAN-006: Pin and annotate selections
- **Story:** Tri-pane sync & link canvas.
- **Acceptance Criteria:**
  - Pinned items create case artifact.
  - Annotations audited immutably.

### C-NLP-010: Preview shows risks and requires confirm
- **Story:** NL→Cypher preview sandbox.
- **Acceptance Criteria:**
  - Generated Cypher, rationale, and risk annotations displayed.
  - Execution disabled until user confirms.

### C-NLP-011: Denied by policy with readable reason
- **Story:** NL→Cypher preview sandbox.
- **Acceptance Criteria:**
  - Policy denial displays human-readable reason and access link.
  - NL prompt, generated Cypher, and decision audited.

### C-RAG-014: Answers include inline citations
- **Story:** RAG with inline citations & redaction.
- **Acceptance Criteria:**
  - Responses show inline citations for each sentence or paragraph.
  - Redacted spans marked with reason codes.

### C-BRF-018: One-click export with hash manifest
- **Story:** Brief/Report Studio export.
- **Acceptance Criteria:**
  - PDF/HTML export includes manifest hashing each exhibit and transform.
  - Package references case ID and audit range.

### C-CMT-021: Immutable comments and mentions
- **Story:** Comments & @mentions with audit.
- **Acceptance Criteria:**
  - Comments append-only; edits create new versions with diffs.
  - Notifications include links to audited action.
