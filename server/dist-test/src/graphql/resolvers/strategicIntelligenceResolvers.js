"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategicIntelligenceResolvers = void 0;
const strategicIntelligenceServices_1 = require("../../services/strategicIntelligenceServices");
exports.strategicIntelligenceResolvers = {
    Mutation: {
        correlateThreats: async (_, { osintInput }) => {
            return (0, strategicIntelligenceServices_1.runThreatCorrelation)(osintInput);
        },
        optimizeWargame: async (_, { logsInput }) => {
            return (0, strategicIntelligenceServices_1.runWargameOptimizer)(logsInput);
        },
        analyzeSentimentVolatility: async (_, { signalsInput }) => {
            return (0, strategicIntelligenceServices_1.runSentimentVolatility)(signalsInput);
        },
        analyzeStego: async (_, { mediaDataInput }) => {
            return (0, strategicIntelligenceServices_1.runStegoAnalyzer)(mediaDataInput);
        },
    },
};
//# sourceMappingURL=strategicIntelligenceResolvers.js.map