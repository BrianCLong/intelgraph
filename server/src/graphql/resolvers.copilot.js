const { getGoalById } = require('../services/goalService'); // stub or in-memory from previous ticket
const { requireTenant } = require('../middleware/withTenant.js');
const { graphRAGCopilotService } = require('../services/GraphRAGCopilotService.js');

const copilotResolvers = {
  Query: {
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
    }
  },

  Mutation: {
    startCopilotRun: async (_, { goalId, goalText, investigationId, resume = false }, { dataSources, user }) => {
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
        userId: user?.id
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

    askCopilot: async (_, { input }, context) => {
      const tenantId = requireTenant(context);
      const { pubsub } = context;
      const { question, investigationId, jobId } = input;
      const result = await graphRAGCopilotService.ask({
        question,
        investigationId,
        jobId,
        tenantId,
        pubsub,
      });
      return result.jobId;
    }
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
      resolve: (event) => event.payload
    },
    copilotAnswer: {
      subscribe: (_, { jobId }, context) => {
        requireTenant(context);
        const { pubsub } = context;
        return pubsub.asyncIterator(`COPILOT_ANSWER_${jobId}`);
        },
      resolve: (event) => event.payload,
    }
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
    }
  }
};

module.exports = { copilotResolvers };