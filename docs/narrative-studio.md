# Narrative Studio: Brief Builder, Auto-Charts & Cited Exports

## Mission
Turn analyses into shareable narratives: compose briefs with live graph queries, auto-charts/tables, inline citations with provenance, and one-click export to PDF/HTML. Schedule recurring reports.

## Touchpoints
- **Renderer:** `NarrativeRenderer` (server) supports blocks: Markdown, `QueryBlock` (GraphQL/Cypher), `ChartBlock` (vega-lite), `TableBlock`, `Callout`, `Citation`.
- **UI:** `NarrativeStudio` editor with block palette, variables, templates, and live preview.
- **Services:** `ReportService` (scheduling, permission checks), `CitationService` (attach lineage and source URIs), `ExportService` (PDF/HTML with signed manifest).

## Deliverables
- **Block Model:** extensible block schema; variables (e.g., `caseId`, `asOf`), safe evaluation sandbox.
- **Live Data Blocks:** embed queries that resolve at render time; cache with TTL and snapshot option for reproducibility.
- **Charts:** auto-suggest chart types from result shape; switchable to manual spec; annotations and thresholds.
- **Citations & Provenance:** every data block carries source lineage; export includes bibliography and policy summary.
- **Templates:** starter briefs—"Case Summary", "Entity Profile", "Relationship Map", "Weekly Ops"—with merge fields.
- **Scheduling:** cron-style or relative cadence; notify subscribers; store renders with immutable hashes.

## APIs
- `mutation createNarrative(input: NarrativeInput!): Narrative!`
- `mutation renderNarrative(id: ID!, params: JSON, snapshot: Boolean=false): Render!`
- `mutation scheduleNarrative(id: ID!, cadence: Cron!, recipients: [Email!]!): Schedule!`
- `query listNarratives(): [Narrative!]`

## Observability and Security
- **Metrics:** render time, cache hit rate, failed blocks; scheduled run outcomes.
- **Policy:** narrative renders execute as the viewer; exports run through license/consent gate; hash-signed bundles.

## Tests (E2E)
Build a template with live blocks → preview → export → verify citations and manifest → schedule weekly run → confirm email/WS notifications and stored renders.

## Branch and PR Strategy
Use `feature/narrative-studio-v1` with templates, renderer tests, and sample exports.

## Definition of Done
Editor usable; renders are reproducible and cited; scheduled exports deliver reliably.

## Milestones
1. **S1:** Blocks and renderer.
2. **S2:** Templates and charts.
3. **S3:** Scheduling and exports.

## Cross-track Alignment
- Temporal Graph powers time-bounded Search, Cases timelines, and GraphOps as-of analytics.
- Unified Search surfaces Cases, Entities (post-ER), and Snapshots with explainable scoring.
- Narrative Studio consumes Search results, GraphOps outputs, and Snapshots with full provenance; exports respect Access Control and Governance.

