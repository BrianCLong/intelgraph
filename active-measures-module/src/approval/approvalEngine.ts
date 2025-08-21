/**
 * Comprehensive Approval Chain Engine
 * 
 * Implements multi-stage approval workflows with role-based access control,
 * automated policy evaluation, and comprehensive tracking of decision chains.
 */

import { AuditEngine, AuditAction, AuditActor, ClassificationLevel, UserRole } from '../audit/auditEngine';

export interface ApprovalConfig {
  enableMultiStageApproval: boolean;
  enableAutomatedPolicyChecks: boolean;
  enableRiskBasedApproval: boolean;
  enableTimeBasedExpiry: boolean;
  enableDelegation: boolean;
  requireCounterSignature: boolean;
  maxApprovalTimeout: number; // minutes
}

export interface ApprovalRequest {
  id: string;
  operationId: string;
  requesterId: string;
  submittedAt: Date;
  expiresAt?: Date;
  
  // Request Details
  title: string;
  description: string;
  justification: string;
  urgency: UrgencyLevel;
  classification: ClassificationLevel;
  
  // Operation Details
  operationType: OperationType;
  targetProfile: TargetProfile;
  proposedMeasures: ProposedMeasure[];
  estimatedImpact: ImpactAssessment;
  riskAssessment: RiskAssessment;
  
  // Legal & Ethical
  legalReview: LegalReview;
  ethicalReview: EthicalReview;
  complianceChecks: ComplianceCheck[];
  
  // Workflow
  approvalChain: ApprovalStage[];
  currentStage: number;
  status: ApprovalStatus;
  
  // Metadata
  metadata: ApprovalMetadata;
}

export interface ApprovalStage {
  id: string;
  name: string;
  description: string;
  stageType: ApprovalStageType;
  sequence: number;
  
  // Approver Configuration
  requiredRole: UserRole;
  requiredClearance: ClassificationLevel;
  specificApprovers?: string[]; // Optional specific user IDs
  alternateApprovers?: string[]; // Backup approvers
  
  // Stage Rules
  minimumApprovers: number;
  maximumDissent: number;
  timeoutMinutes?: number;
  allowDelegation: boolean;
  requireUniqueApprover: boolean;
  
  // Conditions
  conditions: ApprovalCondition[];
  triggers: ApprovalTrigger[];
  
  // Results
  decisions: ApprovalDecision[];
  startedAt?: Date;
  completedAt?: Date;
  status: StageStatus;
}

export interface ApprovalDecision {
  id: string;
  stageId: string;
  approverId: string;
  decision: DecisionType;
  timestamp: Date;
  
  // Decision Details
  comments: string;
  conditions?: string[];
  recommendations?: string[];
  confidenceLevel: number; // 0-1
  
  // Context
  reviewDuration: number; // minutes
  informationReviewed: string[];
  consultationsHeld: string[];
  
  // Authentication
  authenticationMethod: AuthenticationMethod;
  cryptographicSignature?: string;
  witnessSignature?: string;
  
  // Delegation
  delegatedBy?: string;
  delegationReason?: string;
}

export interface TargetProfile {
  entityTypes: string[];
  geographicalScope: string[];
  demographicProfiles: string[];
  psychographicProfiles: string[];
  estimatedReach: number;
  civilianProximity: number; // 0-1 scale
}

export interface ProposedMeasure {
  id: string;
  category: MeasureCategory;
  description: string;
  methodology: string;
  duration: number; // days
  resources: ResourceRequirement[];
  dependencies: string[];
  reversibility: number; // 0-1 scale
  attribution: number; // 0-1 scale
}

export interface ImpactAssessment {
  primaryEffects: Effect[];
  secondaryEffects: Effect[];
  unintendedConsequences: UnintendedConsequence[];
  cascadeEffects: CascadeEffect[];
  temporalAnalysis: TemporalAnalysis;
  geopoliticalImplications: string[];
}

export interface Effect {
  type: EffectType;
  magnitude: number; // 0-1 scale
  confidence: number; // 0-1 scale
  timeToEffect: number; // days
  duration: number; // days
  measurability: number; // 0-1 scale
  reversibility: number; // 0-1 scale
}

export interface UnintendedConsequence {
  description: string;
  probability: number; // 0-1
  severity: number; // 0-1
  mitigations: string[];
}

export interface CascadeEffect {
  trigger: string;
  effects: Array<{
    domain: string;
    magnitude: number;
    delay: number; // days
  }>;
}

export interface TemporalAnalysis {
  shortTerm: string[]; // 0-30 days
  mediumTerm: string[]; // 30-180 days
  longTerm: string[]; // 180+ days
  permanentEffects: string[];
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  riskCategories: RiskCategory[];
  mitigationStrategies: MitigationStrategy[];
  residualRisk: RiskLevel;
  contingencyPlans: ContingencyPlan[];
  monitoringPlan: MonitoringPlan;
}

export interface RiskCategory {
  name: string;
  type: RiskType;
  probability: number; // 0-1
  impact: number; // 0-1
  detectability: number; // 0-1
  timeframe: number; // days
  mitigations: string[];
}

export interface MitigationStrategy {
  riskId: string;
  strategy: string;
  effectiveness: number; // 0-1
  cost: number;
  timeRequired: number; // days
  responsible: string;
}

export interface ContingencyPlan {
  trigger: string;
  response: string;
  responsible: string;
  activationCriteria: string[];
  resources: string[];
}

export interface MonitoringPlan {
  indicators: KPI[];
  frequency: string;
  responsible: string;
  escalationThresholds: EscalationThreshold[];
  reportingSchedule: string;
}

export interface KPI {
  name: string;
  measurement: string;
  target: number;
  threshold: number;
  frequency: string;
}

export interface EscalationThreshold {
  indicator: string;
  threshold: number;
  action: string;
  responsible: string;
}

export interface LegalReview {
  reviewerId: string;
  reviewDate: Date;
  legalFramework: string[];
  complianceStatus: ComplianceStatus;
  legalRisks: LegalRisk[];
  recommendations: string[];
  approvalRequired: boolean;
}

export interface LegalRisk {
  jurisdiction: string;
  riskType: string;
  severity: RiskLevel;
  probability: number;
  mitigation: string;
}

export interface EthicalReview {
  reviewerId: string;
  reviewDate: Date;
  ethicalFramework: string[];
  principlesApplied: EthicalPrinciple[];
  ethicalConcerns: EthicalConcern[];
  recommendations: string[];
  ethicalScore: number; // 0-1
}

export interface EthicalPrinciple {
  name: string;
  description: string;
  applicable: boolean;
  compliance: number; // 0-1
  notes: string;
}

export interface EthicalConcern {
  concern: string;
  severity: RiskLevel;
  affected: string[];
  mitigation: string;
  resolved: boolean;
}

export interface ComplianceCheck {
  framework: string;
  requirements: ComplianceRequirement[];
  overallStatus: ComplianceStatus;
  gaps: ComplianceGap[];
  remediations: ComplianceRemediation[];
}

export interface ComplianceRequirement {
  id: string;
  description: string;
  mandatory: boolean;
  status: ComplianceStatus;
  evidence: string[];
  notes: string;
}

export interface ComplianceGap {
  requirement: string;
  gap: string;
  severity: RiskLevel;
  remediation: string;
  timeline: string;
}

export interface ComplianceRemediation {
  gap: string;
  action: string;
  responsible: string;
  deadline: Date;
  status: string;
}

export interface ApprovalCondition {
  id: string;
  type: ConditionType;
  description: string;
  parameters: Record<string, any>;
  mandatory: boolean;
  autoEvaluate: boolean;
}

export interface ApprovalTrigger {
  id: string;
  type: TriggerType;
  condition: string;
  action: TriggerAction;
  parameters: Record<string, any>;
}

export interface ApprovalMetadata {
  version: string;
  submissionMethod: string;
  sourceSystem: string;
  correlationId: string;
  tags: string[];
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  type: string;
  size: number;
  hash: string;
  classification: ClassificationLevel;
}

export interface ResourceRequirement {
  type: ResourceType;
  quantity: number;
  duration: number;
  cost: number;
  availability: string;
}

// Enums

export enum UrgencyLevel {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum OperationType {
  INFORMATION_OPERATION = 'information_operation',
  PSYCHOLOGICAL_OPERATION = 'psychological_operation',
  INFLUENCE_CAMPAIGN = 'influence_campaign',
  COUNTER_NARRATIVE = 'counter_narrative',
  DISRUPTION_OPERATION = 'disruption_operation',
  DEFENSIVE_OPERATION = 'defensive_operation'
}

export enum ApprovalStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  CONDITIONALLY_APPROVED = 'conditionally_approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired'
}

export enum ApprovalStageType {
  AUTOMATIC = 'automatic',
  HUMAN_REVIEW = 'human_review',
  TECHNICAL_REVIEW = 'technical_review',
  LEGAL_REVIEW = 'legal_review',
  ETHICAL_REVIEW = 'ethical_review',
  RISK_ASSESSMENT = 'risk_assessment',
  SENIOR_APPROVAL = 'senior_approval',
  FINAL_AUTHORIZATION = 'final_authorization'
}

export enum StageStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  FAILED = 'failed'
}

export enum DecisionType {
  APPROVE = 'approve',
  REJECT = 'reject',
  CONDITIONAL_APPROVAL = 'conditional_approval',
  ABSTAIN = 'abstain',
  DEFER = 'defer',
  REQUEST_MORE_INFO = 'request_more_info'
}

export enum AuthenticationMethod {
  PASSWORD = 'password',
  CERTIFICATE = 'certificate',
  BIOMETRIC = 'biometric',
  MULTI_FACTOR = 'multi_factor',
  SMART_CARD = 'smart_card'
}

export enum MeasureCategory {
  INFORMATION_WARFARE = 'information_warfare',
  PSYCHOLOGICAL_WARFARE = 'psychological_warfare',
  CYBER_OPERATIONS = 'cyber_operations',
  SOCIAL_ENGINEERING = 'social_engineering',
  ECONOMIC_PRESSURE = 'economic_pressure',
  DIPLOMATIC_INFLUENCE = 'diplomatic_influence'
}

export enum EffectType {
  PERCEPTION_CHANGE = 'perception_change',
  BEHAVIOR_CHANGE = 'behavior_change',
  DECISION_INFLUENCE = 'decision_influence',
  CAPABILITY_DEGRADATION = 'capability_degradation',
  RELATIONSHIP_DISRUPTION = 'relationship_disruption',
  INFORMATION_CONTROL = 'information_control'
}

export enum RiskLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RiskType {
  OPERATIONAL = 'operational',
  STRATEGIC = 'strategic',
  LEGAL = 'legal',
  ETHICAL = 'ethical',
  REPUTATIONAL = 'reputational',
  TECHNICAL = 'technical',
  POLITICAL = 'political'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  UNDER_REVIEW = 'under_review',
  EXEMPTION_GRANTED = 'exemption_granted'
}

export enum ConditionType {
  RISK_THRESHOLD = 'risk_threshold',
  CLASSIFICATION_LEVEL = 'classification_level',
  TARGET_TYPE = 'target_type',
  RESOURCE_LIMIT = 'resource_limit',
  TIME_CONSTRAINT = 'time_constraint',
  LEGAL_REQUIREMENT = 'legal_requirement',
  ETHICAL_REQUIREMENT = 'ethical_requirement'
}

export enum TriggerType {
  TIME_BASED = 'time_based',
  EVENT_BASED = 'event_based',
  CONDITION_BASED = 'condition_based',
  APPROVAL_BASED = 'approval_based',
  EXTERNAL_SIGNAL = 'external_signal'
}

export enum TriggerAction {
  ADVANCE_STAGE = 'advance_stage',
  ESCALATE = 'escalate',
  NOTIFY = 'notify',
  REJECT = 'reject',
  REQUEST_INFO = 'request_info',
  DELEGATE = 'delegate'
}

export enum ResourceType {
  PERSONNEL = 'personnel',
  BUDGET = 'budget',
  TECHNOLOGY = 'technology',
  INFRASTRUCTURE = 'infrastructure',
  INTELLIGENCE = 'intelligence',
  LEGAL_SUPPORT = 'legal_support'
}

/**
 * Comprehensive Approval Engine
 */
export class ApprovalEngine {
  private config: ApprovalConfig;
  private auditEngine: AuditEngine;
  private approvalStore: Map<string, ApprovalRequest> = new Map();
  private workflowTemplates: Map<string, ApprovalStage[]> = new Map();
  
  constructor(config: ApprovalConfig, auditEngine: AuditEngine) {
    this.config = config;
    this.auditEngine = auditEngine;
    
    // Initialize default workflow templates
    this.initializeWorkflowTemplates();
  }
  
  /**
   * Submit a new approval request
   */
  async submitApprovalRequest(
    operationId: string,
    requesterId: string,
    requestDetails: Partial<ApprovalRequest>
  ): Promise<string> {
    const requestId = this.generateRequestId();
    
    // Create approval request
    const request: ApprovalRequest = {
      id: requestId,
      operationId,
      requesterId,
      submittedAt: new Date(),
      expiresAt: this.config.enableTimeBasedExpiry ? 
        new Date(Date.now() + this.config.maxApprovalTimeout * 60 * 1000) : undefined,
      
      title: requestDetails.title || '',
      description: requestDetails.description || '',
      justification: requestDetails.justification || '',
      urgency: requestDetails.urgency || UrgencyLevel.NORMAL,
      classification: requestDetails.classification || ClassificationLevel.CONFIDENTIAL,
      
      operationType: requestDetails.operationType || OperationType.INFORMATION_OPERATION,
      targetProfile: requestDetails.targetProfile || this.createDefaultTargetProfile(),
      proposedMeasures: requestDetails.proposedMeasures || [],
      estimatedImpact: requestDetails.estimatedImpact || this.createDefaultImpactAssessment(),
      riskAssessment: requestDetails.riskAssessment || this.createDefaultRiskAssessment(),
      
      legalReview: requestDetails.legalReview || this.createDefaultLegalReview(),
      ethicalReview: requestDetails.ethicalReview || this.createDefaultEthicalReview(),
      complianceChecks: requestDetails.complianceChecks || [],
      
      approvalChain: this.generateApprovalChain(requestDetails),
      currentStage: 0,
      status: ApprovalStatus.SUBMITTED,
      
      metadata: {
        version: '1.0',
        submissionMethod: 'api',
        sourceSystem: 'active-measures',
        correlationId: this.generateCorrelationId(),
        tags: requestDetails.metadata?.tags || [],
        attachments: requestDetails.metadata?.attachments || []
      }
    };
    
    // Validate request
    this.validateApprovalRequest(request);
    
    // Store request
    this.approvalStore.set(requestId, request);
    
    // Log submission
    await this.auditEngine.logEntry(
      this.createAuditActor(requesterId),
      AuditAction.OPERATION_CREATED,
      {
        id: requestId,
        type: 'approval_request' as any,
        classification: request.classification,
        owner: requesterId
      },
      {
        operationId,
        businessJustification: request.justification,
        urgencyLevel: request.urgency as any,
        riskLevel: request.riskAssessment.overallRisk as any,
        complianceFramework: ['NIST', 'SOX'],
        tags: ['approval', 'submission']
      },
      {
        result: 'success' as any,
        duration: 0,
        dataModified: true,
        recordsAffected: 1,
        complianceStatus: 'compliant' as any
      }
    );
    
    // Start approval workflow
    await this.startApprovalWorkflow(requestId);
    
    return requestId;
  }
  
  /**
   * Process an approval decision
   */
  async processDecision(
    requestId: string,
    approverId: string,
    decision: DecisionType,
    comments: string,
    conditions?: string[],
    authMethod: AuthenticationMethod = AuthenticationMethod.PASSWORD
  ): Promise<{
    success: boolean;
    nextStage?: string;
    finalDecision?: ApprovalStatus;
    message: string;
  }> {
    const request = this.approvalStore.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }
    
    if (request.status !== ApprovalStatus.UNDER_REVIEW) {
      throw new Error(`Cannot process decision for request in status: ${request.status}`);
    }
    
    const currentStage = request.approvalChain[request.currentStage];
    if (!currentStage) {
      throw new Error('No current stage found');
    }
    
    // Validate approver authorization
    await this.validateApproverAuthorization(approverId, currentStage);
    
    // Create decision record
    const decisionRecord: ApprovalDecision = {
      id: this.generateDecisionId(),
      stageId: currentStage.id,
      approverId,
      decision,
      timestamp: new Date(),
      comments,
      conditions: conditions || [],
      recommendations: [],
      confidenceLevel: 0.9,
      reviewDuration: this.calculateReviewDuration(currentStage.startedAt!),
      informationReviewed: [],
      consultationsHeld: [],
      authenticationMethod: authMethod,
      cryptographicSignature: await this.generateCryptographicSignature(decision, approverId),
    };
    
    // Add decision to current stage
    currentStage.decisions.push(decisionRecord);
    
    // Evaluate stage completion
    const stageResult = await this.evaluateStageCompletion(currentStage);
    
    // Log decision
    await this.auditEngine.logEntry(
      this.createAuditActor(approverId),
      decision === DecisionType.APPROVE ? AuditAction.OPERATION_APPROVED : AuditAction.OPERATION_REJECTED,
      {
        id: requestId,
        type: 'approval_request' as any,
        classification: request.classification,
        owner: request.requesterId
      },
      {
        operationId: request.operationId,
        businessJustification: comments,
        urgencyLevel: request.urgency as any,
        riskLevel: request.riskAssessment.overallRisk as any,
        complianceFramework: ['NIST', 'SOX'],
        tags: ['approval', 'decision', currentStage.name]
      },
      {
        result: 'success' as any,
        duration: decisionRecord.reviewDuration,
        dataModified: true,
        recordsAffected: 1,
        complianceStatus: 'compliant' as any
      }
    );
    
    if (stageResult.completed) {
      if (stageResult.approved) {
        // Move to next stage or complete approval
        const nextStageResult = await this.advanceToNextStage(request);
        return {
          success: true,
          nextStage: nextStageResult.nextStageName,
          finalDecision: nextStageResult.finalDecision,
          message: nextStageResult.message
        };
      } else {
        // Stage rejected - reject entire request
        request.status = ApprovalStatus.REJECTED;
        currentStage.status = StageStatus.FAILED;
        currentStage.completedAt = new Date();
        
        return {
          success: true,
          finalDecision: ApprovalStatus.REJECTED,
          message: 'Approval request rejected'
        };
      }
    }
    
    return {
      success: true,
      message: `Decision recorded. Stage requires ${currentStage.minimumApprovers - currentStage.decisions.length} more approvals.`
    };
  }
  
  /**
   * Get approval request details
   */
  getApprovalRequest(requestId: string): ApprovalRequest | undefined {
    return this.approvalStore.get(requestId);
  }
  
  /**
   * Get pending approvals for an approver
   */
  getPendingApprovals(approverId: string, role?: UserRole, clearance?: ClassificationLevel): ApprovalRequest[] {
    return Array.from(this.approvalStore.values()).filter(request => {
      if (request.status !== ApprovalStatus.UNDER_REVIEW) {
        return false;
      }
      
      const currentStage = request.approvalChain[request.currentStage];
      if (!currentStage || currentStage.status !== StageStatus.IN_PROGRESS) {
        return false;
      }
      
      // Check if approver is eligible for this stage
      return this.isApproverEligible(approverId, currentStage, role, clearance);
    });
  }
  
  /**
   * Get approval history for an operation
   */
  getApprovalHistory(operationId: string): ApprovalRequest[] {
    return Array.from(this.approvalStore.values()).filter(
      request => request.operationId === operationId
    );
  }
  
  /**
   * Withdraw an approval request
   */
  async withdrawApprovalRequest(requestId: string, requesterId: string, reason: string): Promise<void> {
    const request = this.approvalStore.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }
    
    if (request.requesterId !== requesterId) {
      throw new Error('Only the requester can withdraw the approval request');
    }
    
    if (request.status === ApprovalStatus.APPROVED || request.status === ApprovalStatus.REJECTED) {
      throw new Error('Cannot withdraw completed approval request');
    }
    
    request.status = ApprovalStatus.WITHDRAWN;
    
    // Log withdrawal
    await this.auditEngine.logEntry(
      this.createAuditActor(requesterId),
      AuditAction.DELETE,
      {
        id: requestId,
        type: 'approval_request' as any,
        classification: request.classification,
        owner: requesterId
      },
      {
        operationId: request.operationId,
        businessJustification: reason,
        urgencyLevel: request.urgency as any,
        riskLevel: request.riskAssessment.overallRisk as any,
        complianceFramework: ['NIST', 'SOX'],
        tags: ['approval', 'withdrawal']
      },
      {
        result: 'success' as any,
        duration: 0,
        dataModified: true,
        recordsAffected: 1,
        complianceStatus: 'compliant' as any
      }
    );
  }
  
  /**
   * Delegate approval to another approver
   */
  async delegateApproval(
    requestId: string,
    fromApproverId: string,
    toApproverId: string,
    reason: string
  ): Promise<void> {
    if (!this.config.enableDelegation) {
      throw new Error('Delegation is not enabled');
    }
    
    const request = this.approvalStore.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }
    
    const currentStage = request.approvalChain[request.currentStage];
    if (!currentStage.allowDelegation) {
      throw new Error('Delegation not allowed for this stage');
    }
    
    // Validate both approvers
    await this.validateApproverAuthorization(fromApproverId, currentStage);
    await this.validateApproverAuthorization(toApproverId, currentStage);
    
    // Add delegate to stage
    if (!currentStage.alternateApprovers) {
      currentStage.alternateApprovers = [];
    }
    currentStage.alternateApprovers.push(toApproverId);
    
    // Log delegation
    await this.auditEngine.logEntry(
      this.createAuditActor(fromApproverId),
      AuditAction.ROLE_ASSUMED,
      {
        id: requestId,
        type: 'approval_request' as any,
        classification: request.classification,
        owner: request.requesterId
      },
      {
        operationId: request.operationId,
        businessJustification: reason,
        urgencyLevel: request.urgency as any,
        riskLevel: request.riskAssessment.overallRisk as any,
        complianceFramework: ['NIST', 'SOX'],
        tags: ['approval', 'delegation']
      },
      {
        result: 'success' as any,
        duration: 0,
        dataModified: true,
        recordsAffected: 1,
        complianceStatus: 'compliant' as any
      }
    );
  }
  
  /**
   * Generate approval statistics
   */
  getApprovalStatistics(timeRange?: { start: Date; end: Date }): {
    totalRequests: number;
    approved: number;
    rejected: number;
    pending: number;
    averageApprovalTime: number;
    approvalRate: number;
    stageStatistics: Array<{
      stage: string;
      averageTime: number;
      rejectionRate: number;
    }>;
  } {
    let requests = Array.from(this.approvalStore.values());
    
    if (timeRange) {
      requests = requests.filter(r => 
        r.submittedAt >= timeRange.start && r.submittedAt <= timeRange.end
      );
    }
    
    const totalRequests = requests.length;
    const approved = requests.filter(r => r.status === ApprovalStatus.APPROVED).length;
    const rejected = requests.filter(r => r.status === ApprovalStatus.REJECTED).length;
    const pending = requests.filter(r => r.status === ApprovalStatus.UNDER_REVIEW).length;
    
    // Calculate average approval time
    const completedRequests = requests.filter(r => 
      r.status === ApprovalStatus.APPROVED || r.status === ApprovalStatus.REJECTED
    );
    
    const totalApprovalTime = completedRequests.reduce((sum, request) => {
      const completedStage = request.approvalChain.find(s => s.completedAt);
      if (completedStage) {
        return sum + (completedStage.completedAt!.getTime() - request.submittedAt.getTime());
      }
      return sum;
    }, 0);
    
    const averageApprovalTime = completedRequests.length > 0 ? 
      totalApprovalTime / completedRequests.length / (1000 * 60) : 0; // minutes
    
    const approvalRate = totalRequests > 0 ? approved / totalRequests : 0;
    
    // Stage statistics
    const stageStatistics = this.calculateStageStatistics(requests);
    
    return {
      totalRequests,
      approved,
      rejected,
      pending,
      averageApprovalTime,
      approvalRate,
      stageStatistics
    };
  }
  
  // Private helper methods
  
  private initializeWorkflowTemplates(): void {
    // Standard workflow template
    const standardWorkflow: ApprovalStage[] = [
      {
        id: 'technical_review',
        name: 'Technical Review',
        description: 'Technical feasibility and implementation review',
        stageType: ApprovalStageType.TECHNICAL_REVIEW,
        sequence: 1,
        requiredRole: UserRole.ANALYST,
        requiredClearance: ClassificationLevel.SECRET,
        minimumApprovers: 1,
        maximumDissent: 0,
        timeoutMinutes: 480, // 8 hours
        allowDelegation: true,
        requireUniqueApprover: true,
        conditions: [],
        triggers: [],
        decisions: [],
        status: StageStatus.PENDING
      },
      {
        id: 'risk_assessment',
        name: 'Risk Assessment',
        description: 'Comprehensive risk evaluation',
        stageType: ApprovalStageType.RISK_ASSESSMENT,
        sequence: 2,
        requiredRole: UserRole.SUPERVISOR,
        requiredClearance: ClassificationLevel.SECRET,
        minimumApprovers: 1,
        maximumDissent: 0,
        timeoutMinutes: 720, // 12 hours
        allowDelegation: true,
        requireUniqueApprover: true,
        conditions: [],
        triggers: [],
        decisions: [],
        status: StageStatus.PENDING
      },
      {
        id: 'legal_review',
        name: 'Legal Review',
        description: 'Legal compliance and risk assessment',
        stageType: ApprovalStageType.LEGAL_REVIEW,
        sequence: 3,
        requiredRole: UserRole.ADMINISTRATOR,
        requiredClearance: ClassificationLevel.TOP_SECRET,
        minimumApprovers: 1,
        maximumDissent: 0,
        timeoutMinutes: 1440, // 24 hours
        allowDelegation: false,
        requireUniqueApprover: true,
        conditions: [],
        triggers: [],
        decisions: [],
        status: StageStatus.PENDING
      },
      {
        id: 'final_authorization',
        name: 'Final Authorization',
        description: 'Senior leadership final approval',
        stageType: ApprovalStageType.FINAL_AUTHORIZATION,
        sequence: 4,
        requiredRole: UserRole.APPROVER,
        requiredClearance: ClassificationLevel.TOP_SECRET,
        minimumApprovers: 1,
        maximumDissent: 0,
        timeoutMinutes: 2880, // 48 hours
        allowDelegation: false,
        requireUniqueApprover: true,
        conditions: [],
        triggers: [],
        decisions: [],
        status: StageStatus.PENDING
      }
    ];
    
    this.workflowTemplates.set('standard', standardWorkflow);
  }
  
  private generateRequestId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateDecisionId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateCorrelationId(): string {
    return `corr_${Math.random().toString(36).substr(2, 16)}`;
  }
  
  private validateApprovalRequest(request: ApprovalRequest): void {
    if (!request.title || !request.description || !request.justification) {
      throw new Error('Missing required fields: title, description, or justification');
    }
    
    if (request.proposedMeasures.length === 0) {
      throw new Error('At least one proposed measure is required');
    }
    
    if (request.approvalChain.length === 0) {
      throw new Error('Approval chain cannot be empty');
    }
  }
  
  private generateApprovalChain(requestDetails: Partial<ApprovalRequest>): ApprovalStage[] {
    // Use standard workflow template by default
    const template = this.workflowTemplates.get('standard')!;
    
    // Clone template and customize based on request details
    return template.map(stage => ({
      ...stage,
      id: `${stage.id}_${Date.now()}`,
      conditions: this.generateStageConditions(stage, requestDetails),
      triggers: this.generateStageTriggers(stage, requestDetails)
    }));
  }
  
  private generateStageConditions(stage: ApprovalStage, requestDetails: Partial<ApprovalRequest>): ApprovalCondition[] {
    const conditions: ApprovalCondition[] = [];
    
    // Add classification-based conditions
    if (requestDetails.classification === ClassificationLevel.TOP_SECRET) {
      conditions.push({
        id: 'ts_clearance_required',
        type: ConditionType.CLASSIFICATION_LEVEL,
        description: 'TOP SECRET clearance required',
        parameters: { requiredClearance: ClassificationLevel.TOP_SECRET },
        mandatory: true,
        autoEvaluate: true
      });
    }
    
    // Add risk-based conditions
    if (requestDetails.riskAssessment?.overallRisk === RiskLevel.HIGH ||
        requestDetails.riskAssessment?.overallRisk === RiskLevel.CRITICAL) {
      conditions.push({
        id: 'high_risk_review',
        type: ConditionType.RISK_THRESHOLD,
        description: 'Additional review required for high-risk operations',
        parameters: { maxRiskLevel: RiskLevel.MODERATE },
        mandatory: true,
        autoEvaluate: false
      });
    }
    
    return conditions;
  }
  
  private generateStageTriggers(stage: ApprovalStage, requestDetails: Partial<ApprovalRequest>): ApprovalTrigger[] {
    const triggers: ApprovalTrigger[] = [];
    
    // Add timeout trigger
    if (stage.timeoutMinutes) {
      triggers.push({
        id: 'timeout_escalation',
        type: TriggerType.TIME_BASED,
        condition: `timeout_minutes > ${stage.timeoutMinutes}`,
        action: TriggerAction.ESCALATE,
        parameters: { timeoutMinutes: stage.timeoutMinutes }
      });
    }
    
    // Add urgency-based triggers
    if (requestDetails.urgency === UrgencyLevel.CRITICAL || requestDetails.urgency === UrgencyLevel.EMERGENCY) {
      triggers.push({
        id: 'urgency_notification',
        type: TriggerType.EVENT_BASED,
        condition: 'stage_started',
        action: TriggerAction.NOTIFY,
        parameters: { notificationLevel: 'immediate' }
      });
    }
    
    return triggers;
  }
  
  private createDefaultTargetProfile(): TargetProfile {
    return {
      entityTypes: ['organization'],
      geographicalScope: ['unknown'],
      demographicProfiles: ['general_population'],
      psychographicProfiles: ['general'],
      estimatedReach: 1000,
      civilianProximity: 0.1
    };
  }
  
  private createDefaultImpactAssessment(): ImpactAssessment {
    return {
      primaryEffects: [],
      secondaryEffects: [],
      unintendedConsequences: [],
      cascadeEffects: [],
      temporalAnalysis: {
        shortTerm: [],
        mediumTerm: [],
        longTerm: [],
        permanentEffects: []
      },
      geopoliticalImplications: []
    };
  }
  
  private createDefaultRiskAssessment(): RiskAssessment {
    return {
      overallRisk: RiskLevel.MODERATE,
      riskCategories: [],
      mitigationStrategies: [],
      residualRisk: RiskLevel.LOW,
      contingencyPlans: [],
      monitoringPlan: {
        indicators: [],
        frequency: 'daily',
        responsible: 'system',
        escalationThresholds: [],
        reportingSchedule: 'weekly'
      }
    };
  }
  
  private createDefaultLegalReview(): LegalReview {
    return {
      reviewerId: 'system',
      reviewDate: new Date(),
      legalFramework: [],
      complianceStatus: ComplianceStatus.UNDER_REVIEW,
      legalRisks: [],
      recommendations: [],
      approvalRequired: true
    };
  }
  
  private createDefaultEthicalReview(): EthicalReview {
    return {
      reviewerId: 'system',
      reviewDate: new Date(),
      ethicalFramework: [],
      principlesApplied: [],
      ethicalConcerns: [],
      recommendations: [],
      ethicalScore: 0.5
    };
  }
  
  private async startApprovalWorkflow(requestId: string): Promise<void> {
    const request = this.approvalStore.get(requestId)!;
    
    // Start first stage
    if (request.approvalChain.length > 0) {
      request.status = ApprovalStatus.UNDER_REVIEW;
      request.approvalChain[0].status = StageStatus.IN_PROGRESS;
      request.approvalChain[0].startedAt = new Date();
    }
  }
  
  private async validateApproverAuthorization(approverId: string, stage: ApprovalStage): Promise<void> {
    // In a real implementation, this would check against user database
    // For now, we'll do basic validation
    
    if (stage.specificApprovers && !stage.specificApprovers.includes(approverId)) {
      throw new Error('Approver not authorized for this stage');
    }
    
    // Check for unique approver requirement
    if (stage.requireUniqueApprover) {
      const existingDecision = stage.decisions.find(d => d.approverId === approverId);
      if (existingDecision) {
        throw new Error('Approver has already made a decision for this stage');
      }
    }
  }
  
  private calculateReviewDuration(startTime: Date): number {
    return (Date.now() - startTime.getTime()) / (1000 * 60); // minutes
  }
  
  private async generateCryptographicSignature(decision: DecisionType, approverId: string): Promise<string> {
    const data = `${decision}:${approverId}:${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }
  
  private async evaluateStageCompletion(stage: ApprovalStage): Promise<{
    completed: boolean;
    approved: boolean;
    reason: string;
  }> {
    const approvals = stage.decisions.filter(d => d.decision === DecisionType.APPROVE).length;
    const rejections = stage.decisions.filter(d => d.decision === DecisionType.REJECT).length;
    
    // Check if minimum approvals met
    if (approvals >= stage.minimumApprovers) {
      stage.status = StageStatus.COMPLETED;
      stage.completedAt = new Date();
      return {
        completed: true,
        approved: true,
        reason: 'Minimum approvals reached'
      };
    }
    
    // Check if maximum dissent exceeded
    if (rejections > stage.maximumDissent) {
      stage.status = StageStatus.FAILED;
      stage.completedAt = new Date();
      return {
        completed: true,
        approved: false,
        reason: 'Maximum dissent exceeded'
      };
    }
    
    return {
      completed: false,
      approved: false,
      reason: 'Waiting for more decisions'
    };
  }
  
  private async advanceToNextStage(request: ApprovalRequest): Promise<{
    nextStageName?: string;
    finalDecision?: ApprovalStatus;
    message: string;
  }> {
    request.currentStage++;
    
    if (request.currentStage >= request.approvalChain.length) {
      // All stages completed - approve request
      request.status = ApprovalStatus.APPROVED;
      return {
        finalDecision: ApprovalStatus.APPROVED,
        message: 'Approval request fully approved'
      };
    }
    
    // Start next stage
    const nextStage = request.approvalChain[request.currentStage];
    nextStage.status = StageStatus.IN_PROGRESS;
    nextStage.startedAt = new Date();
    
    return {
      nextStageName: nextStage.name,
      message: `Advanced to stage: ${nextStage.name}`
    };
  }
  
  private isApproverEligible(
    approverId: string,
    stage: ApprovalStage,
    role?: UserRole,
    clearance?: ClassificationLevel
  ): boolean {
    // Check specific approvers
    if (stage.specificApprovers && !stage.specificApprovers.includes(approverId)) {
      return false;
    }
    
    // Check alternate approvers
    if (stage.alternateApprovers && !stage.alternateApprovers.includes(approverId)) {
      return false;
    }
    
    // Check role requirement
    if (role && stage.requiredRole && role !== stage.requiredRole) {
      return false;
    }
    
    // Check clearance requirement
    if (clearance && stage.requiredClearance) {
      const clearanceLevels = [
        ClassificationLevel.UNCLASSIFIED,
        ClassificationLevel.CONFIDENTIAL,
        ClassificationLevel.SECRET,
        ClassificationLevel.TOP_SECRET,
        ClassificationLevel.SCI,
        ClassificationLevel.SAP
      ];
      
      const requiredIndex = clearanceLevels.indexOf(stage.requiredClearance);
      const userIndex = clearanceLevels.indexOf(clearance);
      
      if (userIndex < requiredIndex) {
        return false;
      }
    }
    
    return true;
  }
  
  private calculateStageStatistics(requests: ApprovalRequest[]): Array<{
    stage: string;
    averageTime: number;
    rejectionRate: number;
  }> {
    const stageStats = new Map<string, { totalTime: number; count: number; rejections: number }>();
    
    requests.forEach(request => {
      request.approvalChain.forEach(stage => {
        if (stage.status === StageStatus.COMPLETED || stage.status === StageStatus.FAILED) {
          const key = stage.name;
          const existing = stageStats.get(key) || { totalTime: 0, count: 0, rejections: 0 };
          
          if (stage.startedAt && stage.completedAt) {
            existing.totalTime += stage.completedAt.getTime() - stage.startedAt.getTime();
            existing.count++;
            
            if (stage.status === StageStatus.FAILED) {
              existing.rejections++;
            }
          }
          
          stageStats.set(key, existing);
        }
      });
    });
    
    return Array.from(stageStats.entries()).map(([stage, stats]) => ({
      stage,
      averageTime: stats.count > 0 ? (stats.totalTime / stats.count) / (1000 * 60) : 0, // minutes
      rejectionRate: stats.count > 0 ? stats.rejections / stats.count : 0
    }));
  }
  
  private createAuditActor(userId: string): AuditActor {
    return {
      id: userId,
      type: 'human_operator' as any,
      name: userId,
      role: UserRole.OPERATOR,
      clearanceLevel: ClassificationLevel.SECRET,
      authentication: {
        method: 'password' as any,
        strength: 0.8,
        mfaUsed: false,
        certificateUsed: false,
        biometricUsed: false
      }
    };
  }
}