# IntelGraph GA Core Release Plan

## 8-10 Week Execution Plan

### Epic A: Data Intake & Prep (Weeks 1-2)

**Owner**: Data Platform Team

#### Stories:
1. **Connectors Catalog**
   - AC1: Catalog displays 5+ certified connectors (CSV, JSON, SQL, REST API, S3)
   - AC2: Each connector shows compatibility matrix and usage examples
   - AC3: Connector marketplace allows filtering by data type and compliance

2. **Ingest Wizard**
   - AC1: Schema mapping interface auto-detects field types with 90% accuracy
   - AC2: PII/DPIA scanner identifies sensitive fields with policy recommendations
   - AC3: Redaction presets apply k-anonymity rules based on data classification

3. **Streaming ETL with Enrichers**
   - AC1: Real-time data processing handles 10K+ records/second
   - AC2: Enrichers add geo-coding, entity extraction, and temporal normalization
   - AC3: Pipeline monitoring shows throughput, errors, and data quality metrics

4. **Data License Registry + TOS Enforcement**
   - AC1: License registry tracks usage rights per data source
   - AC2: TOS enforcement blocks operations violating data usage terms
   - AC3: Audit trail captures all licensing decisions and violations

**Acceptance Criteria Patterns**:
- **Policy-by-Default**: Data ingestion blocked with clear licensing reason + appeal path
- **Provenance Integrity**: All transforms captured with source manifest and hashes

---

### Epic B: Canonical Model & Graph Core (Weeks 2-4)

**Owner**: Graph Engineering Team

#### Stories:
1. **Entity Resolution with Explainable Scorecards**
   - AC1: Deterministic rules achieve 95%+ precision on known entity types
   - AC2: Probabilistic ML models provide confidence scores with feature explanations
   - AC3: Reconcile queues allow human review with override tracking

2. **Temporal Versioning**
   - AC1: All entities maintain complete version history with timestamps
   - AC2: Time-travel queries return graph state at any historical point
   - AC3: Temporal analytics show entity evolution and relationship lifecycles

3. **Geo-temporal Primitives**
   - AC1: Location entities support point, polygon, and trajectory geometries
   - AC2: Temporal queries handle "entity at location during timeframe" efficiently
   - AC3: Spatiotemporal indexes optimize proximity and movement pattern searches

4. **Provenance & Lineage**
   - AC1: Every entity/relationship traces back to original source with transforms
   - AC2: Lineage graph visualizes data flow from ingestion to analytics
   - AC3: Impact analysis shows downstream effects of source data changes

5. **Policy Tags**
   - AC1: Automated tagging applies classification policies to all data
   - AC2: Policy inheritance propagates tags through relationships and derivations
   - AC3: Access control enforces tag-based permissions with audit logging

**Acceptance Criteria Patterns**:
- **ER Explainability**: Merge decisions show features, scores, and human overrides
- **Provenance Integrity**: Complete lineage with manifest hashes for all exhibits

---

### Epic C: Analytics & Tradecraft (Weeks 4-6)

**Owner**: Analytics Team

#### Stories:
1. **Link-Analysis Canvas**
   - AC1: Interactive graph supports 10K+ nodes with real-time layout algorithms
   - AC2: Visual analytics includes filtering, clustering, and path highlighting
   - AC3: Canvas exports high-resolution images and interactive HTML reports

2. **Pathfinding Set**
   - AC1: Shortest path algorithms handle weighted and temporal constraints
   - AC2: Multi-criteria pathfinding optimizes for trust, time, and relationship strength
   - AC3: Path analysis identifies critical nodes and alternative routes

3. **Community & Centrality**
   - AC1: Community detection reveals hidden network structures and clusters
   - AC2: Centrality measures identify influential nodes and network bottlenecks
   - AC3: Dynamic analysis tracks community evolution over time

4. **Pattern Miner**
   - AC1: Subgraph matching finds recurring patterns and anomalies
   - AC2: Template library includes common investigation patterns (money laundering, fraud)
   - AC3: Pattern scoring ranks matches by significance and confidence

5. **Anomaly & Risk Scoring**
   - AC1: Statistical models detect deviations from normal network behavior
   - AC2: Risk scores combine multiple signals with explainable feature weights
   - AC3: Alert system triggers on threshold breaches with investigation recommendations

6. **Hypothesis Workbench + COA Planner**
   - AC1: Hypothesis framework tracks competing theories with evidence weights
   - AC2: COA planner suggests investigation paths based on available data
   - AC3: Decision support shows confidence intervals and residual unknowns

**Acceptance Criteria Patterns**:
- **Hypothesis Rigor**: Briefs show competing hypotheses, weights, residual unknowns
- **ER Explainability**: Analytics decisions include feature explanations and confidence

---

### Epic D: AI Copilot (Auditable) (Weeks 6-8)

**Owner**: AI/ML Team

#### Stories:
1. **NL→Cypher/SQL with Preview/Sandbox**
   - AC1: Natural language converts to valid queries with 80%+ accuracy
   - AC2: Preview mode shows query explanation and expected results
   - AC3: Sandbox execution prevents destructive operations with safety checks

2. **RAG with Citations & Redaction Awareness**
   - AC1: Retrieval-augmented generation provides inline source citations
   - AC2: Response redaction respects user permissions and data classifications
   - AC3: Citation hit-rate exceeds 90% for factual claims

3. **Schema-aware ETL Assistant**
   - AC1: AI suggests optimal schema mappings based on source data analysis
   - AC2: ETL pipeline generation includes validation rules and error handling
   - AC3: Assistant explains mapping decisions with confidence scores

4. **Hypothesis & Narrative Helpers**
   - AC1: AI generates alternative hypotheses from available evidence
   - AC2: Narrative templates structure investigation reports with consistent format
   - AC3: Evidence summarization highlights key findings and gaps

5. **Guardrails with Policy Reasons**
   - AC1: AI responses blocked for policy violations with clear explanations
   - AC2: Escalation paths allow human review of blocked requests
   - AC3: Guardrail effectiveness measured by false positive/negative rates

**Acceptance Criteria Patterns**:
- **Policy-by-Default**: AI responses blocked with policy reason + appeal path
- **Hypothesis Rigor**: AI generates competing hypotheses with evidence weights

---

### Epic F: Security/Governance (Minimal Viable) (Weeks 7-10)

**Owner**: Security Team

#### Stories:
1. **Multi-tenant Isolation**
   - AC1: Complete data separation between tenants with row-level security
   - AC2: Tenant boundaries enforced in all APIs, queries, and exports
   - AC3: Cross-tenant data leakage prevented with comprehensive testing

2. **RBAC/ABAC Implementation**
   - AC1: Role-based permissions cover all system functions with granular controls
   - AC2: Attribute-based policies support data classification and context awareness
   - AC3: Permission inheritance and delegation work across organizational hierarchies

3. **OIDC/SSO Integration**
   - AC1: Single sign-on supports major identity providers (Azure AD, Okta, Auth0)
   - AC2: JWT token validation with proper expiration and refresh handling
   - AC3: MFA enforcement for privileged operations and sensitive data access

4. **Comprehensive Audit**
   - AC1: All user actions logged with timestamp, user, operation, and data accessed
   - AC2: Audit trail immutable with cryptographic integrity verification
   - AC3: Compliance reports generate automatically for SOC2, GDPR, and other frameworks

5. **Policy Simulation**
   - AC1: "What-if" analysis shows impact of proposed policy changes
   - AC2: Policy conflicts detected and resolved before deployment
   - AC3: Simulation results include affected users, data, and operations

6. **K-anonymity & Redaction**
   - AC1: Automated anonymization ensures k≥3 for all exported datasets
   - AC2: Dynamic redaction based on user permissions and data sensitivity
   - AC3: Anonymization quality measured with re-identification risk assessment

7. **Baseline Key Management**
   - AC1: Encryption keys rotated automatically with configurable schedules
   - AC2: Key escrow and recovery procedures for business continuity
   - AC3: HSM integration for high-security deployments

**Acceptance Criteria Patterns**:
- **Policy-by-Default**: All blocked actions show reason + appeal path
- **Provenance Integrity**: Audit exports include manifest with hashes

---

## Go/No-Go Dashboard Metrics

### ER Precision & Explainability
- **Target**: Precision@10 ≥ 90% for entity resolution
- **Target**: Explainability coverage ≥ 95% for merge decisions
- **Target**: Human override rate ≤ 10%

### RAG Citation Quality
- **Target**: Citation hit-rate ≥ 90% for factual claims
- **Target**: Hallucination rate ≤ 5%
- **Target**: Source accuracy ≥ 95%

### Audit Coverage
- **Target**: 100% of user actions logged and auditable
- **Target**: Audit trail integrity verification passes
- **Target**: Compliance report generation automated

### Policy Block Explainability
- **Target**: 100% of blocked actions include clear reason
- **Target**: Appeal path available for all policy blocks
- **Target**: Policy simulation accuracy ≥ 95%

## Owner Assignments

- **Epic A (Data Intake)**: Sarah Chen, Data Platform Lead
- **Epic B (Graph Core)**: Marcus Rodriguez, Principal Graph Engineer  
- **Epic C (Analytics)**: Dr. Lisa Wang, Analytics Director
- **Epic D (AI Copilot)**: David Kim, ML Engineering Manager
- **Epic F (Security)**: Alex Thompson, Security Architect

## Success Criteria

1. **ER Explainability**: All merge decisions traceable with human-readable explanations
2. **Hypothesis Rigor**: Investigation briefs include competing theories and uncertainty quantification
3. **Policy-by-Default**: No user confusion about blocked actions - clear reasons and paths forward
4. **Provenance Integrity**: Complete audit trail with cryptographic verification for all data transformations

## Scope Freeze

All features outside A-D + F(minimal) deferred to Post-GA backlog. No scope creep permitted without explicit stakeholder approval and timeline adjustment.