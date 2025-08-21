# Data Intake & Preparation – Set A

This document outlines eight foundational modules focusing on connectors, schema mapping, PII handling, streaming ETL, and license/TOS compliance.

## 1. Connector Hub v1 (HTTP/S3/GCS/Azure)
- **Folder:** `/services/ingest/connectors-core/`
- **API:** `POST /connect/:type/pull`
- **Acceptance:** Pulls from HTTP, S3, GCS, and Azure Blob, normalizing CSV/Parquet/JSON to NDJSON with provenance. Sample feeds confirm end-to-end ingestion.

## 2. STIX/TAXII + MISP Pullers
- **Folder:** `/services/ingest/cti-adapters/`
- **API:** `POST /taxii/pull`, `POST /misp/pull`
- **Acceptance:** Imports Indicators of Compromise with full source chain metadata and maps them to the canonical threat intelligence schema.

## 3. Schema-Map Wizard + DPIA Checklist
- **Folder:** `/services/ingest/schema-wizard/`
- **API:** `POST /map/preview`, `POST /map/apply`
- **Acceptance:** Supports rule-based field mapping, captures DPIA answers, and generates PII tags for mapped fields.

## 4. Streaming ETL Enrichers (GeoIP/Language/NER/OCR)
- **Folder:** `/services/ingest/enrichers/`
- **Bus:** Redis/Kafka adapter interface
- **Acceptance:** Chains four or more enrichers, achieves ≥5k records per minute in CI, and logs EXIF metadata scrubbing.

## 5. PII Classifier + Redaction Presets
- **Folder:** `/services/ingest/pii/`
- **API:** `POST /pii/classify`, `POST /pii/redact`
- **Acceptance:** Detects emails, SSNs, and phone numbers, attaching redaction logs to provenance records.

## 6. Data License Registry & TOS Enforcement
- **Folder:** `/services/ingest/license-registry/`
- **API:** `POST /license/check`
- **Acceptance:** Blocks ingestion from disallowed sources and ensures exports include license references.

## 7. Case Importers (CSV/Agency Exports)
- **Folder:** `/services/ingest/case-importers/`
- **API:** `POST /case/import`
- **Acceptance:** Loads discovery and document sets while preserving full provenance chains.

## 8. OSINT Feed Pack (RSS/Git/email)
- **Folder:** `/services/ingest/osint-pack/`
- **API:** `POST /osint/subscribe`
- **Acceptance:** Subscribes to external feeds, normalizes content, throttles requests, and respects robots.txt and licensing.
