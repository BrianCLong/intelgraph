const { getGoalById } = require('../services/goalService'); // stub or in-memory from previous ticket
const { translator } = require('../services/nlq/translator');

const copilotResolvers = {
  Query: {
    copilotQuery: async (_, { question, caseId, preview = true }, context) => {
      const tenantId = context?.tenant?.id || context?.tenantId;
      const translation = await translator.translate(question, tenantId);
      const session = context.neo4jSession;
      const policy = { allowed: true, reason: 'allow', deniedRules: [] };

      if (context.policyService?.evaluate) {
        const decision = await context.policyService.evaluate({
          action: 'copilot.query',
          resource: { type: 'cypher', text: translation.cypher },
          context: { tenantId, caseId },
        });
        if (!decision.allow) {
          policy.allowed = false;
          policy.reason = decision.reason || 'denied';
          policy.deniedRules = decision.deniedRules || [];
        }
      }

      let previewText = '';
      try {
        const result = await session.run(`EXPLAIN ${translation.cypher}`, translation.params);
        previewText = result.summary.plan ? result.summary.plan.operatorType : 'OK';
      } catch (err) {
        previewText = err.message;
      }

      let cypherExecuted = null;
      if (!preview && policy.allowed) {
        await session.run(translation.cypher, translation.params);
        cypherExecuted = translation.cypher;
      }

      return {
        preview: previewText,
        cypher: cypherExecuted,
        citations: translation.citations,
        redactions: [],
        policy,
        metrics: translation.metrics,
      };
    },
    copilotRun: async (_, { id }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.getRunInfo(id);
    },

    copilotEvents: async (_, { runId, afterId, limit }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      const run = await copilotOrchestrator.store.getRun(runId);
      if (!run) throw new Error('Run not found');

      return copilotOrchestrator.store.listEvents(runId, { afterId, limit });
    },

    copilotRuns: async (_, { investigationId, status, limit = 20 }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      // TODO: Add proper filtering to store
      return copilotOrchestrator.store.findResumableRuns(investigationId);
    },

    copilotStats: async (_, { timeRange = '24 hours' }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.getStats(timeRange);
    },
  },

  Mutation: {
    startCopilotRun: async (
      _,
      { goalId, goalText, investigationId, resume = false },
      { dataSources, user },
    ) => {
      const { copilotOrchestrator } = dataSources;

      // If goalId provided, get goal text
      let goal = goalText;
      if (goalId && !goal) {
        const goalData = await getGoalById(goalId);
        if (!goalData) throw new Error('Goal not found');
        goal = goalData.text;
      }

      if (!goal) {
        throw new Error('Goal text or goalId is required');
      }

      return copilotOrchestrator.startRun(goalId, goal, {
        resume,
        investigationId,
        userId: user?.id,
      });
    },

    pauseCopilotRun: async (_, { runId }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.pauseRun(runId);
    },

    resumeCopilotRun: async (_, { runId }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      const run = await copilotOrchestrator.store.getRun(runId);
      if (!run) throw new Error('Run not found');

      return copilotOrchestrator.resumeRun(run);
    },
  },

  // Subscriptions for real-time updates
  Subscription: {
    copilotEvents: {
      subscribe: async (_, { runId }, { dataSources, pubsub }) => {
        // Verify run exists
        const { copilotOrchestrator } = dataSources;
        const run = await copilotOrchestrator.store.getRun(runId);
        if (!run) throw new Error('Run not found');

        return pubsub.asyncIterator(`COPILOT_EVENT_${runId}`);
      },
      resolve: (event) => event.payload,
    },
  },

  // Field resolvers for nested data
  CopilotRun: {
    tasks: async (run, _, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.store.getTasksForRun(run.id);
    },

    events: async (run, { limit = 50 }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.store.listEvents(run.id, { limit });
    },

    isActive: (run, _, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.activeRuns.has(run.id);
    },
  },
};

module.exports = { copilotResolvers };
