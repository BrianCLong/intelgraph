const gql = require('graphql-tag');

const copilotTypeDefs = gql`
  enum CopilotRunStatus { pending running succeeded failed paused }
  enum CopilotTaskStatus { pending running succeeded failed skipped }
  enum CopilotEventLevel { info warning error debug progress }

  type CopilotTask {
    id: ID!
    runId: ID!
    sequenceNumber: Int!
    taskType: String!     # e.g. "NEO4J_QUERY", "ENRICH_ENTITY", "SUMMARIZE"
    kind: String!         # backwards compatibility alias for taskType
    inputParams: JSON!    # JSON input parameters
    input: String!        # backwards compatibility - JSON stringified
    outputData: JSON      # JSON result data
    output: String        # backwards compatibility - JSON stringified
    status: CopilotTaskStatus!
    errorMessage: String
    error: String         # backwards compatibility alias
    createdAt: String!
    startedAt: String
    finishedAt: String
  }

  type CopilotPlan {
    id: ID!
    goalId: ID
    steps: [CopilotTask!]!
    createdAt: String!
  }

  type CopilotRun {
    id: ID!
    goalId: ID
    goalText: String!
    goal: String!         # backwards compatibility alias
    investigationId: ID
    status: CopilotRunStatus!
    plan: CopilotPlan
    metadata: JSON
    tasks: [CopilotTask!]!
    events(limit: Int = 50): [CopilotEvent!]!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
    startedAt: String
    finishedAt: String
  }

  type CopilotEvent {
    id: ID!
    runId: ID!
    taskId: ID
    level: CopilotEventLevel!
    message: String!
    payload: JSON
    ts: String!
    createdAt: String!
  }

  type CopilotStats {
    status: String!
    count: Int!
    avgDurationSeconds: Float
  }

  """Inline citation reference"""
  type Citation {
    nodeId: ID!
    snippet: String!
  }

  """Policy evaluation result"""
  type CopilotPolicy {
    allowed: Boolean!
    reason: String
  }

  """Answer returned from natural language Copilot query"""
  type CopilotAnswer {
    preview: String!
    citations: [Citation!]!
    redactions: [String!]!
    policy: CopilotPolicy!
  }

  input StartCopilotRunInput {
    goalId: ID
    goalText: String
    investigationId: ID
    resume: Boolean = false
  }

  extend type Query {
    # Get a specific run with full details
    copilotRun(id: ID!): CopilotRun
    
    # Get multiple runs with filtering
    copilotRuns(
      investigationId: ID
      status: CopilotRunStatus
      limit: Int = 20
    ): [CopilotRun!]!
    
    # Get events for a run with pagination
    copilotEvents(
      runId: ID!
      afterId: ID
      limit: Int = 50
    ): [CopilotEvent!]!
    
    # Get statistics for monitoring
    copilotStats(timeRange: String = "24 hours"): [CopilotStats!]!

    # Draft and optionally execute a natural language query
    copilotQuery(
      question: String!
      caseId: ID!
      preview: Boolean = true
    ): CopilotAnswer!
  }

  extend type Mutation {
    # Start a new run or resume existing
    startCopilotRun(
      goalId: ID
      goalText: String
      investigationId: ID
      resume: Boolean = false
    ): CopilotRun!
    
    # Control run execution
    pauseCopilotRun(runId: ID!): CopilotRun!
    resumeCopilotRun(runId: ID!): CopilotRun!
  }

  extend type Subscription {
    # Real-time events for a specific run
    copilotEvents(runId: ID!): CopilotEvent!
  }

  # JSON scalar for complex data
  scalar JSON
`;

module.exports = { copilotTypeDefs };