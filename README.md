# IntelGraph Platform

---

## 🛠 Developer Onboarding (Deployable-First)

IntelGraph follows a **deployable-first mantra**:
🚨 If `make up` or `make smoke` fails, **stop everything and fix it**.
No code merges that break the golden path workflow:

**Investigation → Entities → Relationships → Copilot → Results**

## Quickstart (Local)

**Prereqs:** Docker Desktop (6–8 GB memory), Node 18 (optional for host dev), Python 3.10+

```bash
make bootstrap
make up        # Core services only (minimal hardware)
make smoke
```

- Client: [http://localhost:3000](http://localhost:3000)
- GraphQL: [http://localhost:4000/graphql](http://localhost:4000/graphql)
- Neo4j Browser: [http://localhost:7474](http://localhost:7474) (neo4j / devpassword)

### Optional AI/Kafka Services

```bash
make up-ai     # Add AI processing capabilities
make up-kafka  # Add Kafka streaming
make up-full   # All services (AI + Kafka)

# Data flow simulators (requires Kafka)
make ingest    # produce sample posts to Kafka
make graph     # consume and write to Neo4j
```

📖 Full details: [docs/ONBOARDING.md](docs/ONBOARDING.md)

For a complete documentation index see [docs/README.md](docs/README.md).
Historical plans and reports are kept in [docs/archive](docs/archive/README.md).

---

[![CI Status](https://github.com/BrianCLong/intelgraph/actions/workflows/ci.yml/badge.svg)](https://github.com/BrianCLong/intelgraph/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-brightgreen.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![GraphQL](https://img.shields.io/badge/GraphQL-API-E10098.svg)](https://graphql.org)

**Production-Ready MVP** • AI-augmented intelligence analysis platform combining graph analytics, real-time collaboration, and enterprise security. Built for the intelligence community with deployability-first principles.

### Latest GA Release (v3.0.0‑GA)

- Release Notes: `docs/releases/phase-3-ga/release-notes-v3.0.0-ga.md`
- Status Page Announcement: `docs/releases/phase-3-ga/status-page-announcement.md`
- GO‑LIVE NOW Runbook: `docs/runbooks/go-live-now-v3.0.0-ga.md`
- Evidence Pack Index: `docs/releases/phase-3-ga/README.md`
- Generated Overview: `docs/generated/RELEASE_V3_0_0_GA.md`

## 🚀 Quick Start (< 60 Seconds)

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) 4.0+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+
- 8GB+ RAM recommended
- Ports 3000, 4000, 5432, 6379, 7474, 7687, 8080 available

### One-Command Startup

```bash
# Clone and start the platform
git clone https://github.com/BrianCLong/intelgraph.git
cd intelgraph
./start.sh
```

**🎯 Access Points**:

- **Frontend**: http://localhost:3000 (React Application)
- **Backend**: http://localhost:4000/graphql (GraphQL API)
- **Neo4j**: http://localhost:7474 (Graph Database UI)
- **Adminer**: http://localhost:8080 (Database Admin)

## 🎯 Golden Path Demo

1. **Open Frontend**: Navigate to http://localhost:3000
2. **Create Investigation**: Click "New Investigation" from Dashboard
3. **Add Entities**: Use the graph explorer to add entities and relationships
4. **Run Analysis**: Execute Copilot analysis for AI-augmented insights
5. **View Results**: Explore generated insights and recommendations

## 📋 Table of Contents

- [Onboarding](docs/ONBOARDING.md)
- [Golden Path](docs/GOLDEN_PATH.md)
- [Environment Variables](docs/ENV_VARS.md)
- [Runbooks](docs/RUNBOOKS.md)
- [GA Criteria](docs/GA_CRITERIA.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

- [Features](#-features)
- [Architecture](#-architecture)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Contributing](#-contributing)
- [Support](#-support)
- [Project Management](docs/project_management/README.md)

## ✨ Features

### 🎯 Core Platform (MVP-0 Complete)

- **🔐 Authentication & Security**: JWT + RBAC + OPA policies + rate limiting
- **📊 Graph Analytics**: Neo4j + PostgreSQL + TimescaleDB + Redis with performance optimizations
- **⚛️ React Frontend**: Material-UI + Redux + real-time updates + responsive design
- **🤖 AI Copilot System**: Goal-driven query orchestration with live progress streaming
- **🔍 Investigation Workflow**: End-to-end investigation management + versioning
- **📥 Data Ingestion**: CSV upload + STIX/TAXII support + external data federation

### 🚀 Advanced Capabilities (MVP-1 Complete)

- **🤖 AI/ML Extraction Engine**: Multimodal AI-powered entity extraction and analysis
- **🎯 Computer Vision**: Object detection, face recognition, OCR, scene analysis
- **🗣️ Speech Processing**: Speech-to-text, speaker diarization, audio analysis
- **📝 Natural Language Processing**: Entity recognition, sentiment analysis, topic modeling
- **🔍 Vector Search**: Semantic search across multimodal content with embeddings
- **📊 Cross-Modal Intelligence**: AI-powered content matching across different media types
- **📈 Observability**: OpenTelemetry + Prometheus + Grafana dashboards
- **⚡ Performance**: LOD rendering + graph clustering + viewport optimization
- **🛡️ Security Hardening**: Persisted queries + tenant isolation + audit logging
- **🔄 DevOps**: Docker + CI/CD + smoke testing + deployment automation

### 🎮 User Interface Features

- **Interactive Graph Visualization**: Cytoscape.js with multiple layout algorithms
- **Real-time Collaboration**: Multi-user editing with presence indicators
- **AI-Powered Insights**: Natural language query processing
- **Mobile-Responsive Design**: Optimized for tablets and mobile devices
- **Accessibility**: WCAG 2.1 AA compliant interface

### 📊 Analytics & Intelligence

- **Graph Analytics**: Community detection, centrality analysis, path finding
- **🤖 AI/ML Extraction**: Real-time multimodal entity extraction and analysis
- **🔍 Computer Vision**: YOLO object detection, MTCNN face recognition, Tesseract OCR
- **🗣️ Speech Intelligence**: Whisper speech-to-text, speaker diarization, audio analysis
- **📝 Text Analytics**: spaCy NER, sentiment analysis, topic modeling, language detection
- **🧠 Vector Embeddings**: Sentence transformers for semantic search and similarity
- **🔗 Cross-Modal Matching**: AI-powered content correlation across media types
- **🎯 Smart Clustering**: Automatic entity grouping and relationship inference
- **⏱️ Temporal Analysis**: Time-series investigation and pattern recognition
- **🌍 GEOINT Support**: Geographic analysis with Leaflet integration
- **📊 Quality Scoring**: AI confidence metrics and validation workflows

## 🏗️ Architecture

### Technology Stack

#### Frontend

- **Framework**: React 18 with Hooks and Context API
- **State Management**: Redux Toolkit with RTK Query
- **UI Library**: Material-UI (MUI) v5
- **Graph Visualization**: Cytoscape.js with extensions
- **Build Tool**: Vite with Hot Module Replacement
- **Testing**: Jest + React Testing Library + Playwright E2E

#### Backend

- **Runtime**: Node.js 20+ with TypeScript
- **API**: GraphQL with Apollo Server v4
- **Web Framework**: Express.js with security middleware
- **Authentication**: JWT with refresh token rotation
- **Real-time**: Socket.io for WebSocket connections

#### Databases

- **Graph Database**: Neo4j 5 Community Edition
- **Relational Database**: PostgreSQL 16 with pgvector
- **Time-series Database**: TimescaleDB 2
- **Cache/Session Store**: Redis 7 with persistence
- **File Storage**: Local filesystem with S3 compatibility

#### Infrastructure

- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **Monitoring**: OpenTelemetry + Prometheus + Grafana
- **Reverse Proxy**: Nginx (production)
- **CI/CD**: GitHub Actions with automated testing

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  GraphQL API    │◄──►│    Neo4j DB     │
│                 │    │                 │    │                 │
│ • Investigation │    │ • Authentication│    │ • Graph Data    │
│ • Graph Viz     │    │ • CRUD Ops      │    │ • Relationships │
│ • Real-time UI  │    │ • Subscriptions │    │ • Analytics     │
│ • Material-UI   │    │ • Rate Limiting │    │ • Constraints   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                       │  PostgreSQL DB  │    │   TimescaleDB   │    │    Redis Cache  │
                       │                 │    │                 │    │                 │
                       │ • User Data     │    │ • Time-series   │    │ • Sessions      │
                       │ • Audit Logs    │    │ • Metrics       │    │ • Real-time     │
                       │ • Metadata      │    │                 │    │ • Rate Limiting │
                       │ • Vector Store  │    │                 │    │ • Pub/Sub       │
                       └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Client Request**: React app sends GraphQL queries/mutations
2. **Authentication**: JWT token validation and RBAC checks
3. **Rate Limiting**: Redis-based request throttling
4. **Business Logic**: Resolver functions process requests
5. **Database Operations**: Neo4j for graph data, PostgreSQL for metadata, TimescaleDB for time-series metrics
6. **Real-time Updates**: Socket.io broadcasts changes to connected clients
7. **Caching**: Redis caches frequent queries and session data

## 🛠️ Development

### Development Environment Setup

```bash
# 1. Clone repository
git clone https://github.com/BrianCLong/intelgraph.git
cd intelgraph

# 2. Start all services (recommended)
./start.sh

# 3. Alternative: Manual startup
docker-compose -f docker-compose.dev.yml up -d

# 4. Individual service development
npm run client:dev    # Frontend only (port 3000)
npm run server:dev    # Backend only (port 4000)
```

### 🤖 AI/ML Setup (Optional)

IntelGraph includes a powerful multimodal AI extraction engine for enhanced intelligence analysis:

```bash
# Navigate to server directory
cd server

# Install AI dependencies and models (one-time setup)
./scripts/setup-ai-models.sh

# Test AI extraction engines
node scripts/test-ai-extraction.js

# Start with AI capabilities enabled
AI_ENABLE_GPU=true npm run dev
```

**AI Capabilities Include:**

- **OCR**: Text extraction from images and documents (Tesseract, PaddleOCR)
- **Object Detection**: YOLO v8 for identifying objects, people, vehicles
- **Face Recognition**: MTCNN + FaceNet for facial detection and recognition
- **Speech-to-Text**: OpenAI Whisper for audio transcription and analysis
- **NLP**: spaCy for entity recognition, sentiment analysis, topic modeling
- **Embeddings**: Sentence transformers for semantic search and similarity
- **Cross-Modal Search**: Find related content across different media types

**Requirements:**

- Python 3.8+ with pip
- 4GB+ RAM (8GB+ recommended with GPU)
- Optional: NVIDIA GPU with CUDA for faster processing

**Docker AI Setup:**

```bash
# Build and run with AI container
docker-compose -f docker-compose.ai.yml up -d

# Test AI services
docker exec intelgraph-ai python /app/scripts/test-ai-extraction.py
```

### Available Scripts

```bash
# Development
npm run dev           # Start all services
npm run client:dev    # Frontend development server
npm run server:dev    # Backend development server

# Quality Assurance
npm run test         # Full test suite (Jest + Playwright)
npm run test:unit    # Unit tests only
npm run test:e2e     # End-to-end tests
npm run test:smoke   # Smoke tests for deployment validation
npm run lint         # ESLint code quality checks
npm run typecheck    # TypeScript type checking
npm run format       # Prettier code formatting

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset and reseed database

# AI/ML (server directory)
./scripts/setup-ai-models.sh      # Install AI models and dependencies
node scripts/test-ai-extraction.js # Test AI extraction engines
python src/ai/models/yolo_detection.py --help  # Test object detection
python src/ai/models/whisper_transcription.py --help  # Test speech-to-text

# Utilities
npm run health       # System health check
npm run cleanup      # Clean up containers and images
```

### Environment Configuration

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

**Key Environment Variables**:

```bash
# Development
NODE_ENV=development
DEBUG=intelgraph:*

# Database URLs
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword

POSTGRES_HOST=localhost
POSTGRES_DB=intelgraph_dev
POSTGRES_USER=intelgraph
POSTGRES_PASSWORD=devpassword

TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DB=intelgraph_timeseries
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=devpassword

REDIS_HOST=localhost
REDIS_PASSWORD=devpassword

# API Configuration
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
CORS_ORIGIN=http://localhost:3000

# AI/ML Configuration (optional)
AI_MODELS_PATH=src/ai/models
AI_PYTHON_PATH=venv/bin/python
AI_ENABLE_GPU=true
AI_MAX_CONCURRENT_JOBS=5

# OCR Configuration
OCR_DEFAULT_ENGINE=tesseract
OCR_CONFIDENCE_THRESHOLD=0.6

# Object Detection
OBJECT_DETECTION_MODEL=yolov8n.pt
OBJECT_DETECTION_CONFIDENCE=0.5

# Speech Recognition
SPEECH_MODEL=whisper-base
SPEECH_LANGUAGES=en,de,fr,es,auto

# Text Analysis
TEXT_ANALYSIS_MODEL=en_core_web_lg
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Client Configuration (in client/.env)
VITE_API_URL=http://localhost:4000/graphql
VITE_WS_URL=http://localhost:4000
```

### Database Setup

The platform uses four databases:

1. **Neo4j** (Graph Database)
   - URL: http://localhost:7474
   - Username: `neo4j`
   - Password: `devpassword`
   - Purpose: Entity relationships and graph analytics

2. **PostgreSQL** (Relational Database)
   - Host: localhost:5432
   - Database: `intelgraph_dev`
   - Username: `intelgraph`
   - Password: `devpassword`
   - Purpose: User data, audit logs, metadata

3. **TimescaleDB** (Time-series Database)
   - Host: localhost:5433
   - Database: `intelgraph_timeseries`
   - Username: `timescale`
   - Password: `devpassword`
   - Purpose: Metrics and event storage

4. **Redis** (Cache & Sessions)
   - Host: localhost:6379
   - Password: `devpassword`
   - Purpose: Session storage, caching, real-time pub/sub

### Code Structure

```
intelgraph/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page-level components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # API and external services
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS and theme files
│   ├── public/             # Static assets
│   └── tests/              # Frontend tests
├── server/                 # Node.js backend application
│   ├── src/
│   │   ├── graphql/        # GraphQL schema and resolvers
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Data models
│   │   ├── middleware/     # Express middleware
│   │   ├── db/            # Database connections and migrations
│   │   └── utils/         # Utility functions
│   └── tests/             # Backend tests
├── docs/                  # Documentation
├── scripts/               # Build and deployment scripts
├── monitoring/            # Grafana dashboards and configs
├── deploy/               # Deployment configurations
└── docker-compose.*.yml  # Docker Compose files
```

## 🚀 Production Deployment

### Docker Production Build

```bash
# Core services (minimal hardware)
make bootstrap && make up

# With AI capabilities
make up-ai

# With Kafka streaming
make up-kafka

# Full deployment (AI + Kafka)
make up-full

# Health verification
make smoke
curl http://localhost:4000/health
```

### Production Environment Variables

```bash
# Required security configuration
export JWT_SECRET="your-production-jwt-secret-at-least-32-chars"
export JWT_REFRESH_SECRET="your-production-refresh-secret-different-from-jwt"
export ALLOWED_ORIGINS="https://your-domain.com"
export CORS_ORIGIN="https://your-domain.com"

# Optional rate limiting (defaults shown)
export RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
export RATE_LIMIT_MAX=500           # requests per window

# Start with production security enabled
NODE_ENV=production make up
```

### Kubernetes Deployment (Helm)

```bash
# Install IntelGraph with Helm
helm upgrade --install intelgraph ./helm/intelgraph \
  --namespace intelgraph --create-namespace \
  --values helm/intelgraph/values/prod.yaml

# Check deployment status
kubectl get pods -n intelgraph

# Run health tests
helm test intelgraph -n intelgraph

# Access services via port-forward
kubectl -n intelgraph port-forward svc/intelgraph-server 4000:4000 &
npm run test:smoke
```

### Health Monitoring

**Health Check Endpoints**:

- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system status
- `GET /metrics` - Prometheus metrics

**Monitoring Stack**:

- **Metrics**: Prometheus scrapes application metrics
- **Visualization**: Grafana dashboards for monitoring
- **Alerting**: AlertManager for critical notifications
- **Logging**: Structured JSON logging with correlation IDs

## 📖 API Documentation

### GraphQL Schema

Access the GraphQL Playground at http://localhost:4000/graphql for interactive API exploration.

**Core Types**:

```graphql
type Entity {
  id: ID!
  type: String!
  props: JSON
  createdAt: DateTime!
  updatedAt: DateTime
}

type Relationship {
  id: ID!
  from: ID!
  to: ID!
  type: String!
  props: JSON
  createdAt: DateTime!
}

type Investigation {
  id: ID!
  name: String!
  description: String
  entities: [Entity!]!
  relationships: [Relationship!]!
  createdAt: DateTime!
}
```

**Key Queries**:

```graphql
# Get all entities with filtering
query GetEntities($type: String, $limit: Int = 25) {
  entities(type: $type, limit: $limit) {
    id
    type
    props
  }
}

# Search entities semantically
query SemanticSearch($query: String!, $limit: Int = 10) {
  semanticSearch(query: $query, limit: $limit) {
    id
    type
    props
  }
}

# Get investigation details
query GetInvestigation($id: ID!) {
  investigation(id: $id) {
    id
    name
    description
    entities {
      id
      type
      props
    }
    relationships {
      id
      from
      to
      type
      props
    }
  }
}
```

**Key Mutations**:

```graphql
# Create new entity
mutation CreateEntity($input: EntityInput!) {
  createEntity(input: $input) {
    id
    type
    props
  }
}

# Create investigation
mutation CreateInvestigation($input: InvestigationInput!) {
  createInvestigation(input: $input) {
    id
    name
    description
  }
}
```

### REST Endpoints

```bash
# Health and monitoring
GET  /health                 # Basic health check
GET  /health/detailed        # Detailed system status
GET  /metrics               # Prometheus metrics

# File operations
POST /api/upload            # File upload
GET  /api/export/:format    # Data export (CSV, JSON, GraphML)

# Admin operations
GET  /admin/stats           # System statistics
POST /admin/migrate         # Run database migrations
```

### WebSocket Events

Real-time updates via Socket.io:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:4000');

// Listen for entity updates
socket.on('entity:created', (entity) => {
  console.log('New entity created:', entity);
});

socket.on('entity:updated', (entity) => {
  console.log('Entity updated:', entity);
});

// Join investigation room for real-time collaboration
socket.emit('join:investigation', { investigationId: '123' });
```

## 🔒 Security

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication with refresh token rotation
- **Role-Based Access Control (RBAC)**: Fine-grained permissions system
- **Open Policy Agent (OPA)**: Policy-based authorization
- **Rate Limiting**: Redis-based request throttling

### Security Features

- **Input Validation**: GraphQL schema validation + custom sanitization
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Content Security Policy + input sanitization
- **CSRF Protection**: SameSite cookies + CSRF tokens
- **Secure Headers**: Helmet.js security middleware
- **Audit Logging**: Comprehensive activity logging

### Data Protection

- **Encryption at Rest**: Database encryption enabled
- **Encryption in Transit**: TLS 1.3 for all communications
- **Secret Management**: Environment-based configuration
- **Data Anonymization**: PII scrubbing in logs
- **Backup Encryption**: Encrypted database backups

### Compliance

- **GDPR Ready**: Data portability and deletion endpoints
- **SOC 2 Type II**: Security controls implementation
- **NIST Framework**: Cybersecurity framework alignment

## 🔧 Configuration

### Feature Flags

```bash
# Enable/disable features via environment variables
FEATURE_AI_SUGGESTIONS=true
FEATURE_REALTIME_COLLABORATION=true
FEATURE_ADVANCED_ANALYTICS=false
PERSISTED_QUERIES=1
```

### Performance Tuning

```bash
# Database connection pools
NEO4J_MAX_POOL_SIZE=50
POSTGRES_MAX_POOL_SIZE=20
REDIS_MAX_POOL_SIZE=10

# Cache configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# Rate limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000       # requests per window
```

### Logging Configuration

```bash
# Log levels: error, warn, info, debug, trace
LOG_LEVEL=info
LOG_FORMAT=json

# Log destinations
LOG_FILE=/app/logs/application.log
LOG_ELASTICSEARCH_URL=http://localhost:9200
```

## 🧪 Testing

### Test Categories

1. **Unit Tests**: Jest for individual component testing
2. **Integration Tests**: API endpoint and database integration
3. **E2E Tests**: Playwright for full user journey testing
4. **Performance Tests**: Load testing with Artillery
5. **Security Tests**: OWASP ZAP automated security scanning

### Running Tests

```bash
# All tests
npm test

# Specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:performance  # Performance tests
npm run test:security     # Security tests

# Test coverage
npm run test:coverage     # Generate coverage report

# Watch mode for development
npm run test:watch        # Run tests in watch mode
```

### Test Data

```bash
# Seed test data
npm run db:seed:test

# Reset test database
npm run db:reset:test

# Load performance test data
npm run db:seed:performance
```

## 📊 Monitoring & Observability

### Metrics

**Application Metrics**:

- Request rate, latency, error rate
- Database query performance
- Cache hit/miss ratios
- Real-time connection counts

**Business Metrics**:

- Investigation creation rate
- Entity/relationship growth
- User engagement metrics
- AI/ML model performance

### Dashboards

Access Grafana dashboards at http://localhost:3100:

- **System Overview**: High-level system health
- **API Performance**: Request metrics and latency
- **Database Health**: Query performance and connections
- **User Activity**: Engagement and usage patterns

### Alerting

**Critical Alerts**:

- Service downtime
- Database connection failures
- High error rates (>5%)
- Memory usage >90%

**Warning Alerts**:

- Elevated response times
- Queue backlog buildup
- Low disk space

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Submit** a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standardized commit messages
- **Test Coverage**: Minimum 80% coverage required

### Pull Request Guidelines

- Include tests for new features
- Update documentation as needed
- Ensure all CI checks pass
- Request review from core maintainers
- Squash commits before merging

## 📚 Additional Resources

### Documentation

- [API Reference](docs/api/README.md)
- [Deployment Guide](docs/deployment/README.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Troubleshooting Guide](docs/troubleshooting/README.md)
- [Archived Documents](docs/archive/README.md)

### Community

- [GitHub Discussions](https://github.com/BrianCLong/intelgraph/discussions)
- [Issue Tracker](https://github.com/BrianCLong/intelgraph/issues)
- [Release Notes](CHANGELOG.md)

### Learning Resources

- [GraphQL Best Practices](docs/graphql-guide.md)
- [React Development Guide](docs/react-guide.md)
- [Neo4j Query Patterns](docs/neo4j-guide.md)

## 📞 Support

### Getting Help

- **Documentation**: Check [docs/](docs/) directory
- **Issues**: [GitHub Issues](https://github.com/BrianCLong/intelgraph/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BrianCLong/intelgraph/discussions)
- **Email**: support@intelgraph.com

### Reporting Bugs

Please include:

- Operating system and version
- Node.js and npm versions
- Docker version
- Steps to reproduce
- Expected vs actual behavior
- Relevant log files

### Feature Requests

Use the [Feature Request template](https://github.com/BrianCLong/intelgraph/issues/new?template=feature_request.md) and include:

- Clear description of the feature
- Use case and business value
- Proposed implementation approach
- Alternative solutions considered

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the intelligence community
- Powered by [React](https://reactjs.org/), [Node.js](https://nodejs.org/), [GraphQL](https://graphql.org/), and [Neo4j](https://neo4j.com/)
- UI components from [Material-UI](https://mui.com/)
- Graph visualization with [Cytoscape.js](https://cytoscape.org/)

---

**IntelGraph Platform** - Next-Generation Intelligence Analysis
