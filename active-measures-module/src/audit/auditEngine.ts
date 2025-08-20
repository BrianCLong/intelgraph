/**
 * Comprehensive Audit Engine for Active Measures
 * 
 * Implements immutable audit logging with cryptographic integrity,
 * blockchain-like hash chains, and comprehensive tracking of all
 * operations, decisions, and data access.
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface AuditConfig {
  enableImmutableLogging: boolean;
  enableHashChains: boolean;
  enableDigitalSigning: boolean;
  retentionPeriod: number; // days
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  replicationEnabled: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: AuditActor;
  action: AuditAction;
  resource: AuditResource;
  context: AuditContext;
  outcome: AuditOutcome;
  metadata: AuditMetadata;
  integrity: IntegrityData;
}

export interface AuditActor {
  id: string;
  type: ActorType;
  name: string;
  role: UserRole;
  clearanceLevel: ClassificationLevel;
  organization?: string;
  session?: SessionInfo;
  authentication: AuthenticationData;
}

export interface SessionInfo {
  sessionId: string;
  startTime: Date;
  ipAddress: string;
  userAgent: string;
  geolocation?: GeolocationData;
  deviceFingerprint: string;
}

export interface AuthenticationData {
  method: AuthMethod;
  strength: number; // 0-1 scale
  mfaUsed: boolean;
  certificateUsed: boolean;
  biometricUsed: boolean;
}

export interface AuditResource {
  id: string;
  type: ResourceType;
  classification: ClassificationLevel;
  owner?: string;
  location?: string;
  size?: number;
  checksum?: string;
}

export interface AuditContext {
  operationId?: string;
  parentEntryId?: string;
  businessJustification: string;
  urgencyLevel: UrgencyLevel;
  riskLevel: RiskLevel;
  complianceFramework: string[];
  tags: string[];
}

export interface AuditOutcome {
  result: OutcomeResult;
  errorCode?: string;
  errorMessage?: string;
  duration: number; // milliseconds
  dataModified: boolean;
  recordsAffected: number;
  complianceStatus: ComplianceStatus;
}

export interface AuditMetadata {
  version: string;
  schema: string;
  correlationId: string;
  traceId: string;
  batchId?: string;
  priority: Priority;
  confidentiality: ConfidentialityLevel;
}

export interface IntegrityData {
  hash: string;
  previousHash: string;
  digitalSignature?: string;
  merkleRoot?: string;
  blockHeight?: number;
  witnessSignatures?: string[];
}

export interface GeolocationData {
  country: string;
  region: string;
  city: string;
  coordinates: [number, number]; // [lat, lng]
  accuracy: number;
  source: string;
}

export enum ActorType {
  HUMAN_OPERATOR = 'human_operator',
  AI_SYSTEM = 'ai_system',
  AUTOMATED_PROCESS = 'automated_process',
  EXTERNAL_SYSTEM = 'external_system',
  SERVICE_ACCOUNT = 'service_account',
  ADMIN_PROCESS = 'admin_process'
}

export enum UserRole {
  ANALYST = 'analyst',
  OPERATOR = 'operator',
  SUPERVISOR = 'supervisor',
  APPROVER = 'approver',
  ADMINISTRATOR = 'administrator',
  AUDITOR = 'auditor',
  SYSTEM_ADMIN = 'system_admin'
}

export enum ClassificationLevel {
  UNCLASSIFIED = 'unclassified',
  CONFIDENTIAL = 'confidential',
  SECRET = 'secret',
  TOP_SECRET = 'top_secret',
  SCI = 'sci',
  SAP = 'sap' // Special Access Program
}

export enum AuthMethod {
  PASSWORD = 'password',
  CERTIFICATE = 'certificate',
  BIOMETRIC = 'biometric',
  MULTI_FACTOR = 'multi_factor',
  SMART_CARD = 'smart_card',
  OAUTH = 'oauth',
  SAML = 'saml'
}

export enum AuditAction {
  // Data Operations
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
  
  // Authentication & Authorization
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  ROLE_ASSUMED = 'role_assumed',
  
  // Operations Management
  OPERATION_CREATED = 'operation_created',
  OPERATION_UPDATED = 'operation_updated',
  OPERATION_APPROVED = 'operation_approved',
  OPERATION_REJECTED = 'operation_rejected',
  OPERATION_EXECUTED = 'operation_executed',
  OPERATION_PAUSED = 'operation_paused',
  OPERATION_ABORTED = 'operation_aborted',
  
  // Simulation & Analysis
  SIMULATION_STARTED = 'simulation_started',
  SIMULATION_COMPLETED = 'simulation_completed',
  MODEL_TRAINED = 'model_trained',
  ANALYSIS_PERFORMED = 'analysis_performed',
  
  // Security Events
  SECURITY_VIOLATION = 'security_violation',
  ANOMALY_DETECTED = 'anomaly_detected',
  INTRUSION_ATTEMPT = 'intrusion_attempt',
  DATA_BREACH_SUSPECTED = 'data_breach_suspected',
  
  // Administrative
  CONFIG_CHANGED = 'config_changed',
  USER_CREATED = 'user_created',
  USER_MODIFIED = 'user_modified',
  BACKUP_PERFORMED = 'backup_performed',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

export enum ResourceType {
  OPERATION = 'operation',
  MEASURE = 'measure',
  SIMULATION = 'simulation',
  USER_ACCOUNT = 'user_account',
  CONFIGURATION = 'configuration',
  DATA_FILE = 'data_file',
  REPORT = 'report',
  LOG_FILE = 'log_file',
  CERTIFICATE = 'certificate',
  CRYPTOGRAPHIC_KEY = 'cryptographic_key'
}

export enum UrgencyLevel {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum RiskLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum OutcomeResult {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILURE = 'failure',
  ERROR = 'error',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  UNDER_REVIEW = 'under_review',
  EXEMPTION_GRANTED = 'exemption_granted'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ConfidentialityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

export interface AuditQuery {
  actorId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  timeRange?: {
    start: Date;
    end: Date;
  };
  classification?: ClassificationLevel;
  operationId?: string;
  riskLevel?: RiskLevel;
  complianceStatus?: ComplianceStatus;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditQueryResult {
  entries: AuditEntry[];
  totalCount: number;
  hasMore: boolean;
  aggregations?: AuditAggregations;
}

export interface AuditAggregations {
  actionCounts: Record<AuditAction, number>;
  actorCounts: Record<string, number>;
  timeDistribution: Array<{
    time: Date;
    count: number;
  }>;
  riskDistribution: Record<RiskLevel, number>;
  complianceDistribution: Record<ComplianceStatus, number>;
}

export interface AuditReport {
  id: string;
  title: string;
  description: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  filters: AuditQuery;
  summary: AuditSummary;
  violations: SecurityViolation[];
  recommendations: AuditRecommendation[];
  generatedAt: Date;
  generatedBy: string;
}

export interface AuditSummary {
  totalEntries: number;
  uniqueActors: number;
  uniqueOperations: number;
  successRate: number;
  errorRate: number;
  securityViolations: number;
  complianceViolations: number;
  averageResponseTime: number;
}

export interface SecurityViolation {
  id: string;
  type: ViolationType;
  severity: Severity;
  description: string;
  actor: string;
  timestamp: Date;
  relatedEntries: string[];
  status: ViolationStatus;
  remediation?: string;
}

export interface AuditRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: Priority;
  title: string;
  description: string;
  impact: string;
  effort: EffortLevel;
  timeline: string;
}

export enum ViolationType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_EXFILTRATION = 'data_exfiltration',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  POLICY_VIOLATION = 'policy_violation',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  COMPLIANCE_BREACH = 'compliance_breach'
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ViolationStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive'
}

export enum RecommendationCategory {
  SECURITY_IMPROVEMENT = 'security_improvement',
  COMPLIANCE_ENHANCEMENT = 'compliance_enhancement',
  OPERATIONAL_EFFICIENCY = 'operational_efficiency',
  RISK_MITIGATION = 'risk_mitigation'
}

export enum EffortLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

/**
 * Comprehensive Audit Engine
 */
export class AuditEngine {
  private config: AuditConfig;
  private auditStore: AuditEntry[] = [];
  private hashChain: string[] = [];
  private currentBlockHeight: number = 0;
  private signingKey: string;
  
  constructor(config: AuditConfig, signingKey?: string) {
    this.config = config;
    this.signingKey = signingKey || process.env.AUDIT_SIGNING_KEY || 'default-key';
    
    // Initialize genesis hash
    if (config.enableHashChains && this.hashChain.length === 0) {
      this.hashChain.push(this.generateGenesisHash());
    }
  }
  
  /**
   * Log an audit entry with full integrity checking
   */
  async logEntry(
    actor: AuditActor,
    action: AuditAction,
    resource: AuditResource,
    context: AuditContext,
    outcome: AuditOutcome,
    metadata?: Partial<AuditMetadata>
  ): Promise<string> {
    const entry: AuditEntry = {
      id: this.generateEntryId(),
      timestamp: new Date(),
      actor,
      action,
      resource,
      context,
      outcome,
      metadata: {
        version: '1.0',
        schema: 'active-measures-audit-v1',
        correlationId: this.generateCorrelationId(),
        traceId: this.generateTraceId(),
        priority: Priority.MEDIUM,
        confidentiality: this.determineConfidentiality(resource.classification),
        ...metadata
      },
      integrity: await this.generateIntegrityData(entry)
    };
    
    // Validate entry before storing
    this.validateEntry(entry);
    
    // Add to hash chain if enabled
    if (this.config.enableHashChains) {
      entry.integrity.previousHash = this.getLastHash();
      entry.integrity.hash = this.calculateEntryHash(entry);
      entry.integrity.blockHeight = this.currentBlockHeight++;
      this.hashChain.push(entry.integrity.hash);
    }
    
    // Digital signature if enabled
    if (this.config.enableDigitalSigning) {
      entry.integrity.digitalSignature = this.signEntry(entry);
    }
    
    // Store entry
    await this.storeEntry(entry);
    
    // Check for security violations
    await this.checkForViolations(entry);
    
    return entry.id;
  }
  
  /**
   * Query audit entries with advanced filtering
   */
  async query(query: AuditQuery): Promise<AuditQueryResult> {
    let filteredEntries = this.auditStore.filter(entry => this.matchesQuery(entry, query));
    
    // Sort results
    if (query.sortBy) {
      filteredEntries.sort((a, b) => {
        const aVal = this.getNestedValue(a, query.sortBy!);
        const bVal = this.getNestedValue(b, query.sortBy!);
        
        if (query.sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }
    
    const totalCount = filteredEntries.length;
    
    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedEntries = filteredEntries.slice(offset, offset + limit);
    
    // Generate aggregations
    const aggregations = this.generateAggregations(filteredEntries);
    
    return {
      entries: paginatedEntries,
      totalCount,
      hasMore: offset + limit < totalCount,
      aggregations
    };
  }
  
  /**
   * Generate comprehensive audit report
   */
  async generateReport(
    title: string,
    description: string,
    timeRange: { start: Date; end: Date },
    filters: AuditQuery,
    generatedBy: string
  ): Promise<AuditReport> {
    const queryResult = await this.query({
      ...filters,
      timeRange,
      limit: 10000 // Get all entries for report
    });
    
    const summary = this.generateSummary(queryResult.entries);
    const violations = await this.detectViolations(queryResult.entries);
    const recommendations = this.generateRecommendations(summary, violations);
    
    return {
      id: this.generateReportId(),
      title,
      description,
      timeRange,
      filters,
      summary,
      violations,
      recommendations,
      generatedAt: new Date(),
      generatedBy
    };
  }
  
  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    totalEntries: number;
    verifiedEntries: number;
  }> {
    const issues: string[] = [];
    let verifiedEntries = 0;
    
    // Verify hash chain
    if (this.config.enableHashChains) {
      for (let i = 1; i < this.auditStore.length; i++) {
        const entry = this.auditStore[i];
        const previousEntry = this.auditStore[i - 1];
        
        if (entry.integrity.previousHash !== previousEntry.integrity.hash) {
          issues.push(`Hash chain broken at entry ${entry.id}`);
        }
        
        const calculatedHash = this.calculateEntryHash(entry);
        if (entry.integrity.hash !== calculatedHash) {
          issues.push(`Hash mismatch for entry ${entry.id}`);
        } else {
          verifiedEntries++;
        }
      }
    }
    
    // Verify digital signatures
    if (this.config.enableDigitalSigning) {
      for (const entry of this.auditStore) {
        if (entry.integrity.digitalSignature) {
          const isValid = this.verifySignature(entry);
          if (!isValid) {
            issues.push(`Invalid digital signature for entry ${entry.id}`);
          } else {
            verifiedEntries++;
          }
        }
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      totalEntries: this.auditStore.length,
      verifiedEntries
    };
  }
  
  /**
   * Export audit logs for external systems
   */
  async exportLogs(
    format: 'json' | 'csv' | 'xml' | 'siem',
    query?: AuditQuery,
    encryption?: boolean
  ): Promise<Buffer> {
    const queryResult = await this.query(query || {});
    let exportData: string;
    
    switch (format) {
      case 'json':
        exportData = JSON.stringify(queryResult.entries, null, 2);
        break;
      case 'csv':
        exportData = this.convertToCSV(queryResult.entries);
        break;
      case 'xml':
        exportData = this.convertToXML(queryResult.entries);
        break;
      case 'siem':
        exportData = this.convertToSIEM(queryResult.entries);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    let buffer = Buffer.from(exportData);
    
    if (encryption && this.config.encryptionEnabled) {
      buffer = this.encryptData(buffer);
    }
    
    return buffer;
  }
  
  /**
   * Archive old audit entries
   */
  async archiveEntries(beforeDate: Date): Promise<{
    archivedCount: number;
    archiveLocation: string;
  }> {
    const entriesToArchive = this.auditStore.filter(entry => entry.timestamp < beforeDate);
    
    // Export to archive format
    const archiveData = await this.exportLogs('json', {
      timeRange: { start: new Date(0), end: beforeDate }
    }, true);
    
    // Generate archive filename
    const archiveLocation = `audit-archive-${beforeDate.toISOString().split('T')[0]}.json.enc`;
    
    // Remove archived entries from active store
    this.auditStore = this.auditStore.filter(entry => entry.timestamp >= beforeDate);
    
    // Log the archival operation
    await this.logEntry(
      {
        id: 'system',
        type: ActorType.AUTOMATED_PROCESS,
        name: 'Archive Process',
        role: UserRole.SYSTEM_ADMIN,
        clearanceLevel: ClassificationLevel.TOP_SECRET,
        authentication: {
          method: AuthMethod.CERTIFICATE,
          strength: 1.0,
          mfaUsed: false,
          certificateUsed: true,
          biometricUsed: false
        }
      },
      AuditAction.BACKUP_PERFORMED,
      {
        id: archiveLocation,
        type: ResourceType.LOG_FILE,
        classification: ClassificationLevel.TOP_SECRET,
        size: archiveData.length
      },
      {
        businessJustification: 'Automated audit log archival for retention compliance',
        urgencyLevel: UrgencyLevel.LOW,
        riskLevel: RiskLevel.MINIMAL,
        complianceFramework: ['SOX', 'GDPR', 'NIST'],
        tags: ['archive', 'retention', 'compliance']
      },
      {
        result: OutcomeResult.SUCCESS,
        duration: 0,
        dataModified: true,
        recordsAffected: entriesToArchive.length,
        complianceStatus: ComplianceStatus.COMPLIANT
      }
    );
    
    return {
      archivedCount: entriesToArchive.length,
      archiveLocation
    };
  }
  
  // Private helper methods
  
  private generateEntryId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateCorrelationId(): string {
    return `corr_${Math.random().toString(36).substr(2, 16)}`;
  }
  
  private generateTraceId(): string {
    return `trace_${Math.random().toString(36).substr(2, 16)}`;
  }
  
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateGenesisHash(): string {
    return crypto.createHash('sha256').update('ACTIVE_MEASURES_AUDIT_GENESIS').digest('hex');
  }
  
  private getLastHash(): string {
    return this.hashChain[this.hashChain.length - 1] || this.generateGenesisHash();
  }
  
  private calculateEntryHash(entry: AuditEntry): string {
    const entryData = {
      ...entry,
      integrity: { ...entry.integrity, hash: undefined, digitalSignature: undefined }
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(entryData))
      .digest('hex');
  }
  
  private signEntry(entry: AuditEntry): string {
    const entryData = {
      ...entry,
      integrity: { ...entry.integrity, digitalSignature: undefined }
    };
    
    return jwt.sign(entryData, this.signingKey, { algorithm: 'HS256' });
  }
  
  private verifySignature(entry: AuditEntry): boolean {
    if (!entry.integrity.digitalSignature) {
      return false;
    }
    
    try {
      const entryData = {
        ...entry,
        integrity: { ...entry.integrity, digitalSignature: undefined }
      };
      
      const decoded = jwt.verify(entry.integrity.digitalSignature, this.signingKey) as any;
      return JSON.stringify(decoded) === JSON.stringify(entryData);
    } catch {
      return false;
    }
  }
  
  private determineConfidentiality(classification: ClassificationLevel): ConfidentialityLevel {
    const mapping = {
      [ClassificationLevel.UNCLASSIFIED]: ConfidentialityLevel.PUBLIC,
      [ClassificationLevel.CONFIDENTIAL]: ConfidentialityLevel.CONFIDENTIAL,
      [ClassificationLevel.SECRET]: ConfidentialityLevel.RESTRICTED,
      [ClassificationLevel.TOP_SECRET]: ConfidentialityLevel.TOP_SECRET,
      [ClassificationLevel.SCI]: ConfidentialityLevel.TOP_SECRET,
      [ClassificationLevel.SAP]: ConfidentialityLevel.TOP_SECRET
    };
    
    return mapping[classification] || ConfidentialityLevel.INTERNAL;
  }
  
  private async generateIntegrityData(entry: Partial<AuditEntry>): Promise<IntegrityData> {
    return {
      hash: '',
      previousHash: '',
      digitalSignature: undefined,
      merkleRoot: undefined,
      blockHeight: this.currentBlockHeight,
      witnessSignatures: undefined
    };
  }
  
  private validateEntry(entry: AuditEntry): void {
    if (!entry.id || !entry.timestamp || !entry.actor || !entry.action) {
      throw new Error('Invalid audit entry: missing required fields');
    }
    
    if (entry.actor.clearanceLevel === undefined) {
      throw new Error('Invalid audit entry: actor clearance level required');
    }
    
    if (entry.resource.classification === undefined) {
      throw new Error('Invalid audit entry: resource classification required');
    }
  }
  
  private async storeEntry(entry: AuditEntry): Promise<void> {
    // In a real implementation, this would persist to a database
    this.auditStore.push(entry);
    
    // Optional: Compress old entries
    if (this.config.compressionEnabled && this.auditStore.length > 1000) {
      // Implement compression logic
    }
  }
  
  private async checkForViolations(entry: AuditEntry): Promise<void> {
    // Check for suspicious patterns
    if (entry.action === AuditAction.LOGIN && entry.outcome.result === OutcomeResult.FAILURE) {
      // Multiple failed login attempts
      const recentFailures = this.auditStore.filter(e => 
        e.actor.id === entry.actor.id &&
        e.action === AuditAction.LOGIN &&
        e.outcome.result === OutcomeResult.FAILURE &&
        (entry.timestamp.getTime() - e.timestamp.getTime()) < 300000 // 5 minutes
      );
      
      if (recentFailures.length >= 3) {
        // Log security violation
        await this.logSecurityViolation({
          type: ViolationType.UNAUTHORIZED_ACCESS,
          severity: Severity.MEDIUM,
          description: `Multiple failed login attempts for user ${entry.actor.id}`,
          actor: entry.actor.id,
          relatedEntries: [entry.id, ...recentFailures.map(e => e.id)]
        });
      }
    }
    
    // Check for unauthorized access to classified resources
    if (entry.resource.classification === ClassificationLevel.TOP_SECRET &&
        entry.actor.clearanceLevel !== ClassificationLevel.TOP_SECRET) {
      await this.logSecurityViolation({
        type: ViolationType.PRIVILEGE_ESCALATION,
        severity: Severity.CRITICAL,
        description: `Unauthorized access to TOP SECRET resource by user with ${entry.actor.clearanceLevel} clearance`,
        actor: entry.actor.id,
        relatedEntries: [entry.id]
      });
    }
  }
  
  private async logSecurityViolation(violation: Omit<SecurityViolation, 'id' | 'timestamp' | 'status'>): Promise<void> {
    const securityViolation: SecurityViolation = {
      id: this.generateEntryId(),
      timestamp: new Date(),
      status: ViolationStatus.OPEN,
      ...violation
    };
    
    // In a real implementation, this would be stored separately and trigger alerts
    console.warn('Security violation detected:', securityViolation);
  }
  
  private matchesQuery(entry: AuditEntry, query: AuditQuery): boolean {
    if (query.actorId && entry.actor.id !== query.actorId) return false;
    if (query.action && entry.action !== query.action) return false;
    if (query.resourceType && entry.resource.type !== query.resourceType) return false;
    if (query.classification && entry.resource.classification !== query.classification) return false;
    if (query.operationId && entry.context.operationId !== query.operationId) return false;
    if (query.riskLevel && entry.context.riskLevel !== query.riskLevel) return false;
    if (query.complianceStatus && entry.outcome.complianceStatus !== query.complianceStatus) return false;
    
    if (query.timeRange) {
      if (entry.timestamp < query.timeRange.start || entry.timestamp > query.timeRange.end) {
        return false;
      }
    }
    
    return true;
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
  
  private generateAggregations(entries: AuditEntry[]): AuditAggregations {
    const actionCounts = {} as Record<AuditAction, number>;
    const actorCounts = {} as Record<string, number>;
    const riskDistribution = {} as Record<RiskLevel, number>;
    const complianceDistribution = {} as Record<ComplianceStatus, number>;
    
    entries.forEach(entry => {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      actorCounts[entry.actor.id] = (actorCounts[entry.actor.id] || 0) + 1;
      riskDistribution[entry.context.riskLevel] = (riskDistribution[entry.context.riskLevel] || 0) + 1;
      complianceDistribution[entry.outcome.complianceStatus] = (complianceDistribution[entry.outcome.complianceStatus] || 0) + 1;
    });
    
    // Generate time distribution (hourly buckets)
    const timeDistribution = this.generateTimeDistribution(entries);
    
    return {
      actionCounts,
      actorCounts,
      timeDistribution,
      riskDistribution,
      complianceDistribution
    };
  }
  
  private generateTimeDistribution(entries: AuditEntry[]): Array<{ time: Date; count: number }> {
    const hourlyBuckets = new Map<string, number>();
    
    entries.forEach(entry => {
      const hourBucket = new Date(entry.timestamp);
      hourBucket.setMinutes(0, 0, 0);
      const key = hourBucket.toISOString();
      
      hourlyBuckets.set(key, (hourlyBuckets.get(key) || 0) + 1);
    });
    
    return Array.from(hourlyBuckets.entries())
      .map(([time, count]) => ({ time: new Date(time), count }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }
  
  private generateSummary(entries: AuditEntry[]): AuditSummary {
    const uniqueActors = new Set(entries.map(e => e.actor.id)).size;
    const uniqueOperations = new Set(entries.map(e => e.context.operationId).filter(Boolean)).size;
    
    const successCount = entries.filter(e => e.outcome.result === OutcomeResult.SUCCESS).length;
    const errorCount = entries.filter(e => e.outcome.result === OutcomeResult.ERROR).length;
    
    const securityViolations = entries.filter(e => 
      e.action === AuditAction.SECURITY_VIOLATION || 
      e.action === AuditAction.INTRUSION_ATTEMPT
    ).length;
    
    const complianceViolations = entries.filter(e => 
      e.outcome.complianceStatus === ComplianceStatus.NON_COMPLIANT
    ).length;
    
    const totalDuration = entries.reduce((sum, e) => sum + e.outcome.duration, 0);
    const averageResponseTime = entries.length > 0 ? totalDuration / entries.length : 0;
    
    return {
      totalEntries: entries.length,
      uniqueActors,
      uniqueOperations,
      successRate: entries.length > 0 ? successCount / entries.length : 0,
      errorRate: entries.length > 0 ? errorCount / entries.length : 0,
      securityViolations,
      complianceViolations,
      averageResponseTime
    };
  }
  
  private async detectViolations(entries: AuditEntry[]): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    
    // Detect multiple failed logins
    const failedLogins = entries.filter(e => 
      e.action === AuditAction.LOGIN && e.outcome.result === OutcomeResult.FAILURE
    );
    
    const userFailures = new Map<string, AuditEntry[]>();
    failedLogins.forEach(entry => {
      const userId = entry.actor.id;
      if (!userFailures.has(userId)) {
        userFailures.set(userId, []);
      }
      userFailures.get(userId)!.push(entry);
    });
    
    userFailures.forEach((failures, userId) => {
      if (failures.length >= 5) {
        violations.push({
          id: this.generateEntryId(),
          type: ViolationType.UNAUTHORIZED_ACCESS,
          severity: Severity.HIGH,
          description: `User ${userId} had ${failures.length} failed login attempts`,
          actor: userId,
          timestamp: failures[failures.length - 1].timestamp,
          relatedEntries: failures.map(f => f.id),
          status: ViolationStatus.OPEN
        });
      }
    });
    
    return violations;
  }
  
  private generateRecommendations(summary: AuditSummary, violations: SecurityViolation[]): AuditRecommendation[] {
    const recommendations: AuditRecommendation[] = [];
    
    if (summary.errorRate > 0.1) {
      recommendations.push({
        id: this.generateEntryId(),
        category: RecommendationCategory.OPERATIONAL_EFFICIENCY,
        priority: Priority.HIGH,
        title: 'High Error Rate Detected',
        description: `Error rate of ${(summary.errorRate * 100).toFixed(1)}% exceeds acceptable threshold of 10%`,
        impact: 'Reduced system reliability and user experience',
        effort: EffortLevel.MEDIUM,
        timeline: '2-4 weeks'
      });
    }
    
    if (violations.length > 0) {
      recommendations.push({
        id: this.generateEntryId(),
        category: RecommendationCategory.SECURITY_IMPROVEMENT,
        priority: Priority.CRITICAL,
        title: 'Security Violations Require Immediate Attention',
        description: `${violations.length} security violations detected`,
        impact: 'Potential security breach or compromise',
        effort: EffortLevel.HIGH,
        timeline: 'Immediate'
      });
    }
    
    if (summary.complianceViolations > 0) {
      recommendations.push({
        id: this.generateEntryId(),
        category: RecommendationCategory.COMPLIANCE_ENHANCEMENT,
        priority: Priority.HIGH,
        title: 'Compliance Violations Need Remediation',
        description: `${summary.complianceViolations} compliance violations identified`,
        impact: 'Regulatory penalties and audit findings',
        effort: EffortLevel.MEDIUM,
        timeline: '1-2 weeks'
      });
    }
    
    return recommendations;
  }
  
  // Export format converters
  
  private convertToCSV(entries: AuditEntry[]): string {
    const headers = [
      'ID', 'Timestamp', 'Actor', 'Action', 'Resource', 'Outcome', 'Duration'
    ];
    
    const rows = entries.map(entry => [
      entry.id,
      entry.timestamp.toISOString(),
      entry.actor.name,
      entry.action,
      entry.resource.id,
      entry.outcome.result,
      entry.outcome.duration.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
  
  private convertToXML(entries: AuditEntry[]): string {
    const xmlEntries = entries.map(entry => `
      <entry id="${entry.id}">
        <timestamp>${entry.timestamp.toISOString()}</timestamp>
        <actor>${entry.actor.name}</actor>
        <action>${entry.action}</action>
        <resource>${entry.resource.id}</resource>
        <outcome>${entry.outcome.result}</outcome>
      </entry>
    `).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
    <audit-log>
      ${xmlEntries}
    </audit-log>`;
  }
  
  private convertToSIEM(entries: AuditEntry[]): string {
    return entries.map(entry => JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      source: 'active-measures',
      event_type: entry.action,
      user: entry.actor.name,
      resource: entry.resource.id,
      outcome: entry.outcome.result,
      risk_level: entry.context.riskLevel,
      classification: entry.resource.classification
    })).join('\n');
  }
  
  private encryptData(data: Buffer): Buffer {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.signingKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    
    return Buffer.concat([iv, encrypted]);
  }
  
  /**
   * Get audit statistics
   */
  getStatistics(): {
    totalEntries: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    integrityStatus: boolean;
  } {
    return {
      totalEntries: this.auditStore.length,
      oldestEntry: this.auditStore.length > 0 ? this.auditStore[0].timestamp : undefined,
      newestEntry: this.auditStore.length > 0 ? this.auditStore[this.auditStore.length - 1].timestamp : undefined,
      integrityStatus: this.config.enableHashChains && this.hashChain.length === this.auditStore.length + 1
    };
  }
}