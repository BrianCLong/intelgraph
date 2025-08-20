# Active Measures Portfolio Module for IntelGraph

## Overview
This module adds a robust, unattributable active measures portfolio to IntelGraph, with mature capabilities across domains. It integrates with existing graph analytics, AI extraction, and frontend.

## Installation
- Standalone: `docker-compose up`
- Integrate: Copy files to respective dirs (e.g., src to server/src/active-measures), add to GraphQL schema, update docker-compose.

## Merge Instructions
- Backend: Add resolvers to server/src/graphql/index.ts
- Frontend: Add components to client/src/components, slice to store
- Run: npm install && npm test

## Airgapped Deployment
- Build images locally: docker build -t active-measures .
- Use volumes for models.

## Standards Compliance
- Code: TypeScript strict, 95% coverage.
- Security: NIST-aligned, audit logs enabled.

## Usage
Query: { activeMeasures { portfolio(options: { proportionality: 0.5 }) } }