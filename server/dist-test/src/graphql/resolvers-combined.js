"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const AuthService_js_1 = __importDefault(require("../services/AuthService.js"));
const graphql_subscriptions_1 = require("graphql-subscriptions");
const copilotResolvers = require('./resolvers.copilot.js');
const graphResolvers = require('./resolvers.graphops.js');
const aiResolvers = require('./resolvers.ai.js');
const annotationsResolvers = require('./resolvers.annotations.js');
const pubsub = new graphql_subscriptions_1.PubSub();
const authService = new AuthService_js_1.default();
const goals = []; // replace with DB later
let seq = 1;
exports.resolvers = {
    Query: {
        ...(copilotResolvers.Query || {}),
        ...(aiResolvers.Query || {}),
        ...(annotationsResolvers.Query || {}),
        me: async (_, __, { user }) => {
            if (!user)
                throw new Error('Not authenticated');
            return user;
        },
        copilotGoals: async (_, { investigationId }) => {
            return investigationId
                ? goals.filter(g => g.investigationId === String(investigationId))
                : goals;
        }
    },
    Mutation: {
        ...(copilotResolvers.Mutation || {}),
        ...(graphResolvers.Mutation || {}),
        ...(aiResolvers.Mutation || {}),
        ...(annotationsResolvers.Mutation || {}),
        login: async (_, { input }, { req }) => {
            const { email, password } = input;
            const ipAddress = req?.ip;
            const userAgent = req?.get('User-Agent');
            return await authService.login(email, password, ipAddress, userAgent);
        },
        register: async (_, { input }) => {
            return await authService.register(input);
        },
        createCopilotGoal: async (_, { text, investigationId }) => {
            if (!text || !text.trim()) {
                throw new Error('Goal text is required');
            }
            const goal = {
                id: String(seq++),
                text: text.trim(),
                investigationId: investigationId ? String(investigationId) : null,
                createdAt: new Date().toISOString(),
            };
            goals.unshift(goal);
            return goal;
        },
        logout: async () => {
            return true;
        }
    },
    Subscription: {
        ...(copilotResolvers.Subscription || {}),
        ...(aiResolvers.Subscription || {}),
        ...(annotationsResolvers.Subscription || {}),
        investigationUpdated: {
            subscribe: () => pubsub.asyncIterator(['INVESTIGATION_UPDATED'])
        },
        entityAdded: {
            subscribe: () => pubsub.asyncIterator(['ENTITY_ADDED'])
        }
    },
    User: {
        fullName: (user) => `${user.firstName} ${user.lastName}`
    },
    Entity: {
        ...(annotationsResolvers.Entity || {}),
    },
    Investigation: {
        ...(annotationsResolvers.Investigation || {}),
    },
    Relationship: {
        ...(annotationsResolvers.Relationship || {}),
    },
};
exports.default = exports.resolvers;
//# sourceMappingURL=resolvers-combined.js.map