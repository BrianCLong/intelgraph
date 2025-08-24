# Ingest and Normalize

This guide outlines the ingestion pipeline for location data in IntelGraph GA-GeoTemporal. It covers supported formats, normalization steps, and storage details.

## Pipeline Overview

```
CSV/JSON/GPX -> Parser -> Normalizer -> H3 Indexer -> PostgreSQL + Manifest
```

## Supported Formats
- **CSV**: `ts,lat,lon,speed,heading,subject_id`
- **JSON**: array of point objects with timestamp and coordinates
- **GPX**: GPS Exchange files containing tracks and segments

## Normalization Steps
1. **Parse input** using schema validation.
2. **Compute H3 indexes** at resolutions 7 and 9.
3. **Apply optional thinning** via Douglas–Peucker simplification.
4. **Write provenance manifest** with checksums.

## Normalized Output
Normalized points contain:

- `id`
- `tenantId`
- `subjectId`
- `ts`
- `lat`/`lon` (original)
- `h3_7`, `h3_9`
- `speed`, `heading`, `accuracyM?`
- `sourceRef`

## Storage
Normalized points are persisted to PostgreSQL with tenant scoping and provenance metadata. H3 cells enable fast spatial queries and aggregations.

## Manifest
A signed manifest records counts and cryptographic hashes for all ingested files, ensuring tamper-evident provenance. Example:

```json
{
  "source": "fixtures/sample.csv",
  "points": 1200,
  "sha256": "abc123...",
  "h3Res": [7, 9]
}
```
