# GA-DocsNLP Architecture

The GA-DocsNLP stack processes documents through parsing, OCR, language detection, NER, entity linking and redaction. The system is composed of the following services:

- **Gateway**: Node.js GraphQL/Socket.IO API that coordinates workflows and enforces policy.
- **Docs Service**: Python FastAPI service implementing OCR, layout analysis, NER/PII, linking, summarisation and export.
- **Web Console**: React UI powered by Redux Toolkit and jQuery event wiring for document review and redaction.
- **Data Stores**: PostgreSQL for document metadata, Neo4j for entity graphs, Redis for queues/cache and MinIO for object storage.

Services communicate over HTTP/GraphQL and share provenance manifests recorded by the provenance ledger.
