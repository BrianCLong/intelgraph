// Core IntelGraph types
export interface Entity {
  id: string
  name: string
  type: EntityType
  confidence: number
  properties: Record<string, any>
  createdAt: string
  updatedAt: string
  source?: string
  tags?: string[]
}

export type EntityType = 
  | 'PERSON'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'IP_ADDRESS'
  | 'DOMAIN'
  | 'EMAIL'
  | 'PHONE'
  | 'FILE'
  | 'HASH'
  | 'CVE'
  | 'MALWARE'
  | 'CAMPAIGN'
  | 'INDICATOR'
  | 'EVENT'
  | 'VULNERABILITY'
  | 'ASSET'
  | 'PROJECT'
  | 'SYSTEM'

export interface Relationship {
  id: string
  sourceId: string
  targetId: string
  type: RelationshipType
  confidence: number
  properties: Record<string, any>
  createdAt: string
  direction: 'bidirectional' | 'directed'
}

export type RelationshipType =
  | 'CONNECTED_TO'
  | 'OWNS'
  | 'WORKS_FOR'
  | 'LOCATED_AT'
  | 'COMMUNICATES_WITH'
  | 'CONTAINS'
  | 'SIMILAR_TO'
  | 'DERIVED_FROM'
  | 'TARGETS'
  | 'EXPLOITS'
  | 'INDICATES'
  | 'RELATED_TO'

export interface Investigation {
  id: string
  title: string
  description: string
  status: InvestigationStatus
  priority: Priority
  assignedTo?: string
  entityCount: number
  relationshipCount: number
  createdAt: string
  updatedAt: string
  tags: string[]
  metadata: Record<string, any>
}

export type InvestigationStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface Alert {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  status: AlertStatus
  source: string
  entityId?: string
  investigationId?: string
  createdAt: string
  updatedAt: string
  metadata: Record<string, any>
  assignedTo?: string
}

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'false_positive'

export interface Case {
  id: string
  title: string
  description: string
  status: CaseStatus
  priority: Priority
  investigationIds: string[]
  alertIds: string[]
  assignedTo?: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags: string[]
}

export type CaseStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  permissions: Permission[]
  avatar?: string
  lastActive: string
}

export type UserRole = 'admin' | 'analyst' | 'investigator' | 'viewer'

export interface Permission {
  resource: string
  action: string
  effect: 'allow' | 'deny'
  conditions?: Record<string, any>
}

export interface GraphLayout {
  type: 'force' | 'radial' | 'hierarchic'
  settings: Record<string, any>
}

export interface FilterState {
  entityTypes: EntityType[]
  relationshipTypes: RelationshipType[]
  dateRange: {
    start: string
    end: string
  }
  confidenceRange: {
    min: number
    max: number
  }
  tags: string[]
  sources: string[]
}

export interface PanelProps<T = any> {
  data: T
  loading?: boolean
  error?: Error | null
  onSelect?: (item: any) => void
  onAction?: (action: string, payload?: any) => void
  className?: string
}

export interface KPIMetric {
  id: string
  title: string
  value: number | string
  change?: {
    value: number
    direction: 'up' | 'down'
    period: string
  }
  status: 'success' | 'warning' | 'error' | 'neutral'
  format: 'number' | 'percentage' | 'currency' | 'duration'
}

export interface ThreatAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  impact: number
  confidence: number
  indicators: string[]
  recommendations: string[]
}

export interface TimelineEvent {
  id: string
  timestamp: string
  type: string
  title: string
  description?: string
  entityId?: string
  metadata: Record<string, any>
}

export interface GeoLocation {
  id: string
  name: string
  coordinates: [number, number] // [longitude, latitude]
  type: 'country' | 'city' | 'region' | 'point'
  threatLevel?: AlertSeverity
  entityCount: number
  metadata: Record<string, any>
}