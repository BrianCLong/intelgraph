import { gql } from '@apollo/client';

export const START_RUN = gql`
  mutation StartCopilotRun($goalId: ID!) {
    startCopilotRun(goalId: $goalId) {
      id
      status
      createdAt
      plan {
        id
        createdAt
        steps {
          id
          kind
          status
        }
      }
    }
  }
`;

export const POLL_EVENTS = gql`
  query CopilotEvents($runId: ID!) {
    copilotEvents(runId: $runId) {
      runId
      taskId
      level
      message
      ts
      payload
    }
  }
`;

export const GENERATE_ENTITIES_FROM_TEXT = gql`
  mutation GenerateEntitiesFromText($investigationId: ID!, $text: String!) {
    generateEntitiesFromText(investigationId: $investigationId, text: $text) {
      entities {
        id
        label
        type
      }
      relationships {
        id
        from
        to
        type
      }
    }
  }
`;

export const COPILOT_QUERY = gql`
  query CopilotQuery($question: String!, $caseId: ID!, $preview: Boolean!) {
    copilotQuery(question: $question, caseId: $caseId, preview: $preview) {
      preview
      cypher
      citations {
        nodeId
        source
        confidence
      }
      redactions
      policy {
        allowed
        reason
        deniedRules
      }
      metrics
    }
  }
`;
