# GA-Investigator Architecture

The system consists of a Node.js gateway providing GraphQL and Socket.IO APIs, a Python FastAPI investigator service handling scenes, pivots and notebooks, and a React web console. Supporting services include PostgreSQL, Neo4j, Redis and MinIO. Services communicate over the internal network defined in `infra/docker-compose.yml`.
