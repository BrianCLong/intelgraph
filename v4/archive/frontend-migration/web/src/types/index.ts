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

export type InvestigationStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'false_positive'

export type CaseStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type UserRole = 'admin' | 'analyst' | 'investigator' | 'viewer'

export interface TimelineEvent {
  id: string
  timestamp: string
  type: string
  title: string
  description?: string
  entityId?: string
  metadata: Record<string, any>
