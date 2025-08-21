import { gql } from '@apollo/client';

// Active Measures Portfolio Queries
export const GET_ACTIVE_MEASURES_PORTFOLIO = gql`
  query GetActiveMeasuresPortfolio(
    $filters: PortfolioFiltersInput
    $tuners: TunersInput
  ) {
    activeMeasuresPortfolio(filters: $filters, tuners: $tuners) {
      id
      totalCount
      measures {
        id
        name
        category
        description
        riskLevel
        effectivenessRating
        unattributabilityScore
        novelFeatures {
          name
          description
          maturityLevel
        }
        aiCapabilities {
          type
          description
          confidence
        }
        operationalFramework {
          doctrine
          tactics
          procedures
        }
        resourceRequirements {
          personnel
          budget
          technology
          timeframe
        }
        legalFramework {
          authority
          limitations
          oversight
        }
        ethicalScore
        complianceRequirements {
          framework
          requirements
          status
        }
        historicalEffectiveness {
          operation
          outcome
          lessons
        }
        pqcResistance {
          level
          assessment
          recommendations
        }
      }
      categories {
        name
        count
        averageEffectiveness
      }
      recommendations {
        id
        type
        title
        description
        priority
        rationale
      }
      riskAssessment {
        overallRisk
        categories {
          name
          level
          probability
          impact
          factors
        }
        mitigationStrategies
        lastUpdated
      }
      complianceStatus {
        overallStatus
        frameworks {
          name
          status
          lastReview
          issues
        }
      }
    }
  }
`;

// Operations Management Queries
export const GET_OPERATIONS = gql`
  query GetOperations(
    $status: OperationStatus
    $assignedTo: ID
    $timeRange: TimeRangeInput
    $pagination: PaginationInput
  ) {
    getOperations(
      status: $status
      assignedTo: $assignedTo
      timeRange: $timeRange
      pagination: $pagination
    ) {
      operations {
        id
        name
        description
        status
        classification
        objectives {
          id
          type
          description
          successCriteria
          metrics {
            name
            target
            current
            threshold
          }
          priority
        }
        measures {
          id
          name
          category
          parameters
          constraints
        }
        targetProfile {
          entityIds
          demographicData
          psychographicProfile
          vulnerabilities {
            type
            severity
            exploitability
          }
          communicationChannels
          influenceNetwork
        }
        progress {
          percentage
          currentPhase
          completedTasks
          totalTasks
          estimatedCompletion
        }
        effectivenessMetrics {
          primaryObjectives {
            objectiveId
            achievementRate
            confidence
            impact
          }
          secondaryEffects {
            type
            magnitude
            significance
          }
          unintendedConsequences {
            type
            severity
            mitigation
          }
        }
        createdAt
        updatedAt
        scheduledStart
        actualStart
        completedAt
      }
      totalCount
      hasNextPage
    }
  }
`;

export const GET_OPERATION = gql`
  query GetOperation($id: ID!) {
    getOperation(id: $id) {
      id
      name
      description
      status
      classification
      objectives {
        id
        type
        description
        successCriteria
        metrics {
          name
          target
          current
          threshold
        }
        priority
      }
      measures {
        id
        name
        category
        description
        riskLevel
        effectivenessRating
        parameters
        constraints
      }
      targetProfile {
        entityIds
        demographicData
        psychographicProfile
        vulnerabilities {
          type
          severity
          exploitability
          description
        }
        communicationChannels
        influenceNetwork
      }
      simulationResults {
        id
        parameters
        predictedEffects {
          metric
          prediction
          confidence
          range
        }
        riskAnalysis {
          scenarios {
            name
            probability
            impact
          }
          overallRisk
          recommendations
        }
        aiInsights {
          type
          insight
          confidence
          evidence
        }
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

// Mutations
export const CREATE_OPERATION = gql`
  mutation CreateOperation($input: CreateOperationInput!) {
    createOperation(input: $input) {
      success
      operation {
        id
        name
        description
        status
        classification
        createdAt
      }
      errors {
        code
        message
        field
        severity
      }
      warnings {
        code
        message
        recommendation
      }
    }
  }
`;

export const COMBINE_MEASURES = gql`
  mutation CombineMeasures(
    $ids: [ID!]!
    $tuners: TunersInput!
    $context: OperationalContextInput!
  ) {
    combineMeasures(ids: $ids, tuners: $tuners, context: $context) {
      success
      operationPlan {
        id
        graph
        predictedEffects {
          metric
          impact
          confidence
          feedbackLoop
        }
        auditTrail {
          timestamp
          actor
          action
          details
        }
        riskAssessment {
          overallRisk
          mitigationStrategies
        }
        resourceRequirements {
          personnel
          budget
          technology
          timeframe
        }
        ethicalAssessment {
          score
          concerns
          recommendations
        }
      }
      compatibilityMatrix {
        measure1Id
        measure2Id
        compatibilityScore
        synergies
        conflicts
      }
      recommendations {
        type
        description
        priority
        rationale
      }
      errors {
        code
        message
        severity
      }
    }
  }
`;

export const RUN_SIMULATION = gql`
  mutation RunSimulation($input: SimulationInput!) {
    runSimulation(input: $input) {
      success
      simulationId
      estimatedCompletionTime
      initialResults {
        operationId
        scenario
        preliminaryOutcomes
        confidence
      }
      resourceUtilization {
        cpu
        memory
        storage
        estimatedCost
      }
      errors {
        code
        message
        severity
      }
    }
  }
`;

// Subscriptions
export const OPERATION_UPDATES = gql`
  subscription OperationUpdates($operationId: ID!) {
    operationUpdates(operationId: $operationId) {
      operationId
      type
      timestamp
      data
      actor {
        id
        name
        role
      }
    }
  }
`;

export const SIMULATION_PROGRESS = gql`
  subscription SimulationProgress($simulationId: ID!) {
    simulationProgress(simulationId: $simulationId) {
      simulationId
      progress
      status
      currentScenario
      estimatedTimeRemaining
      intermediateResults {
        metric
        value
        confidence
      }
      errors {
        code
        message
        severity
      }
    }
  }
`;

// Legacy query for backward compatibility
export const GET_PORTFOLIO = gql`
  query GetPortfolio($tuners: TunersInput) {
    activeMeasuresPortfolio(tuners: $tuners) {
      id
      totalCount
      measures {
        id
        name
        category
        description
        riskLevel
        effectivenessRating
        unattributabilityScore
      }
    }
  }
`;