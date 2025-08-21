# IntelGraph General Availability Plan

## Executive Summary
6-week critical path to deliver IntelGraph GA with scope A-D (Ingest, Graph Core, Analytics, AI Copilot) + minimal F (Security/Governance/Audit). Focus on shippable artifacts with provenance by default, strict compartmentation, and interoperability.

## Key Assumptions
- Neo4j Enterprise features available for production deployment
- OIDC provider (Auth0/Keycloak) available for SSO integration
- Kubernetes cluster available for production deployment
- S3-compatible object storage available
- Development team of 4-6 engineers with GraphQL/React/Neo4j experience

## 6-Week Critical Path

### Week 1: Foundation & Architecture
**Milestone**: Core infrastructure and data model established

#### Days 1-2: Architecture & Planning
- [ ] Complete C4/PlantUML diagrams for all system components
- [ ] Define trust boundaries and security model
- [ ] Finalize canonical data model (GraphQL SDL + Neo4j schema)
- [ ] Set up development environments and CI/CD pipeline

#### Days 3-5: Core Backend Services
- [ ] GraphQL server with Apollo/Express
- [ ] Neo4j driver setup with constraints and indexes
- [ ] PostgreSQL migrations and metadata schema
- [ ] Redis pub/sub and caching layer
- [ ] Basic tenant isolation middleware

**Risk**: Neo4j schema complexity may require additional modeling time
**Mitigation**: Start with simplified schema, iterate based on use cases

### Week 2: Ingest & ETL Pipeline
**Milestone**: Data ingestion pipeline operational with 3 reference connectors

#### Days 6-8: Connector SDK & Core Ingest
- [ ] Connector SDK with plugin architecture
- [ ] HTTP/CSV reference connector
- [ ] S3 reference connector
- [ ] STIX/TAXII reference connector
- [ ] Ingest wizard with schema mapping UI

#### Days 9-10: ETL Enrichment Pipeline
- [ ] Streaming ETL with Apache Kafka/Redis Streams
- [ ] GeoIP enrichment service
- [ ] Language detection service
- [ ] NER (Named Entity Recognition) service
- [ ] OCR/EXIF metadata scrubbing

**Risk**: STIX/TAXII connector complexity
**Mitigation**: Use existing libraries (stix2, taxii2-client), focus on core STIX objects

### Week 3: Entity Resolution & Graph Core
**Milestone**: Entity resolution with explainable scoring operational

#### Days 11-13: Entity Resolution Engine
- [ ] Deterministic ER rules engine
- [ ] Probabilistic ER with ML scoring
- [ ] Explainable scorecard generation
- [ ] Reconciliation queue management
- [ ] Bitemporal versioning (validFrom/validTo)

#### Days 14-15: Graph Core Operations
- [ ] Entity CRUD operations with provenance
- [ ] Relationship management with confidence scoring
- [ ] Graph traversal optimization
- [ ] Multi-tenant data isolation enforcement

**Risk**: ER accuracy may require extensive tuning
**Mitigation**: Start with rule-based approach, add ML incrementally

### Week 4: Analytics & Visualization
**Milestone**: Analytics canvas with core visualization features

#### Days 16-18: Analytics Engine
- [ ] Link analysis algorithms (centrality, community detection)
- [ ] Pathfinding with multiple algorithms (shortest path, all paths)
- [ ] Temporal analysis with timeline visualization
- [ ] Geospatial analysis with map integration
- [ ] Anomaly detection with pluggable detectors

#### Days 19-20: Frontend Visualization
- [ ] React 18 + Material UI tri-pane layout
- [ ] Cytoscape.js graph canvas with jQuery interactions
- [ ] Timeline component with synchronized brushing
- [ ] Map component with geospatial overlays
- [ ] Hypothesis workbench for analyst workflows

**Risk**: Cytoscape.js performance with large graphs
**Mitigation**: Implement virtualization and progressive loading

### Week 5: AI Copilot & Advanced Features
**Milestone**: AI Copilot operational with RAG and query assistance

#### Days 21-23: AI Copilot Core
- [ ] NL to Cypher/SQL query generator
- [ ] Query preview and sandbox environment
- [ ] RAG service with vector embeddings
- [ ] Inline citation formatting
- [ ] Schema-aware ETL assistance

#### Days 24-25: Advanced Analytics
- [ ] Hypothesis testing framework
- [ ] Competing hypothesis generation
- [ ] Evidence weighting and confidence scoring
- [ ] Export with provenance manifests
- [ ] Policy simulation and testing

**Risk**: NL to Cypher accuracy may be limited
**Mitigation**: Provide query templates and guided query builder

### Week 6: Security, Testing & Production Readiness
**Milestone**: Production-ready system with comprehensive security and testing

#### Days 26-28: Security & Governance
- [ ] OIDC SSO integration
- [ ] OPA policy engine with ABAC/RBAC
- [ ] Audit logging ("who saw what when")
- [ ] Per-tenant envelope encryption
- [ ] Redaction and K-anonymity toolkit

#### Days 29-30: Testing & Deployment
- [ ] Comprehensive test suite (≥85% critical path coverage)
- [ ] Performance testing and SLO definition
- [ ] Production deployment scripts
- [ ] Monitoring and observability setup
- [ ] Documentation and user guides

**Risk**: Security audit may reveal additional requirements
**Mitigation**: Engage security team early, implement defense-in-depth

## Branch Strategy
```
main
├── feature/foundation (Week 1)
├── feature/ingest (Week 2)
├── feature/entity-resolution (Week 3)
├── feature/analytics (Week 4)
├── feature/ai-copilot (Week 5)
├── feature/security (Week 6)
└── release/1.0.0-ga
```

## RACI Matrix
| Component | Architect | Backend | Frontend | DevOps | QA | Security |
|-----------|-----------|---------|----------|--------|----|---------  |
| Architecture | A | C | C | C | I | C |
| GraphQL API | C | A | C | I | R | C |
| Neo4j Schema | A | R | I | I | C | C |
| Frontend | C | I | A | I | R | I |
| Security | C | C | C | C | R | A |
| Testing | I | R | R | C | A | C |
| Deployment | C | C | I | A | C | R |

**Legend**: A=Accountable, R=Responsible, C=Consulted, I=Informed

## CI/CD Gates
1. **Code Quality**: ESLint, Prettier, SonarQube
2. **Security**: SAST (CodeQL), dependency scanning
3. **Testing**: Unit (≥85%), Integration, E2E
4. **Performance**: k6 smoke tests, bundle size limits
5. **Security**: OWASP ZAP, SQLi/XSS scanning
6. **Documentation**: API docs generation, user guides

## Key Risks & Mitigations

### High Impact Risks
1. **Neo4j Performance**: Large graph traversals may exceed SLOs
   - *Mitigation*: Implement query budgeting, result pagination, caching
2. **Entity Resolution Accuracy**: False positives/negatives impact user trust
   - *Mitigation*: Explainable AI, manual review workflows, confidence thresholds
3. **Security Compliance**: Multi-tenancy isolation requirements
   - *Mitigation*: Defense-in-depth, security audit, pen testing

### Medium Impact Risks
1. **Frontend Performance**: Large datasets impact visualization
   - *Mitigation*: Virtualization, progressive loading, data sampling
2. **AI Copilot Accuracy**: NL queries may produce incorrect results
   - *Mitigation*: Query validation, user confirmation, fallback options

## Success Metrics
- **Performance**: Graph queries <2s p95, UI interactions <100ms
- **Accuracy**: Entity resolution F1 score >0.8
- **Security**: Zero critical vulnerabilities, SOC2 Type II ready
- **Usability**: Task completion rate >90%, user satisfaction >4/5
- **Reliability**: 99.9% uptime, RTO <4h, RPO <1h

## Post-GA Roadmap
- Week 7-8: Advanced AI features (predictive analytics, automated insights)
- Week 9-10: Enterprise integrations (SIEM, threat intel feeds)
- Week 11-12: Mobile companion app for field analysts