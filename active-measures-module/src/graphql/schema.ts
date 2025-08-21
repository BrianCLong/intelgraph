import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  # Scalars
  scalar JSON
  scalar DateTime
  scalar Upload

  # Core Active Measures Types
  type Query {
    # Portfolio Management
    activeMeasuresPortfolio(
      query: String
      filters: PortfolioFiltersInput
      tuners: TunersInput
    ): ActiveMeasuresPortfolio!
    
    # Operation Planning
    getOperation(id: ID!): Operation
    getOperations(
      status: OperationStatus
      assignedTo: ID
      timeRange: TimeRangeInput
      pagination: PaginationInput
    ): OperationsResponse!
    
    # Simulation & Analysis
    getSimulationResults(operationId: ID!): SimulationResults
    getEffectivenessMetrics(operationId: ID!): EffectivenessMetrics
    
    # Threat Assessment
    getThreatLandscape(filters: ThreatFiltersInput): ThreatLandscape!
    getAdversaryProfiles(targetIds: [ID!]): [AdversaryProfile!]!
    
    # Security & Compliance
    getAuditTrail(
      operationId: ID
      actorId: ID
      timeRange: TimeRangeInput
      pagination: PaginationInput
    ): AuditTrailResponse!
    
    # Analytics & Reporting
    getOperationalAnalytics(
      timeRange: TimeRangeInput
      metrics: [AnalyticsMetric!]
    ): OperationalAnalytics!
  }

  type Mutation {
    # Operation Management
    createOperation(input: CreateOperationInput!): CreateOperationResponse!
    updateOperation(id: ID!, input: UpdateOperationInput!): UpdateOperationResponse!
    deleteOperation(id: ID!): DeleteOperationResponse!
    
    # Measure Combination & Planning
    combineMeasures(
      ids: [ID!]!
      tuners: TunersInput!
      context: OperationalContextInput!
    ): CombinedMeasuresResponse!
    
    # Approval Workflow
    submitForApproval(operationId: ID!, justification: String!): ApprovalSubmissionResponse!
    approveOperation(
      id: ID!
      approverCredentials: ApproverCredentialsInput!
      conditions: [ApprovalCondition!]
    ): ApprovalResponse!
    rejectOperation(id: ID!, reason: String!, recommendations: [String!]): RejectionResponse!
    
    # Simulation & Testing
    runSimulation(input: SimulationInput!): SimulationResponse!
    calibrateModel(input: ModelCalibrationInput!): CalibrationResponse!
    
    # Real-time Operations
    executeOperation(id: ID!, executionContext: ExecutionContextInput!): ExecutionResponse!
    pauseOperation(id: ID!, reason: String!): OperationControlResponse!
    resumeOperation(id: ID!): OperationControlResponse!
    abortOperation(id: ID!, emergencyCode: String!): OperationControlResponse!
    
    # Data Management
    uploadOperationalData(file: Upload!, metadata: DataUploadMetadata!): DataUploadResponse!
    importThreatIntelligence(source: String!, data: JSON!): ImportResponse!
    
    # Security Functions
    rotateOperationalKeys(operationId: ID!): KeyRotationResponse!
    initializeAirgapMode: AirgapInitResponse!
    
    # AI/ML Operations
    trainPredictiveModel(input: ModelTrainingInput!): ModelTrainingResponse!
    updateEthicalConstraints(constraints: EthicalConstraintsInput!): ConstraintsUpdateResponse!
  }

  type Subscription {
    # Real-time Operation Updates
    operationUpdates(operationId: ID!): OperationUpdate!
    simulationProgress(simulationId: ID!): SimulationProgressUpdate!
    
    # Threat Intelligence Feeds
    threatIntelligenceUpdates(filters: ThreatFiltersInput): ThreatIntelligenceUpdate!
    
    # System Health & Alerts
    systemAlerts(severity: AlertSeverity): SystemAlert!
    complianceAlerts: ComplianceAlert!
    
    # Collaboration
    operationChat(operationId: ID!): ChatMessage!
    presenceUpdates(operationId: ID!): PresenceUpdate!
  }

  # Input Types
  input PortfolioFiltersInput {
    categories: [MeasureCategory!]
    riskLevels: [RiskLevel!]
    attributionLevels: [AttributionLevel!]
    timeHorizons: [TimeHorizon!]
    targetTypes: [TargetType!]
    effectivenessThreshold: Float
  }

  input TunersInput {
    proportionality: Float = 0.5
    riskTolerance: Float = 0.3
    duration: Int
    ethicalIndex: Float = 0.8
    unattributabilityRequirement: Float = 0.7
    resourceConstraints: ResourceConstraintsInput
    operationalSecurity: OperationalSecurityInput
    plausibleDeniability: Float = 0.9
    collateralDamageThreshold: Float = 0.1
  }

  input ResourceConstraintsInput {
    maxBudget: Float
    maxPersonnel: Int
    maxDuration: Int # days
    availableAssets: [AssetType!]
    geographicalConstraints: [String!]
  }

  input OperationalSecurityInput {
    classificationLevel: ClassificationLevel!
    compartmentalization: [String!]
    needToKnowGroups: [String!]
    communicationProtocols: [String!]
  }

  input CreateOperationInput {
    name: String!
    description: String!
    objectives: [ObjectiveInput!]!
    targetProfile: TargetProfileInput!
    measures: [MeasureInput!]!
    tuners: TunersInput!
    timeline: TimelineInput!
    team: TeamAssignmentInput!
    classification: ClassificationLevel!
  }

  input ObjectiveInput {
    type: ObjectiveType!
    description: String!
    successCriteria: [String!]!
    metrics: [MetricDefinitionInput!]!
    priority: Priority!
  }

  input TargetProfileInput {
    entityIds: [ID!]!
    demographicData: JSON
    psychographicProfile: JSON
    vulnerabilities: [VulnerabilityInput!]!
    communicationChannels: [String!]!
    influenceNetwork: JSON
  }

  input MeasureInput {
    categoryId: ID!
    customizations: JSON
    parameters: JSON
    constraints: [ConstraintInput!]
  }

  input SimulationInput {
    operationId: ID!
    scenarios: [ScenarioInput!]!
    monteCarlolterations: Int = 1000
    confidenceLevel: Float = 0.95
    includePQCAnalysis: Boolean = true
    adversaryModels: [AdversaryModelInput!]!
  }

  # Core Types
  type ActiveMeasuresPortfolio {
    id: ID!
    measures: [MeasureOption!]!
    totalCount: Int!
    categories: [MeasureCategory!]!
    recommendations: [MeasureRecommendation!]!
    riskAssessment: RiskAssessment!
    complianceStatus: ComplianceStatus!
  }

  type MeasureOption {
    id: ID!
    name: String!
    category: MeasureCategory!
    description: String!
    operationalFramework: OperationalFramework!
    
    # Effectiveness Metrics
    unattributabilityScore: Float!
    effectivenessRating: Float!
    riskLevel: RiskLevel!
    
    # Novel Features & Capabilities
    novelFeatures: [NovelFeature!]!
    aiCapabilities: [AICapability!]!
    multimodalSupport: [MediaType!]!
    
    # Operational Parameters
    estimatedDuration: Duration!
    resourceRequirements: ResourceRequirements!
    prerequisites: [Prerequisite!]!
    constraints: [OperationalConstraint!]!
    
    # Legal & Ethical
    legalFramework: LegalFramework!
    ethicalScore: Float!
    complianceRequirements: [ComplianceRequirement!]!
    
    # Simulation Data
    historicalEffectiveness: [HistoricalData!]!
    simulationResults: SimulationSummary
    pqcResistance: PostQuantumCryptoRating!
  }

  type Operation {
    id: ID!
    name: String!
    description: String!
    status: OperationStatus!
    
    # Core Configuration
    objectives: [Objective!]!
    measures: [AssignedMeasure!]!
    targetProfile: TargetProfile!
    timeline: Timeline!
    
    # Team & Authorization
    team: Team!
    approvalChain: [ApprovalRecord!]!
    classification: ClassificationLevel!
    
    # Execution Data
    executionPlan: ExecutionPlan
    currentPhase: OperationPhase
    progress: OperationProgress!
    
    # Results & Analysis
    effectivenessMetrics: EffectivenessMetrics
    simulationResults: [SimulationResults!]!
    realTimeMetrics: RealTimeMetrics
    
    # Audit & Compliance
    auditTrail: [AuditEntry!]!
    complianceChecks: [ComplianceCheck!]!
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    scheduledStart: DateTime
    actualStart: DateTime
    completedAt: DateTime
  }

  type SimulationResults {
    id: ID!
    operationId: ID!
    
    # Simulation Configuration
    scenarios: [SimulationScenario!]!
    parameters: SimulationParameters!
    
    # Results
    predictedEffects: [EffectPrediction!]!
    riskAnalysis: RiskAnalysis!
    sensitivityAnalysis: SensitivityAnalysis!
    
    # AI/ML Insights
    aiInsights: [AIInsight!]!
    networkEffects: NetworkEffectsAnalysis!
    behavioralPredictions: [BehavioralPrediction!]!
    
    # Post-Quantum Analysis
    pqcVulnerabilities: [PQCVulnerability!]!
    quantumThreatAssessment: QuantumThreatAssessment!
    
    # Confidence & Validation
    confidenceIntervals: [ConfidenceInterval!]!
    validationMetrics: ValidationMetrics!
    
    createdAt: DateTime!
  }

  # Enums
  enum OperationStatus {
    DRAFT
    PENDING_APPROVAL
    APPROVED
    READY_FOR_EXECUTION
    EXECUTING
    PAUSED
    COMPLETED
    ABORTED
    FAILED
  }

  enum MeasureCategory {
    INFORMATION_OPERATIONS
    CYBER_OPERATIONS
    SOCIAL_ENGINEERING
    ECONOMIC_PRESSURE
    DIPLOMATIC_INFLUENCE
    CULTURAL_OPERATIONS
    TECHNOLOGICAL_DISRUPTION
    PSYCHOLOGICAL_OPERATIONS
    DECEPTION_OPERATIONS
    COUNTER_INTELLIGENCE
  }

  enum RiskLevel {
    MINIMAL
    LOW
    MODERATE
    HIGH
    CRITICAL
  }

  enum ClassificationLevel {
    UNCLASSIFIED
    CONFIDENTIAL
    SECRET
    TOP_SECRET
    SCI
  }

  enum ObjectiveType {
    INFLUENCE_PERCEPTION
    DISRUPT_OPERATIONS
    GATHER_INTELLIGENCE
    COUNTER_NARRATIVE
    DETER_ACTION
    COMPEL_BEHAVIOR
    DEGRADE_CAPABILITY
    PRESERVE_ANONYMITY
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum AlertSeverity {
    INFO
    WARNING
    ERROR
    CRITICAL
  }

  # Additional complex types for comprehensive coverage
  type EffectivenessMetrics {
    primaryObjectives: [ObjectiveMetric!]!
    secondaryEffects: [SecondaryEffect!]!
    unintendedConsequences: [UnintendedConsequence!]!
    attributionAnalysis: AttributionAnalysis!
    networkImpact: NetworkImpactAnalysis!
    temporalEffects: TemporalEffectsAnalysis!
  }

  type AuditEntry {
    id: ID!
    timestamp: DateTime!
    actor: Actor!
    action: AuditAction!
    operationId: ID
    details: JSON!
    classification: ClassificationLevel!
    ipAddress: String
    userAgent: String
    geolocation: GeolocationData
    cryptographicSignature: String!
  }

  # Response types for mutations
  type CreateOperationResponse {
    success: Boolean!
    operation: Operation
    errors: [OperationError!]!
    warnings: [OperationWarning!]!
  }

  type ApprovalResponse {
    success: Boolean!
    approvalRecord: ApprovalRecord!
    nextApprover: User
    estimatedCompletionTime: DateTime
    conditionalRequirements: [ConditionalRequirement!]!
  }

  type SimulationResponse {
    success: Boolean!
    simulationId: ID!
    estimatedCompletionTime: DateTime!
    initialResults: SimulationPreview
    resourceUtilization: ResourceUtilization!
  }

  # Supporting types for comprehensive operations
  type Actor {
    id: ID!
    type: ActorType!
    name: String!
    role: UserRole!
    clearanceLevel: ClassificationLevel!
    organization: String
  }

  type GeolocationData {
    country: String
    region: String
    city: String
    coordinates: [Float!] # [lat, lng]
    accuracy: Float
    source: String!
  }

  enum ActorType {
    HUMAN_OPERATOR
    AI_SYSTEM
    AUTOMATED_PROCESS
    EXTERNAL_SYSTEM
  }

  enum UserRole {
    ANALYST
    OPERATOR
    SUPERVISOR
    APPROVER
    ADMINISTRATOR
    AUDITOR
  }

  enum AuditAction {
    CREATE_OPERATION
    UPDATE_OPERATION
    DELETE_OPERATION
    APPROVE_OPERATION
    REJECT_OPERATION
    EXECUTE_OPERATION
    PAUSE_OPERATION
    ABORT_OPERATION
    ACCESS_DATA
    EXPORT_DATA
    IMPORT_DATA
    MODIFY_PERMISSIONS
    VIEW_CLASSIFIED
    RUN_SIMULATION
    ACCESS_AUDIT_LOG
  }

  # Additional required types referenced in the schema
  type User {
    id: ID!
    username: String!
    role: UserRole!
    clearanceLevel: ClassificationLevel!
    activeOperations: [ID!]!
  }

  type OperationError {
    code: String!
    message: String!
    field: String
    severity: ErrorSeverity!
  }

  type OperationWarning {
    code: String!
    message: String!
    recommendation: String
  }

  enum ErrorSeverity {
    INFO
    WARNING
    ERROR
    FATAL
  }

  # Input types for remaining operations
  input TimeRangeInput {
    start: DateTime!
    end: DateTime!
  }

  input PaginationInput {
    offset: Int = 0
    limit: Int = 50
  }

  input ThreatFiltersInput {
    severity: [AlertSeverity!]
    categories: [ThreatCategory!]
    sources: [String!]
    timeRange: TimeRangeInput
  }

  enum ThreatCategory {
    CYBER
    PHYSICAL
    INFORMATION
    ECONOMIC
    POLITICAL
    SOCIAL
  }

  # Response types for remaining queries
  type OperationsResponse {
    operations: [Operation!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type ThreatLandscape {
    threats: [ThreatIndicator!]!
    riskLevel: RiskLevel!
    trends: [ThreatTrend!]!
    recommendations: [ThreatRecommendation!]!
  }

  type ThreatIndicator {
    id: ID!
    type: ThreatCategory!
    severity: AlertSeverity!
    confidence: Float!
    description: String!
    source: String!
    firstSeen: DateTime!
    lastSeen: DateTime!
  }

  type ThreatTrend {
    category: ThreatCategory!
    direction: TrendDirection!
    confidence: Float!
    timeFrame: String!
  }

  enum TrendDirection {
    INCREASING
    DECREASING
    STABLE
    VOLATILE
  }

  type ThreatRecommendation {
    id: ID!
    priority: Priority!
    action: String!
    rationale: String!
    estimatedEffort: String!
  }

  type AdversaryProfile {
    id: ID!
    name: String!
    capabilities: [AdversaryCapability!]!
    tactics: [String!]!
    motivations: [String!]!
    riskAssessment: RiskAssessment!
  }

  type AdversaryCapability {
    domain: String!
    level: CapabilityLevel!
    description: String!
    evidence: [String!]!
  }

  enum CapabilityLevel {
    BASIC
    INTERMEDIATE
    ADVANCED
    EXPERT
    NATION_STATE
  }

  type RiskAssessment {
    overallRisk: RiskLevel!
    categories: [RiskCategory!]!
    mitigationStrategies: [String!]!
    lastUpdated: DateTime!
  }

  type RiskCategory {
    name: String!
    level: RiskLevel!
    probability: Float!
    impact: Float!
    factors: [String!]!
  }

  type AuditTrailResponse {
    entries: [AuditEntry!]!
    totalCount: Int!
    hasNextPage: Boolean!
    summary: AuditSummary!
  }

  type AuditSummary {
    totalActions: Int!
    actionsByType: [ActionCount!]!
    timeRange: TimeRange!
    topActors: [ActorSummary!]!
  }

  type ActionCount {
    action: AuditAction!
    count: Int!
  }

  type ActorSummary {
    actor: Actor!
    actionCount: Int!
    lastActivity: DateTime!
  }

  type TimeRange {
    start: DateTime!
    end: DateTime!
    duration: String!
  }

  type OperationalAnalytics {
    timeRange: TimeRange!
    metrics: [AnalyticsMetricResult!]!
    trends: [OperationalTrend!]!
    insights: [AnalyticsInsight!]!
    benchmarks: [Benchmark!]!
  }

  enum AnalyticsMetric {
    OPERATION_SUCCESS_RATE
    AVERAGE_EXECUTION_TIME
    RESOURCE_UTILIZATION
    RISK_EXPOSURE
    EFFECTIVENESS_SCORE
    ATTRIBUTION_AVOIDANCE
    COMPLIANCE_RATE
    SIMULATION_ACCURACY
  }

  type AnalyticsMetricResult {
    metric: AnalyticsMetric!
    value: Float!
    previousValue: Float
    percentChange: Float
    trend: TrendDirection!
  }

  type OperationalTrend {
    name: String!
    direction: TrendDirection!
    strength: Float!
    significance: Float!
    description: String!
  }

  type AnalyticsInsight {
    id: ID!
    type: InsightType!
    title: String!
    description: String!
    confidence: Float!
    actionable: Boolean!
    recommendations: [String!]!
  }

  enum InsightType {
    PERFORMANCE_IMPROVEMENT
    RISK_MITIGATION
    RESOURCE_OPTIMIZATION
    STRATEGIC_OPPORTUNITY
    COMPLIANCE_CONCERN
    SECURITY_RECOMMENDATION
  }

  type Benchmark {
    name: String!
    currentValue: Float!
    targetValue: Float!
    industry Average: Float
    percentOfTarget: Float!
    status: BenchmarkStatus!
  }

  enum BenchmarkStatus {
    EXCEEDS_TARGET
    MEETS_TARGET
    BELOW_TARGET
    CRITICAL
  }
`;