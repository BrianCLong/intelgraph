# GA-Platform Architecture

This document outlines the layered architecture of the GA-Platform. Services are split into a TypeScript gateway, a Python platform service, and a React admin console. Shared types live in `common-types` and policy logic in `policy`. PostgreSQL, Redis, and MinIO back the services while JWT keys and audit manifests are rotated regularly.
