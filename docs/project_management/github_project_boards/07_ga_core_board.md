# Project Board: GA-Core Delivery

## To Do

### Workstream A — Data Plane & Graph Core

*   **Story: A-ING-001 — Register S3 bucket with minimization policy**
    *   **Acceptance Criteria:** Connector status becomes "READY"; dry-run shows redacted payload examples; export license and TOS stored.
*   **Story: A-ETL-004 — Image OCR and EXIF scrub**
    *   **Acceptance Criteria:** EXIF GPS removed unless allowed; OCR text added with confidence; provenance chain records source and enrichers; curated event published to `curated.events`.
*   **Story: A-ER-010 — Merge explainability**
    *   **Acceptance Criteria:** Merge proposed when score ≥ 0.85 with per-feature contributions; audit references ER decision ID.
*   **Story: A-TMP-015 — Snapshot query at time T**
    *   **Acceptance Criteria:** Time-slice query returns only relationships valid at snapshot time.
*   **Story: A-ANL-020 — Policy-aware pathfinding**
    *   **Acceptance Criteria:** Policy check denies traversal without required facets; denial audited with outcome "denied".

### Workstream B — Governance, Security & Ops

*   **Story: B-AUTH-001 — Step-up required for sensitive export**
    *   **Acceptance Criteria:** Step-up prompt required; export blocked if step-up fails.
*   **Story: B-POL-005 — Denial returns policy reason and appeal path**
    *   **Acceptance Criteria:** Denial includes reason and request ID; appeal path provided; audit recorded.
*   **Story: B-SIM-009 — Policy simulation dry-run**
    *   **Acceptance Criteria:** Dry-run outputs diff of prospective denies/allows without affecting production decisions.
*   **Story: B-AUD-012 — Tamper-evident audit chain**
    *   **Acceptance Criteria:** Audit entries hashed and chained; integrity alert on modification.
*   **Story: B-ENC-016 — Per-tenant envelope encryption**
    *   **Acceptance Criteria:** Tenant-specific DEK wrapped by tenant key; cross-tenant reads impossible.
*   **Story: B-SLO-020 — Slow-query killer**
    *   **Acceptance Criteria:** Queries over 5s terminated and audited.

### Workstream C — Experience & Copilot

*   **Story: C-TRI-001 — Time-brush sync across panes**
    *   **Acceptance Criteria:** Timeline brush filters map and graph; graph dims edges outside window.
*   **Story: C-CAN-006 — Pin and annotate selections**
    *   **Acceptance Criteria:** Pinned items create case artifact; annotations audited immutably.
*   **Story: C-NLP-010 — Preview shows risks and requires confirm**
    *   **Acceptance Criteria:** Generated Cypher, rationale, and risks displayed; execution disabled until confirm.
*   **Story: C-NLP-011 — Denied by policy with readable reason**
    *   **Acceptance Criteria:** Policy denial displays reason and access link; denial audited with NL prompt and Cypher.
*   **Story: C-RAG-014 — Answers include inline citations**
    *   **Acceptance Criteria:** Responses show inline citations; redacted spans marked with reason codes.
*   **Story: C-BRF-018 — One-click export with hash manifest**
    *   **Acceptance Criteria:** PDF/HTML export includes hash manifest referencing case ID and audit range.
*   **Story: C-CMT-021 — Immutable comments and mentions**
    *   **Acceptance Criteria:** Comments append-only with versioned diffs; notifications link to audited action.

## Blocked

- _(none)_

## In Progress

- _(none)_

## In Review

- _(none)_

## Done

- _(none)_
