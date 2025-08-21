import { useQuery, useMutation, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'

// GraphQL Queries
export const GET_ENTITIES = gql`
  query GetEntities($filters: EntityFilters) {
    entities(filters: $filters) {
      id
      type
      value
      confidence
      source
      firstSeen
      lastSeen
      properties
      metadata
      riskScore
      threatLevel
    }
  }
`

export const GET_ENTITY_RELATIONSHIPS = gql`
  query GetEntityRelationships($entityId: ID!) {
    entity(id: $entityId) {
      id
      relationships {
        id
        type
        targetEntity {
          id
          type
          value
          confidence
        }
        confidence
        source
        firstSeen
        lastSeen
        properties
      }
    }
  }
`

export const GET_INVESTIGATIONS = gql`
  query GetInvestigations($status: String, $assignedTo: ID) {
    investigations(status: $status, assignedTo: $assignedTo) {
      id
      name
      description
      status
      priority
      assignedTo {
        id
        name
        email
      }
      createdAt
      updatedAt
      entities {
        id
        type
        value
      }
      tags
      metadata
    }
  }
`

export const GET_ALERTS = gql`
  query GetAlerts($severity: String, $status: String) {
    alerts(severity: $severity, status: $status) {
      id
      title
      description
      severity
      status
      source
      createdAt
      updatedAt
      entities {
        id
        type
        value
      }
      rules {
        id
        name
        type
      }
      metadata
    }
  }
`

// GraphQL Mutations
export const CREATE_INVESTIGATION = gql`
  mutation CreateInvestigation($input: CreateInvestigationInput!) {
    createInvestigation(input: $input) {
      id
      name
      description
      status
      priority
      assignedTo {
        id
        name
      }
      createdAt
    }
  }
`

export const UPDATE_INVESTIGATION = gql`
  mutation UpdateInvestigation($id: ID!, $input: UpdateInvestigationInput!) {
    updateInvestigation(id: $id, input: $input) {
      id
      name
      description
      status
      priority
      updatedAt
    }
  }
`

export const ADD_ENTITY_TO_INVESTIGATION = gql`
  mutation AddEntityToInvestigation($investigationId: ID!, $entityId: ID!) {
    addEntityToInvestigation(investigationId: $investigationId, entityId: $entityId) {
      id
      entities {
        id
        type
        value
      }
    }
  }
`

export const UPDATE_ALERT_STATUS = gql`
  mutation UpdateAlertStatus($id: ID!, $status: String!) {
    updateAlertStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`

// GraphQL Subscriptions
export const ENTITY_UPDATES = gql`
  subscription EntityUpdates {
    entityUpdated {
      id
      type
      value
      confidence
      lastSeen
      riskScore
      threatLevel
    }
  }
`

export const ALERT_UPDATES = gql`
  subscription AlertUpdates {
    alertCreated {
      id
      title
      severity
      status
      createdAt
      entities {
        id
        type
        value
      }
    }
  }
`

export const INVESTIGATION_UPDATES = gql`
  subscription InvestigationUpdates($investigationId: ID) {
    investigationUpdated(id: $investigationId) {
      id
      name
      status
      priority
      updatedAt
      entities {
        id
        type
        value
      }
    }
  }
`

// Custom hooks for common operations
export function useEntities(filters?: any) {
  return useQuery(GET_ENTITIES, {
    variables: { filters },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  })
}

export function useEntityRelationships(entityId: string) {
  return useQuery(GET_ENTITY_RELATIONSHIPS, {
    variables: { entityId },
    skip: !entityId,
    fetchPolicy: 'cache-and-network',
  })
}

export function useInvestigations(filters?: { status?: string; assignedTo?: string }) {
  return useQuery(GET_INVESTIGATIONS, {
    variables: filters,
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000, // Poll every 30 seconds
  })
}

export function useAlerts(filters?: { severity?: string; status?: string }) {
  return useQuery(GET_ALERTS, {
    variables: filters,
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000, // Poll every 15 seconds for alerts
  })
}

export function useCreateInvestigation() {
  return useMutation(CREATE_INVESTIGATION, {
    refetchQueries: [{ query: GET_INVESTIGATIONS }],
  })
}

export function useUpdateInvestigation() {
  return useMutation(UPDATE_INVESTIGATION)
}

export function useAddEntityToInvestigation() {
  return useMutation(ADD_ENTITY_TO_INVESTIGATION)
}

export function useUpdateAlertStatus() {
  return useMutation(UPDATE_ALERT_STATUS, {
    refetchQueries: [{ query: GET_ALERTS }],
  })
}

// Subscription hooks
export function useEntityUpdates() {
  return useSubscription(ENTITY_UPDATES)
}

export function useAlertUpdates() {
  return useSubscription(ALERT_UPDATES)
}

export function useInvestigationUpdates(investigationId?: string) {
  return useSubscription(INVESTIGATION_UPDATES, {
    variables: { investigationId },
    skip: !investigationId,
  })
}