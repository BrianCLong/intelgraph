# GA-Insight Architecture

The system is organized as a set of services connected through message queues and shared databases.
- **Gateway**: Node.js GraphQL API that fronts clients and proxies analytics requests.
- **Analytics**: Python service performing feature extraction, embeddings, and scoring jobs.
- **Web**: React client served through the gateway with Socket.IO for real-time events.
- **Datastores**: Neo4j for graph data, PostgreSQL for relational records, and Redis for caching/queues.
- **Provenance Ledger**: Utilities that track hashes for analytics artifacts to support signed reports.
Each component runs locally via `docker-compose` for development.
