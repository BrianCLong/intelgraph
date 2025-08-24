"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runThreatCorrelation = runThreatCorrelation;
exports.runWargameOptimizer = runWargameOptimizer;
exports.runSentimentVolatility = runSentimentVolatility;
exports.runStegoAnalyzer = runStegoAnalyzer;
const axios_1 = __importDefault(require("axios")); // Existing dep
const AI_SERVER_URL = 'http://ai-server:8000'; // Docker service name and port
async function runThreatCorrelation(osintData) {
    try {
        const response = await axios_1.default.post(`${AI_SERVER_URL}/threat_correlation`, osintData);
        return response.data;
    }
    catch (error) {
        console.error('Error running threat correlation:', error.message);
        throw new Error(`Failed to run threat correlation: ${error.message}`);
    }
}
async function runWargameOptimizer(logs) {
    try {
        const response = await axios_1.default.post(`${AI_SERVER_URL}/wargame_optimizer`, logs);
        return response.data;
    }
    catch (error) {
        console.error('Error running wargame optimizer:', error.message);
        throw new Error(`Failed to run wargame optimizer: ${error.message}`);
    }
}
async function runSentimentVolatility(signals) {
    try {
        const response = await axios_1.default.post(`${AI_SERVER_URL}/sentiment_volatility`, signals);
        return response.data;
    }
    catch (error) {
        console.error('Error running sentiment volatility:', error.message);
        throw new Error(`Failed to run sentiment volatility: ${error.message}`);
    }
}
async function runStegoAnalyzer(mediaData) {
    try {
        const response = await axios_1.default.post(`${AI_SERVER_URL}/stego_analyzer`, mediaData);
        return response.data;
    }
    catch (error) {
        console.error('Error running stego analyzer:', error.message);
        throw new Error(`Failed to run stego analyzer: ${error.message}`);
    }
}
//# sourceMappingURL=strategicIntelligenceServices.js.map