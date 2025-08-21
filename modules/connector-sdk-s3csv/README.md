# Connector SDK S3-CSV Example

This module provides a minimal connector SDK and a reference S3 CSV/Parquet connector.

## Installation

```bash
cd modules/connector-sdk-s3csv
poetry install
```

## Usage

### Health Endpoint

Run a tiny FastAPI service for health checks:

```bash
poetry run python app.py
```

The service binds to `PORT` (default `7105`) and exposes `GET /healthz` returning `{"status":"ok"}`.

### CLI

The `ig-connector` CLI loads connectors by name from the `connectors/` folder.

Discover buckets:

```bash
poetry run ig-connector s3csv discover
```

Preview the first 10 rows of a file (schema inferred):

```bash
poetry run ig-connector s3csv preview --uri s3://bucket/key.csv
```

Ingest the whole file streaming NDJSON to stdout:

```bash
poetry run ig-connector s3csv ingest --uri s3://bucket/key.csv
```

All outputs include `provenance.source`, `license`, and a `transform_chain` field.

## Environment

Copy `.env.example` to `.env` and fill in AWS credentials as needed. No real
credentials are stored in this repository.
