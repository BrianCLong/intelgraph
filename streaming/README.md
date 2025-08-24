# Real-Time Streaming Slice

This directory contains a minimal real-time ingestion and alerting pipeline composed of:

- **ingest-gw** – Fastify service that accepts events and produces them to Kafka.
- **stream-jobs** – Kotlin Kafka Streams topology that joins entity features and emits alerts.
- **alerts-api** – Fastify server that streams alerts to clients via Server-Sent Events.

These services showcase the end-to-end flow described in the IntelGraph advisory report.
