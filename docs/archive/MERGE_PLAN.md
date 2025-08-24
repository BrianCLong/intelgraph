# IntelGraph Merge Plan - 64 Active PRs

## Batch Strategy (9 batches, 5-8 PRs each)

### Batch A: Tooling & Infrastructure (5 PRs) - SAFEST FIRST

**Risk: LOW** | **Dependencies: None**

- 377: `chore: fix eslint setup`
- 369: `feat: add metrics endpoint and dev bootstrap`
- 384: `feat: initialize telemetry service`
- 379: `test: add persisted query enforcement test`
- 375: `Feature/analytics pipeline`

### Batch B: Documentation & Architecture (4 PRs) - LOW RISK

**Risk: LOW** | **Dependencies: None**

- 483: `docs: add PsyOps risk assessment matrix`
- 390: `docs: expand roadmap with streaming and search`
- 360: `docs: mark next sprints as completed`
- 475: `docs: add narrative generation system design`

### Batch C: Bug Fixes & Maintenance (3 PRs) - CRITICAL PATH

**Risk: LOW-MEDIUM** | **Dependencies: None**

- 389: `fix: harden startup guardrails`
- 367: `fix: trim debug console logs from client bootstrap`
- 472: `feat: log llm usage for analytics`

### Batch D: Backend Services Foundation (6 PRs) - CORE LAYER

**Risk: MEDIUM** | **Dependencies: A, C**

- 361: `feat(server): add status endpoint for service info`
- 366: `feat: enable telemetry and metrics automation`
- 392: `feat: add workspace and audit logging`
- 476: `refactor: add modular agent SDK`
- 391: `feat: add FastAPI auth with RBAC skeleton`
- 398: `feat: add analyst assistant chat endpoint`

### Batch E: Data & Analytics Core (7 PRs) - DATA LAYER

**Risk: MEDIUM** | **Dependencies: D**

- 492: `feat: harden universal ingest with dlq`
- 403: `feat: add entity change history`
- 402: `feat: add graph snapshot diffing`
- 374: `feat: add Celery scheduled analytics with alerts`
- 409: `feat: enrich entities with third-party threat intel`
- 404: `feat: add threat feed ingestion pipelines`
- 436: `feat(ml): add model registry and retry queue`

### Batch F: AI/ML Pipeline (8 PRs) - AI LAYER

**Risk: MEDIUM-HIGH** | **Dependencies: E**

- 538: `feat: enhance graph services and sentiment volatility chart`
- 506: `feat: add micro alpha detector pipeline`
- 478: `feat(ml): optimize GNN inference with quantization`
- 463: `feat: add transformer link suggestions`
- 482: `feat: add hybrid entity resolution pipeline`
- 497: `feat(er): canonical_id, merges/splits + audit log`
- 388: `feat: integrate real ai extraction pipelines`
- 490: `feat: adaptive summary feedback with export options`

### Batch G: Security & Multi-tenancy (7 PRs) - SECURITY LAYER

**Risk: HIGH** | **Dependencies: D, E** | **REQUIRES CAREFUL TESTING**

- 499: `feat(ops): per-tenant LLM budgets + retrieval-only degrade`
- 481: `feat: add tamper-evident audit trail`
- 471: `feat: add request sanitization middleware`
- 449: `feat: enforce tag-based access control`
- 386: `feat: tenant-aware auth and microexpression analysis docs`
- 526: `feat: enforce tenant-aware graph resolvers`
- 297: `feat(security): enforce tenant scoping across API/DB/cache` [DRAFT - REVIEW FIRST]

### Batch H: Graph & Performance (8 PRs) - GRAPH LAYER

**Risk: HIGH** | **Dependencies: G** | **AFTER SECURITY**

- 493: `feat: harden GraphQL performance`
- 465: `refactor(graphql): modularize schema with federation`
- 376: `feat(graph): tenant-scoped caching and LOD`
- 447: `feat(graph): implement GDS-based node clustering`
- 432: `feat: add real-time entity locking`
- 489: `feat: integrate forecast alerts with auto-retraining`
- 438: `feat: notify anomalies in real time`
- 450: `feat: add entity image upload`

### Batch I: Frontend & Collaboration (11 PRs) - UI LAYER

**Risk: MEDIUM** | **Dependencies: F, G, H** | **FINAL LAYER**

- 508: `feat: add dark mode and accessibility toggles`
- 378: `feat(client): add AI insights panel with community overlays`
- 429: `feat: add analyst dashboard mvp`
- 424: `feat(ui): add analyst workbench with drag and AI assist`
- 423: `feat: add advanced graph search`
- 405: `feat: add real-time analyst dashboard and alert triage`
- 373: `feat: add data fusion panel and reports dashboard`
- 491: `feat: add collaborative editing enhancements`
- 408: `feat: add collaborative workspace service`
- 387: `feat: expand insight panel controls and load testing`
- 485: `feat: add neural influence map dashboard`

### Specialized Intelligence Features (Deferred to Phase 2)

**Risk: VARIABLE** | **Can be merged independently after core**

- 507: `feat: add tactical wargaming simulation engine`
- 484: `feat: automate roadmap updates`
- 480: `feat: add disinformation detection module`
- 477: `feat: expand threat simulations with live feeds`
- 473: `feat: add browser extension for psyops monitoring`
- 470: `feat: adapt explanations by authority`
- 469: `feat: add ideological alignment screening`
- 468: `feat: add cognitive twin service`
- 467: `feat: add real-time behavioral dna inference`
- 466: `docs: add cognitive terrain evaluation framework`
- 428: `feat: add threat analytics engine`

## Execution Rules:

1. **Smoke test after each batch**: `make up && make seed && make smoke`
2. **Enable rerere**: `git config rerere.enabled true`
3. **Roll back on failure**: If smoke fails, revert last PR in batch
4. **GraphRAG protection**: Maintain both `useCase` and `rankingStrategy` paths

## Success Criteria:

- All CI checks pass (lint, typecheck, test, build)
- Smoke tests green after each batch
- No new TypeScript errors
- Main branch remains deployable
