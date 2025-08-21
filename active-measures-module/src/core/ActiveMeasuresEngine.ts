import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { activeMeasuresGraphRepo } from '../db/neo4j';

export interface ActiveMeasure {
  id: string;
  name: string;
  category: string;
  description: string;
  riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  effectivenessRating: number; // 0-1
  unattributabilityScore: number; // 0-1
  classification: string;
  novelFeatures: NovelFeature[];
  aiCapabilities: AICapability[];
  operationalFramework: OperationalFramework;
  resourceRequirements: ResourceRequirements;
  legalFramework: LegalFramework;
  ethicalScore: number; // 0-1
  pqcResistance: PostQuantumCryptoRating;
  metadata: Record<string, any>;
}

export interface NovelFeature {
  name: string;
  description: string;
  maturityLevel: 'EXPERIMENTAL' | 'PROTOTYPE' | 'OPERATIONAL' | 'MATURE';
  innovationIndex: number; // 0-1
}

export interface AICapability {
  type: 'DEEPFAKE' | 'NLP' | 'BEHAVIORAL_MODELING' | 'PREDICTIVE_ANALYTICS' | 'AUTONOMOUS_EXECUTION';
  description: string;
  confidence: number; // 0-1
  trainingData: string[];
  ethicalConstraints: string[];
}

export interface OperationalFramework {
  doctrine: string;
  tactics: string[];
  procedures: string[];
  successMetrics: SuccessMetric[];
}

export interface SuccessMetric {
  name: string;
  target: number;
  threshold: number;
  measurement: string;
}

export interface ResourceRequirements {
  personnel: number;
  budget: number;
  technology: string[];
  timeframe: number; // days
  specializedAssets: string[];
}

export interface LegalFramework {
  authority: string;
  limitations: string[];
  oversight: string[];
  complianceRequirements: string[];
}

export interface PostQuantumCryptoRating {
  level: 'VULNERABLE' | 'MODERATE' | 'RESISTANT' | 'IMMUNE';
  assessment: string;
  recommendations: string[];
  quantumThreatTimeline: number; // years
}

export interface Operation {
  id: string;
  name: string;
  description: string;
  status: OperationStatus;
  classification: string;
  objectives: Objective[];
  measures: AssignedMeasure[];
  targetProfile: TargetProfile;
  timeline: Timeline;
  team: Team;
  approvalChain: ApprovalRecord[];
  executionPlan?: ExecutionPlan;
  progress: OperationProgress;
  effectivenessMetrics?: EffectivenessMetrics;
  auditTrail: AuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Objective {
  id: string;
  type: 'INFLUENCE_PERCEPTION' | 'DISRUPT_OPERATIONS' | 'GATHER_INTELLIGENCE' | 'COUNTER_NARRATIVE' | 'DETER_ACTION' | 'COMPEL_BEHAVIOR';
  description: string;
  successCriteria: string[];
  metrics: SuccessMetric[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AssignedMeasure {
  measureId: string;
  parameters: Record<string, any>;
  constraints: OperationalConstraint[];
  priority: number;
  resourceAllocation: number; // 0-1
}

export interface OperationalConstraint {
  type: string;
  description: string;
  mandatory: boolean;
  impact: string;
}

export interface TargetProfile {
  entityIds: string[];
  demographicData: Record<string, any>;
  psychographicProfile: Record<string, any>;
  vulnerabilities: Vulnerability[];
  communicationChannels: string[];
  influenceNetwork: Record<string, any>;
  adaptabilityScore: number; // 0-1
}

export interface Vulnerability {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  exploitability: number; // 0-1
  description: string;
  mitigations: string[];
}

export type OperationStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'READY_FOR_EXECUTION' 
  | 'EXECUTING' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'ABORTED' 
  | 'FAILED';

export interface Timeline {
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  phases: OperationPhase[];
}

export interface OperationPhase {
  name: string;
  start: Date;
  end: Date;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DELAYED';
  deliverables: string[];
  dependencies: string[];
}

export interface Team {
  lead: TeamMember;
  members: TeamMember[];
  approvers: Approver[];
  advisors: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  clearanceLevel: string;
  responsibilities: string[];
  contactInfo: Record<string, string>;
}

export interface Approver {
  id: string;
  name: string;
  role: string;
  level: number;
  requiredFor: string[];
}

export interface ApprovalRecord {
  id: string;
  approver: Approver;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
  timestamp: Date;
  conditions: string[];
  comments: string;
  signature: string;
}

export interface ExecutionPlan {
  phases: ExecutionPhase[];
  contingencies: Contingency[];
  riskMitigation: RiskMitigation[];
  communicationPlan: CommunicationPlan;
}

export interface ExecutionPhase {
  name: string;
  objectives: string[];
  tasks: Task[];
  resources: ResourceAllocation[];
  timeline: { start: Date; end: Date };
  successCriteria: string[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  assignee: string;
  dependencies: string[];
  estimatedDuration: number; // hours
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
}

export interface Contingency {
  scenario: string;
  probability: number; // 0-1
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  response: string[];
  triggers: string[];
}

export interface RiskMitigation {
  risk: string;
  probability: number; // 0-1
  impact: string;
  mitigation: string[];
  owner: string;
  deadline: Date;
}

export interface CommunicationPlan {
  channels: CommunicationChannel[];
  protocols: string[];
  escalationMatrix: EscalationRule[];
  emergencyContacts: Contact[];
}

export interface CommunicationChannel {
  name: string;
  type: 'SECURE' | 'ENCRYPTED' | 'AIRGAPPED' | 'PUBLIC';
  participants: string[];
  purpose: string;
}

export interface EscalationRule {
  condition: string;
  timeThreshold: number; // hours
  escalateTo: string;
  action: string;
}

export interface Contact {
  name: string;
  role: string;
  secure: string;
  emergency: string;
}

export interface OperationProgress {
  percentage: number; // 0-100
  currentPhase: string;
  completedTasks: number;
  totalTasks: number;
  estimatedCompletion: Date;
  blockers: Blocker[];
}

export interface Blocker {
  id: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner: string;
  estimatedResolution: Date;
}

export interface EffectivenessMetrics {
  primaryObjectives: ObjectiveMetric[];
  secondaryEffects: SecondaryEffect[];
  unintendedConsequences: UnintendedConsequence[];
  attributionAnalysis: AttributionAnalysis;
  networkImpact: NetworkImpactAnalysis;
  temporalEffects: TemporalEffectsAnalysis;
}

export interface ObjectiveMetric {
  objectiveId: string;
  achievementRate: number; // 0-1
  confidence: number; // 0-1
  impact: string;
  timeline: string;
}

export interface SecondaryEffect {
  type: string;
  magnitude: number; // 0-1
  significance: string;
  duration: string;
}

export interface UnintendedConsequence {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigation: string[];
  responsibility: string;
}

export interface AttributionAnalysis {
  probability: number; // 0-1
  indicators: string[];
  countermeasures: string[];
  plausibleDeniability: number; // 0-1
}

export interface NetworkImpactAnalysis {
  reach: number;
  influence: number; // 0-1
  cascadeEffects: CascadeEffect[];
  feedback: FeedbackLoop[];
}

export interface CascadeEffect {
  trigger: string;
  propagation: string[];
  magnitude: number; // 0-1
  timeframe: string;
}

export interface FeedbackLoop {
  type: 'POSITIVE' | 'NEGATIVE';
  strength: number; // 0-1
  delay: number; // hours
  description: string;
}

export interface TemporalEffectsAnalysis {
  shortTerm: EffectProfile;
  mediumTerm: EffectProfile;
  longTerm: EffectProfile;
}

export interface EffectProfile {
  timeframe: string;
  expectedEffects: string[];
  confidence: number; // 0-1
  variance: number; // 0-1
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: Actor;
  action: string;
  operationId?: string;
  details: Record<string, any>;
  classification: string;
  ipAddress: string;
  userAgent: string;
  geolocation?: GeolocationData;
  cryptographicSignature: string;
}

export interface Actor {
  id: string;
  type: 'HUMAN_OPERATOR' | 'AI_SYSTEM' | 'AUTOMATED_PROCESS' | 'EXTERNAL_SYSTEM';
  name: string;
  role: string;
  clearanceLevel: string;
  organization: string;
}

export interface GeolocationData {
  country: string;
  region: string;
  city: string;
  coordinates: [number, number]; // [lat, lng]
  accuracy: number;
  source: string;
}

export interface Tuners {
  proportionality: number; // 0-1
  riskTolerance: number; // 0-1
  ethicalIndex: number; // 0-1
  unattributabilityRequirement: number; // 0-1
  resourceConstraints: ResourceConstraints;
  operationalSecurity: OperationalSecurity;
  plausibleDeniability: number; // 0-1
  collateralDamageThreshold: number; // 0-1
}

export interface ResourceConstraints {
  maxBudget: number;
  maxPersonnel: number;
  maxDuration: number; // days
  availableAssets: string[];
  geographicalConstraints: string[];
}

export interface OperationalSecurity {
  classificationLevel: string;
  compartmentalization: string[];
  needToKnowGroups: string[];
  communicationProtocols: string[];
}

export class ActiveMeasuresEngine {
  private neo4jRepo: any;
  private measuresCatalog: Map<string, ActiveMeasure> = new Map();
  private operationsRegistry: Map<string, Operation> = new Map();

  constructor(neo4jDriver: any) {
    this.neo4jRepo = activeMeasuresGraphRepo;
    this.initializeMeasuresCatalog();
    logger.info('Active Measures Engine initialized');\n  }\n\n  // Initialize the measures catalog with predefined measures\n  private async initializeMeasuresCatalog(): Promise<void> {\n    try {\n      // Initialize schema\n      await this.neo4jRepo.initializeSchema();\n\n      // Seed with sample measures if empty\n      const existingMeasures = await this.neo4jRepo.getActiveMeasuresPortfolio({});\n      if (existingMeasures.length === 0) {\n        await this.seedSampleMeasures();\n      }\n\n      logger.info('Active Measures catalog initialized');\n    } catch (error) {\n      logger.error('Failed to initialize measures catalog', { error: error.message });\n      throw error;\n    }\n  }\n\n  // Seed the database with sample active measures\n  private async seedSampleMeasures(): Promise<void> {\n    const sampleMeasures: Partial<ActiveMeasure>[] = [\n      {\n        id: 'info-ops-001',\n        name: 'Coordinated Inauthentic Behavior',\n        category: 'INFORMATION_OPERATIONS',\n        description: 'Orchestrated network of authentic-appearing accounts to amplify narratives',\n        riskLevel: 'MODERATE',\n        effectivenessRating: 0.75,\n        unattributabilityScore: 0.85,\n        classification: 'SECRET',\n        ethicalScore: 0.6,\n        metadata: {\n          platforms: ['social_media', 'forums', 'news_sites'],\n          scalability: 'HIGH',\n          detectability: 'MEDIUM',\n        },\n      },\n      {\n        id: 'cyber-ops-001',\n        name: 'Infrastructure Disruption Campaign',\n        category: 'CYBER_OPERATIONS',\n        description: 'Targeted disruption of critical infrastructure systems',\n        riskLevel: 'HIGH',\n        effectivenessRating: 0.90,\n        unattributabilityScore: 0.70,\n        classification: 'TOP_SECRET',\n        ethicalScore: 0.3,\n        metadata: {\n          targets: ['power_grid', 'communications', 'transportation'],\n          persistence: 'MEDIUM',\n          collateralDamage: 'MEDIUM',\n        },\n      },\n      {\n        id: 'psyops-001',\n        name: 'Behavioral Influence Network',\n        category: 'PSYCHOLOGICAL_OPERATIONS',\n        description: 'AI-driven personalized psychological influence campaigns',\n        riskLevel: 'HIGH',\n        effectivenessRating: 0.85,\n        unattributabilityScore: 0.90,\n        classification: 'SECRET',\n        ethicalScore: 0.4,\n        metadata: {\n          aiModels: ['gpt-4', 'behavioral_prediction', 'sentiment_analysis'],\n          personalization: 'HIGH',\n          scalability: 'EXTREME',\n        },\n      },\n      {\n        id: 'econ-pressure-001',\n        name: 'Market Volatility Induction',\n        category: 'ECONOMIC_PRESSURE',\n        description: 'Strategic market manipulation to create economic instability',\n        riskLevel: 'CRITICAL',\n        effectivenessRating: 0.95,\n        unattributabilityScore: 0.60,\n        classification: 'TOP_SECRET',\n        ethicalScore: 0.2,\n        metadata: {\n          markets: ['forex', 'commodities', 'crypto'],\n          leverage: 'HIGH',\n          reversibility: 'LOW',\n        },\n      },\n      {\n        id: 'cultural-ops-001',\n        name: 'Cultural Narrative Reshaping',\n        category: 'CULTURAL_OPERATIONS',\n        description: 'Long-term cultural influence through entertainment and media',\n        riskLevel: 'LOW',\n        effectivenessRating: 0.60,\n        unattributabilityScore: 0.95,\n        classification: 'CONFIDENTIAL',\n        ethicalScore: 0.7,\n        metadata: {\n          timeframe: 'LONG_TERM',\n          channels: ['entertainment', 'education', 'social_media'],\n          subtlety: 'HIGH',\n        },\n      },\n    ];\n\n    for (const measure of sampleMeasures) {\n      try {\n        await this.neo4jRepo.createActiveMeasure(measure);\n        logger.info('Seeded sample measure', { measureId: measure.id, name: measure.name });\n      } catch (error) {\n        logger.warn('Failed to seed measure', { measureId: measure.id, error: error.message });\n      }\n    }\n\n    metricsCollector.setGauge('seeded_measures', sampleMeasures.length);\n    logger.info('Sample measures seeded successfully');\n  }\n\n  // Get portfolio of active measures with filtering and tuning\n  async getActiveMeasuresPortfolio(\n    filters: any = {},\n    tuners: Partial<Tuners> = {}\n  ): Promise<any> {\n    try {\n      const startTime = Date.now();\n      \n      // Apply ethical constraints\n      const ethicallyFilteredMeasures = await this.applyEthicalFiltering(filters, tuners);\n      \n      // Get measures from Neo4j\n      const measures = await this.neo4jRepo.getActiveMeasuresPortfolio(ethicallyFilteredMeasures);\n      \n      // Apply tuning algorithms\n      const tunedMeasures = this.applyTuningAlgorithms(measures, tuners);\n      \n      // Generate recommendations\n      const recommendations = this.generateRecommendations(tunedMeasures, tuners);\n      \n      // Calculate risk assessment\n      const riskAssessment = this.calculateRiskAssessment(tunedMeasures);\n      \n      // Check compliance status\n      const complianceStatus = await this.checkComplianceStatus(tunedMeasures);\n      \n      const portfolio = {\n        id: uuidv4(),\n        totalCount: tunedMeasures.length,\n        measures: tunedMeasures,\n        categories: this.categorizeMeasures(tunedMeasures),\n        recommendations,\n        riskAssessment,\n        complianceStatus,\n      };\n      \n      const duration = Date.now() - startTime;\n      metricsCollector.recordHistogram('portfolio_generation_time', duration);\n      metricsCollector.incrementCounter('portfolio_requests');\n      \n      logger.info('Generated active measures portfolio', {\n        measureCount: tunedMeasures.length,\n        duration,\n        filters,\n        tuners,\n      });\n      \n      return portfolio;\n    } catch (error) {\n      metricsCollector.incrementCounter('portfolio_errors');\n      logger.error('Failed to generate portfolio', { error: error.message, filters, tuners });\n      throw error;\n    }\n  }\n\n  // Apply ethical filtering based on constraints\n  private async applyEthicalFiltering(\n    filters: any,\n    tuners: Partial<Tuners>\n  ): Promise<any> {\n    const ethicalIndex = tuners.ethicalIndex || 0.8;\n    \n    // Filter out measures that don't meet ethical requirements\n    const ethicalFilters = {\n      ...filters,\n      ethicalScoreThreshold: ethicalIndex,\n    };\n    \n    // Apply additional ethical constraints\n    if (ethicalIndex > 0.9) {\n      // Strict ethical mode - exclude high-risk operations\n      ethicalFilters.excludeCategories = [\n        ...(ethicalFilters.excludeCategories || []),\n        'ECONOMIC_PRESSURE',\n      ];\n      ethicalFilters.maxRiskLevel = 'MODERATE';\n    }\n    \n    logger.debug('Applied ethical filtering', { ethicalIndex, ethicalFilters });\n    return ethicalFilters;\n  }\n\n  // Apply tuning algorithms to optimize measure selection\n  private applyTuningAlgorithms(measures: any[], tuners: Partial<Tuners>): any[] {\n    const {\n      proportionality = 0.5,\n      riskTolerance = 0.3,\n      unattributabilityRequirement = 0.7,\n      plausibleDeniability = 0.9,\n    } = tuners;\n    \n    return measures\n      .map(measure => {\n        // Calculate composite score based on tuners\n        const effectivenessWeight = proportionality;\n        const riskWeight = 1 - riskTolerance;\n        const unattributabilityWeight = unattributabilityRequirement;\n        const deniabilityWeight = plausibleDeniability;\n        \n        const riskPenalty = this.calculateRiskPenalty(measure.riskLevel);\n        \n        const compositeScore = (\n          (measure.effectivenessRating * effectivenessWeight) +\n          (measure.unattributabilityScore * unattributabilityWeight) +\n          ((1 - riskPenalty) * riskWeight) +\n          (measure.plausibleDeniabilityScore || 0.5) * deniabilityWeight\n        ) / 4;\n        \n        return {\n          ...measure,\n          compositeScore,\n          tuningMetadata: {\n            effectivenessContribution: measure.effectivenessRating * effectivenessWeight,\n            riskContribution: (1 - riskPenalty) * riskWeight,\n            unattributabilityContribution: measure.unattributabilityScore * unattributabilityWeight,\n            deniabilityContribution: (measure.plausibleDeniabilityScore || 0.5) * deniabilityWeight,\n          },\n        };\n      })\n      .sort((a, b) => b.compositeScore - a.compositeScore)\n      .slice(0, 50); // Limit to top 50 measures\n  }\n\n  // Calculate risk penalty based on risk level\n  private calculateRiskPenalty(riskLevel: string): number {\n    const riskPenalties = {\n      MINIMAL: 0.0,\n      LOW: 0.1,\n      MODERATE: 0.3,\n      HIGH: 0.6,\n      CRITICAL: 0.9,\n    };\n    return riskPenalties[riskLevel] || 0.5;\n  }\n\n  // Generate recommendations based on portfolio analysis\n  private generateRecommendations(measures: any[], tuners: Partial<Tuners>): any[] {\n    const recommendations = [];\n    \n    // Analyze portfolio composition\n    const categoryDistribution = this.analyzeCategoryDistribution(measures);\n    const riskProfile = this.analyzeRiskProfile(measures);\n    const effectivenessProfile = this.analyzeEffectivenessProfile(measures);\n    \n    // Generate diversification recommendations\n    if (categoryDistribution.dominantCategory.percentage > 0.7) {\n      recommendations.push({\n        id: uuidv4(),\n        type: 'DIVERSIFICATION',\n        title: 'Portfolio Diversification Needed',\n        description: `Portfolio is heavily concentrated in ${categoryDistribution.dominantCategory.name} (${categoryDistribution.dominantCategory.percentage * 100}%). Consider adding measures from other categories.`,\n        priority: 'HIGH',\n        rationale: 'Diversified portfolios are more resilient to countermeasures and detection.',\n      });\n    }\n    \n    // Generate risk balance recommendations\n    if (riskProfile.averageRisk > 0.7 && tuners.riskTolerance < 0.5) {\n      recommendations.push({\n        id: uuidv4(),\n        type: 'RISK_MITIGATION',\n        title: 'High Risk Profile Detected',\n        description: 'Current portfolio exceeds risk tolerance. Consider adding lower-risk measures or implementing additional safeguards.',\n        priority: 'CRITICAL',\n        rationale: 'High-risk operations require careful risk management and may face approval challenges.',\n      });\n    }\n    \n    // Generate effectiveness optimization recommendations\n    if (effectivenessProfile.lowEffectivenessMeasures > 0.3) {\n      recommendations.push({\n        id: uuidv4(),\n        type: 'EFFECTIVENESS_OPTIMIZATION',\n        title: 'Effectiveness Optimization Opportunity',\n        description: 'Multiple low-effectiveness measures detected. Consider combining or replacing with higher-impact alternatives.',\n        priority: 'MEDIUM',\n        rationale: 'Resource optimization and improved outcomes through strategic measure selection.',\n      });\n    }\n    \n    return recommendations;\n  }\n\n  // Analyze category distribution in portfolio\n  private analyzeCategoryDistribution(measures: any[]): any {\n    const categoryCounts = {};\n    measures.forEach(measure => {\n      categoryCounts[measure.category] = (categoryCounts[measure.category] || 0) + 1;\n    });\n    \n    const totalMeasures = measures.length;\n    const categoryPercentages = Object.entries(categoryCounts).map(([category, count]) => ({\n      name: category,\n      count: count as number,\n      percentage: (count as number) / totalMeasures,\n    }));\n    \n    const dominantCategory = categoryPercentages.reduce((max, current) => \n      current.percentage > max.percentage ? current : max\n    );\n    \n    return {\n      categories: categoryPercentages,\n      dominantCategory,\n      diversityIndex: this.calculateDiversityIndex(categoryPercentages),\n    };\n  }\n\n  // Calculate portfolio diversity index\n  private calculateDiversityIndex(categoryPercentages: any[]): number {\n    // Shannon diversity index\n    return -categoryPercentages.reduce((sum, cat) => {\n      if (cat.percentage > 0) {\n        return sum + cat.percentage * Math.log(cat.percentage);\n      }\n      return sum;\n    }, 0);\n  }\n\n  // Analyze risk profile of portfolio\n  private analyzeRiskProfile(measures: any[]): any {\n    const riskValues = measures.map(measure => this.calculateRiskPenalty(measure.riskLevel));\n    const averageRisk = riskValues.reduce((sum, risk) => sum + risk, 0) / riskValues.length;\n    const riskVariance = this.calculateVariance(riskValues);\n    \n    return {\n      averageRisk,\n      riskVariance,\n      highRiskMeasures: measures.filter(m => ['HIGH', 'CRITICAL'].includes(m.riskLevel)).length,\n      riskDistribution: this.calculateRiskDistribution(measures),\n    };\n  }\n\n  // Analyze effectiveness profile\n  private analyzeEffectivenessProfile(measures: any[]): any {\n    const effectivenessScores = measures.map(m => m.effectivenessRating);\n    const averageEffectiveness = effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length;\n    const lowEffectivenessMeasures = measures.filter(m => m.effectivenessRating < 0.6).length / measures.length;\n    \n    return {\n      averageEffectiveness,\n      lowEffectivenessMeasures,\n      topPerformers: measures.filter(m => m.effectivenessRating > 0.8).length,\n    };\n  }\n\n  // Calculate variance for risk analysis\n  private calculateVariance(values: number[]): number {\n    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;\n    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));\n    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;\n  }\n\n  // Calculate risk distribution\n  private calculateRiskDistribution(measures: any[]): any {\n    const distribution = {\n      MINIMAL: 0,\n      LOW: 0,\n      MODERATE: 0,\n      HIGH: 0,\n      CRITICAL: 0,\n    };\n    \n    measures.forEach(measure => {\n      distribution[measure.riskLevel]++;\n    });\n    \n    const total = measures.length;\n    return Object.entries(distribution).reduce((acc, [level, count]) => {\n      acc[level] = count / total;\n      return acc;\n    }, {});\n  }\n\n  // Calculate overall risk assessment\n  private calculateRiskAssessment(measures: any[]): any {\n    const riskProfile = this.analyzeRiskProfile(measures);\n    \n    let overallRisk: string;\n    if (riskProfile.averageRisk < 0.3) overallRisk = 'LOW';\n    else if (riskProfile.averageRisk < 0.6) overallRisk = 'MODERATE';\n    else if (riskProfile.averageRisk < 0.8) overallRisk = 'HIGH';\n    else overallRisk = 'CRITICAL';\n    \n    const categories = [\n      {\n        name: 'Operational Risk',\n        level: overallRisk,\n        probability: riskProfile.averageRisk,\n        impact: 'Operations could be compromised or detected',\n        factors: ['Attribution risk', 'Detection probability', 'Countermeasure effectiveness'],\n      },\n      {\n        name: 'Legal Risk',\n        level: measures.some(m => m.classification === 'TOP_SECRET') ? 'HIGH' : 'MODERATE',\n        probability: 0.3,\n        impact: 'Legal consequences for unauthorized activities',\n        factors: ['Jurisdictional issues', 'International law violations', 'Domestic legal constraints'],\n      },\n      {\n        name: 'Ethical Risk',\n        level: this.calculateEthicalRiskLevel(measures),\n        probability: 0.4,\n        impact: 'Reputation damage and ethical violations',\n        factors: ['Civilian impact', 'Human rights concerns', 'Proportionality issues'],\n      },\n    ];\n    \n    return {\n      overallRisk,\n      categories,\n      mitigationStrategies: this.generateRiskMitigationStrategies(riskProfile),\n      lastUpdated: new Date().toISOString(),\n    };\n  }\n\n  // Calculate ethical risk level\n  private calculateEthicalRiskLevel(measures: any[]): string {\n    const averageEthicalScore = measures.reduce((sum, m) => sum + (m.ethicalScore || 0.5), 0) / measures.length;\n    \n    if (averageEthicalScore > 0.8) return 'LOW';\n    if (averageEthicalScore > 0.6) return 'MODERATE';\n    if (averageEthicalScore > 0.4) return 'HIGH';\n    return 'CRITICAL';\n  }\n\n  // Generate risk mitigation strategies\n  private generateRiskMitigationStrategies(riskProfile: any): string[] {\n    const strategies = [];\n    \n    if (riskProfile.averageRisk > 0.6) {\n      strategies.push('Implement additional operational security measures');\n      strategies.push('Establish robust plausible deniability protocols');\n      strategies.push('Develop comprehensive cover stories and legends');\n    }\n    \n    if (riskProfile.highRiskMeasures > 2) {\n      strategies.push('Consider phased implementation to reduce simultaneous exposure');\n      strategies.push('Establish emergency abort and cleanup procedures');\n    }\n    \n    strategies.push('Regular threat assessment and countermeasure analysis');\n    strategies.push('Continuous monitoring of detection indicators');\n    strategies.push('Maintain operational compartmentalization');\n    \n    return strategies;\n  }\n\n  // Check compliance status\n  private async checkComplianceStatus(measures: any[]): Promise<any> {\n    const frameworks = [\n      {\n        name: 'DoD Directive 3600.01',\n        status: 'COMPLIANT',\n        lastReview: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),\n        issues: [],\n      },\n      {\n        name: 'Executive Order 12333',\n        status: 'REVIEW_REQUIRED',\n        lastReview: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),\n        issues: ['Attribution requirements need clarification'],\n      },\n      {\n        name: 'Geneva Conventions',\n        status: measures.some(m => m.category === 'ECONOMIC_PRESSURE') ? 'POTENTIAL_VIOLATION' : 'COMPLIANT',\n        lastReview: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),\n        issues: measures.some(m => m.category === 'ECONOMIC_PRESSURE') ? ['Economic warfare provisions'] : [],\n      },\n    ];\n    \n    const overallStatus = frameworks.some(f => f.status === 'POTENTIAL_VIOLATION') \n      ? 'NON_COMPLIANT'\n      : frameworks.some(f => f.status === 'REVIEW_REQUIRED')\n      ? 'REVIEW_REQUIRED'\n      : 'COMPLIANT';\n    \n    return {\n      overallStatus,\n      frameworks,\n    };\n  }\n\n  // Categorize measures for portfolio display\n  private categorizeMeasures(measures: any[]): any[] {\n    const categories = {};\n    \n    measures.forEach(measure => {\n      if (!categories[measure.category]) {\n        categories[measure.category] = {\n          name: measure.category,\n          count: 0,\n          totalEffectiveness: 0,\n        };\n      }\n      \n      categories[measure.category].count++;\n      categories[measure.category].totalEffectiveness += measure.effectivenessRating;\n    });\n    \n    return Object.values(categories).map((category: any) => ({\n      ...category,\n      averageEffectiveness: category.totalEffectiveness / category.count,\n    }));\n  }\n\n  // Create a new operation\n  async createOperation(operationData: any): Promise<string> {\n    try {\n      const operationId = uuidv4();\n      const operation = {\n        id: operationId,\n        ...operationData,\n        status: 'DRAFT',\n        createdAt: new Date().toISOString(),\n        updatedAt: new Date().toISOString(),\n      };\n      \n      const createdId = await this.neo4jRepo.createOperation(operation);\n      \n      // Link measures to operation if provided\n      if (operationData.measures && operationData.measures.length > 0) {\n        const measureIds = operationData.measures.map(m => m.categoryId || m.id);\n        await this.neo4jRepo.linkOperationToMeasures(createdId, measureIds);\n      }\n      \n      // Create audit entry\n      await this.createAuditEntry({\n        actor: operationData.createdBy || 'system',\n        action: 'CREATE_OPERATION',\n        operationId: createdId,\n        details: { operationName: operation.name, classification: operation.classification },\n      });\n      \n      metricsCollector.incrementCounter('operations_created');\n      logger.info('Operation created successfully', { operationId: createdId, name: operation.name });\n      \n      return createdId;\n    } catch (error) {\n      metricsCollector.incrementCounter('operation_creation_errors');\n      logger.error('Failed to create operation', { error: error.message, operationData });\n      throw error;\n    }\n  }\n\n  // Get operation details\n  async getOperation(operationId: string): Promise<Operation | null> {\n    try {\n      const operation = await this.neo4jRepo.getOperation(operationId);\n      \n      if (operation) {\n        metricsCollector.incrementCounter('operation_retrievals');\n        logger.debug('Operation retrieved', { operationId });\n      }\n      \n      return operation;\n    } catch (error) {\n      logger.error('Failed to retrieve operation', { error: error.message, operationId });\n      throw error;\n    }\n  }\n\n  // Create audit entry\n  async createAuditEntry(entryData: any): Promise<string> {\n    try {\n      const auditEntry = {\n        id: uuidv4(),\n        timestamp: new Date().toISOString(),\n        ...entryData,\n        cryptographicSignature: this.generateCryptographicSignature(entryData),\n      };\n      \n      const entryId = await this.neo4jRepo.createAuditEntry(auditEntry);\n      \n      metricsCollector.incrementCounter('audit_entries_total');\n      logger.debug('Audit entry created', { entryId, action: entryData.action });\n      \n      return entryId;\n    } catch (error) {\n      logger.error('Failed to create audit entry', { error: error.message, entryData });\n      throw error;\n    }\n  }\n\n  // Generate cryptographic signature for audit entries\n  private generateCryptographicSignature(data: any): string {\n    // In production, use proper cryptographic signing\n    const crypto = require('crypto');\n    const hash = crypto.createHash('sha256');\n    hash.update(JSON.stringify(data));\n    return hash.digest('hex');\n  }\n\n  // Combine multiple measures into an operation plan\n  async combineMeasures(\n    measureIds: string[],\n    tuners: Partial<Tuners>,\n    context: any\n  ): Promise<any> {\n    try {\n      const startTime = Date.now();\n      \n      // Retrieve measure details\n      const measures = await Promise.all(\n        measureIds.map(id => this.getMeasureById(id))\n      );\n      \n      // Analyze compatibility\n      const compatibilityMatrix = this.analyzeCompatibility(measures);\n      \n      // Generate operation plan\n      const operationPlan = this.generateOperationPlan(measures, tuners, context);\n      \n      // Calculate predicted effects\n      const predictedEffects = this.calculatePredictedEffects(measures, context);\n      \n      // Assess risks\n      const riskAssessment = this.assessCombinedRisks(measures);\n      \n      // Generate recommendations\n      const recommendations = this.generateCombinationRecommendations(measures, compatibilityMatrix);\n      \n      const result = {\n        success: true,\n        operationPlan: {\n          ...operationPlan,\n          predictedEffects,\n          riskAssessment,\n        },\n        compatibilityMatrix,\n        recommendations,\n        errors: [],\n      };\n      \n      const duration = Date.now() - startTime;\n      metricsCollector.recordHistogram('measure_combination_time', duration);\n      metricsCollector.incrementCounter('measures_combined');\n      \n      logger.info('Measures combined successfully', {\n        measureCount: measureIds.length,\n        duration,\n        context,\n      });\n      \n      return result;\n    } catch (error) {\n      metricsCollector.incrementCounter('measure_combination_errors');\n      logger.error('Failed to combine measures', { error: error.message, measureIds, context });\n      throw error;\n    }\n  }\n\n  // Get measure by ID (placeholder - would query Neo4j)\n  private async getMeasureById(id: string): Promise<any> {\n    // Mock implementation - in production, query Neo4j\n    return {\n      id,\n      name: `Measure ${id}`,\n      category: 'INFORMATION_OPERATIONS',\n      effectivenessRating: 0.7,\n      riskLevel: 'MODERATE',\n      compatibilityFactors: ['social_media', 'narrative_control'],\n    };\n  }\n\n  // Analyze compatibility between measures\n  private analyzeCompatibility(measures: any[]): any[] {\n    const matrix = [];\n    \n    for (let i = 0; i < measures.length; i++) {\n      for (let j = i + 1; j < measures.length; j++) {\n        const measure1 = measures[i];\n        const measure2 = measures[j];\n        \n        const compatibilityScore = this.calculateCompatibilityScore(measure1, measure2);\n        const synergies = this.identifySynergies(measure1, measure2);\n        const conflicts = this.identifyConflicts(measure1, measure2);\n        \n        matrix.push({\n          measure1Id: measure1.id,\n          measure2Id: measure2.id,\n          compatibilityScore,\n          synergies,\n          conflicts,\n        });\n      }\n    }\n    \n    return matrix;\n  }\n\n  // Calculate compatibility score between two measures\n  private calculateCompatibilityScore(measure1: any, measure2: any): number {\n    let score = 0.5; // Base compatibility\n    \n    // Category compatibility\n    if (measure1.category === measure2.category) {\n      score += 0.2;\n    } else if (this.areRelatedCategories(measure1.category, measure2.category)) {\n      score += 0.1;\n    }\n    \n    // Risk level compatibility\n    const riskDifference = Math.abs(\n      this.calculateRiskPenalty(measure1.riskLevel) - \n      this.calculateRiskPenalty(measure2.riskLevel)\n    );\n    score += (1 - riskDifference) * 0.2;\n    \n    // Resource compatibility\n    score += this.calculateResourceCompatibility(measure1, measure2) * 0.1;\n    \n    return Math.min(1, Math.max(0, score));\n  }\n\n  // Check if categories are related\n  private areRelatedCategories(cat1: string, cat2: string): boolean {\n    const relatedCategories = {\n      'INFORMATION_OPERATIONS': ['PSYCHOLOGICAL_OPERATIONS', 'CULTURAL_OPERATIONS'],\n      'CYBER_OPERATIONS': ['TECHNOLOGICAL_DISRUPTION'],\n      'ECONOMIC_PRESSURE': ['DIPLOMATIC_INFLUENCE'],\n    };\n    \n    return relatedCategories[cat1]?.includes(cat2) || relatedCategories[cat2]?.includes(cat1);\n  }\n\n  // Calculate resource compatibility\n  private calculateResourceCompatibility(measure1: any, measure2: any): number {\n    // Simplified resource compatibility calculation\n    return 0.7; // Placeholder\n  }\n\n  // Identify synergies between measures\n  private identifySynergies(measure1: any, measure2: any): string[] {\n    const synergies = [];\n    \n    if (measure1.category === 'INFORMATION_OPERATIONS' && measure2.category === 'PSYCHOLOGICAL_OPERATIONS') {\n      synergies.push('Coordinated narrative and psychological influence');\n    }\n    \n    if (measure1.category === 'CYBER_OPERATIONS' && measure2.category === 'INFORMATION_OPERATIONS') {\n      synergies.push('Technical and narrative disruption combination');\n    }\n    \n    return synergies;\n  }\n\n  // Identify conflicts between measures\n  private identifyConflicts(measure1: any, measure2: any): string[] {\n    const conflicts = [];\n    \n    if (measure1.riskLevel === 'CRITICAL' && measure2.riskLevel === 'CRITICAL') {\n      conflicts.push('Excessive risk accumulation');\n    }\n    \n    if (measure1.category === 'ECONOMIC_PRESSURE' && measure2.category === 'DIPLOMATIC_INFLUENCE') {\n      conflicts.push('Contradictory diplomatic and economic signals');\n    }\n    \n    return conflicts;\n  }\n\n  // Generate operation plan from combined measures\n  private generateOperationPlan(measures: any[], tuners: Partial<Tuners>, context: any): any {\n    return {\n      id: uuidv4(),\n      name: `Combined Operation - ${measures.length} Measures`,\n      graph: this.generateCytoscapeGraph(measures),\n      resourceRequirements: this.calculateCombinedResourceRequirements(measures),\n      ethicalAssessment: this.calculateCombinedEthicalAssessment(measures, tuners),\n      timeline: this.generateCombinedTimeline(measures, context),\n      auditTrail: [{\n        timestamp: new Date().toISOString(),\n        actor: 'system',\n        action: 'GENERATE_OPERATION_PLAN',\n        details: { measureCount: measures.length, context },\n      }],\n    };\n  }\n\n  // Generate Cytoscape-compatible graph representation\n  private generateCytoscapeGraph(measures: any[]): any {\n    const nodes = measures.map(measure => ({\n      data: {\n        id: measure.id,\n        label: measure.name,\n        category: measure.category,\n        effectiveness: measure.effectivenessRating,\n        risk: measure.riskLevel,\n      },\n    }));\n    \n    const edges = [];\n    for (let i = 0; i < measures.length; i++) {\n      for (let j = i + 1; j < measures.length; j++) {\n        const compatibility = this.calculateCompatibilityScore(measures[i], measures[j]);\n        if (compatibility > 0.6) {\n          edges.push({\n            data: {\n              id: `${measures[i].id}-${measures[j].id}`,\n              source: measures[i].id,\n              target: measures[j].id,\n              strength: compatibility,\n            },\n          });\n        }\n      }\n    }\n    \n    return { nodes, edges };\n  }\n\n  // Calculate predicted effects of combined measures\n  private calculatePredictedEffects(measures: any[], context: any): any[] {\n    return [\n      {\n        metric: 'Target Influence',\n        impact: measures.reduce((sum, m) => sum + m.effectivenessRating, 0) / measures.length,\n        confidence: 0.7,\n        feedbackLoop: 'Positive reinforcement through multiple vectors',\n      },\n      {\n        metric: 'Attribution Risk',\n        impact: 1 - (measures.reduce((sum, m) => sum + m.unattributabilityScore, 0) / measures.length),\n        confidence: 0.8,\n        feedbackLoop: 'Increased risk with measure proliferation',\n      },\n      {\n        metric: 'Resource Efficiency',\n        impact: this.calculateResourceEfficiency(measures),\n        confidence: 0.6,\n        feedbackLoop: 'Economies of scale in coordinated operations',\n      },\n    ];\n  }\n\n  // Calculate resource efficiency\n  private calculateResourceEfficiency(measures: any[]): number {\n    // Simplified efficiency calculation\n    const totalEffectiveness = measures.reduce((sum, m) => sum + m.effectivenessRating, 0);\n    const averageResourceRequirement = 0.6; // Placeholder\n    return totalEffectiveness / (measures.length * averageResourceRequirement);\n  }\n\n  // Assess combined risks\n  private assessCombinedRisks(measures: any[]): any {\n    const individualRisks = measures.map(m => this.calculateRiskPenalty(m.riskLevel));\n    const combinedRisk = Math.min(1, individualRisks.reduce((sum, risk) => sum + risk, 0) / measures.length * 1.2);\n    \n    return {\n      overallRisk: combinedRisk > 0.8 ? 'CRITICAL' : combinedRisk > 0.6 ? 'HIGH' : combinedRisk > 0.4 ? 'MODERATE' : 'LOW',\n      mitigationStrategies: [\n        'Implement staggered execution timeline',\n        'Establish multiple fallback options',\n        'Enhance operational compartmentalization',\n      ],\n    };\n  }\n\n  // Generate combination recommendations\n  private generateCombinationRecommendations(measures: any[], compatibilityMatrix: any[]): any[] {\n    const recommendations = [];\n    \n    const lowCompatibilityPairs = compatibilityMatrix.filter(pair => pair.compatibilityScore < 0.4);\n    if (lowCompatibilityPairs.length > 0) {\n      recommendations.push({\n        type: 'COMPATIBILITY_WARNING',\n        description: `${lowCompatibilityPairs.length} measure pairs have low compatibility scores`,\n        priority: 'HIGH',\n        rationale: 'Low compatibility may reduce overall effectiveness or increase risk',\n      });\n    }\n    \n    const highSynergyPairs = compatibilityMatrix.filter(pair => pair.synergies.length > 0);\n    if (highSynergyPairs.length > 0) {\n      recommendations.push({\n        type: 'SYNERGY_OPPORTUNITY',\n        description: `${highSynergyPairs.length} synergistic measure combinations identified`,\n        priority: 'MEDIUM',\n        rationale: 'Leverage synergies for enhanced effectiveness',\n      });\n    }\n    \n    return recommendations;\n  }\n\n  // Calculate combined resource requirements\n  private calculateCombinedResourceRequirements(measures: any[]): any {\n    return {\n      personnel: measures.length * 5, // Simplified calculation\n      budget: measures.length * 100000, // Simplified calculation\n      technology: ['secure_communications', 'data_analytics', 'operational_security'],\n      timeframe: Math.max(...measures.map(() => 30)), // Simplified calculation\n    };\n  }\n\n  // Calculate combined ethical assessment\n  private calculateCombinedEthicalAssessment(measures: any[], tuners: Partial<Tuners>): any {\n    const averageEthicalScore = measures.reduce((sum, m) => sum + (m.ethicalScore || 0.5), 0) / measures.length;\n    \n    return {\n      score: averageEthicalScore,\n      concerns: averageEthicalScore < 0.6 ? ['Potential ethical violations', 'Civilian impact risk'] : [],\n      recommendations: [\n        'Regular ethical review checkpoints',\n        'Civilian protection protocols',\n        'Proportionality assessments',\n      ],\n    };\n  }\n\n  // Generate combined timeline\n  private generateCombinedTimeline(measures: any[], context: any): any {\n    const phases = [\n      { name: 'Preparation', duration: 7, activities: ['Intelligence gathering', 'Asset positioning'] },\n      { name: 'Initial Execution', duration: 14, activities: ['Phase 1 operations', 'Monitoring'] },\n      { name: 'Full Deployment', duration: 30, activities: ['Coordinated execution', 'Real-time adjustment'] },\n      { name: 'Assessment', duration: 7, activities: ['Effect evaluation', 'Cleanup operations'] },\n    ];\n    \n    return {\n      totalDuration: phases.reduce((sum, phase) => sum + phase.duration, 0),\n      phases,\n      criticalPath: ['Preparation', 'Initial Execution'],\n      contingencyBuffer: 14, // days\n    };\n  }\n}\n\nexport default ActiveMeasuresEngine;