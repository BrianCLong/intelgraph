const Sentiment = require("sentiment");
const natural = require("natural");
const logger = require("../utils/logger");
class SentimentService {
    constructor() {
        this.sentiment = new Sentiment();
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.logger = logger;
        // Custom words and phrases for intelligence analysis context
        this.customWords = {
            threat: -3,
            suspicious: -2,
            hostile: -3,
            enemy: -3,
            danger: -2,
            risk: -1,
            concern: -1,
            warning: -2,
            alert: -2,
            secure: 2,
            safe: 2,
            trusted: 2,
            ally: 2,
            friendly: 1,
            positive: 1,
            negative: -1,
            critical: -2,
            urgent: -1,
            emergency: -3,
        };
        // Add custom words to sentiment analyzer
        this.sentiment.registerLanguage("en", {
            labels: this.customWords,
        });
    }
    /**
     * Analyze sentiment of text
     */
    analyzeSentiment(text) {
        try {
            if (!text || typeof text !== "string") {
                throw new Error("Invalid text input");
            }
            const result = this.sentiment.analyze(text);
            // Normalize score to -1 to 1 range
            const normalizedScore = Math.max(-1, Math.min(1, result.score / 10));
            // Determine sentiment category
            let category;
            if (normalizedScore > 0.1) {
                category = "positive";
            }
            else if (normalizedScore < -0.1) {
                category = "negative";
            }
            else {
                category = "neutral";
            }
            // Calculate confidence based on token count and score magnitude
            const confidence = Math.min(1, Math.abs(normalizedScore) + result.tokens.length / 100);
            return {
                score: normalizedScore,
                category,
                confidence,
                rawScore: result.score,
                positiveWords: result.positive,
                negativeWords: result.negative,
                tokenCount: result.tokens.length,
                wordCount: this.tokenizer.tokenize(text).length,
            };
        }
        catch (error) {
            this.logger.error("Error analyzing sentiment:", error);
            throw error;
        }
    }
    /**
     * Analyze sentiment across multiple texts
     */
    analyzeBatchSentiment(texts) {
        try {
            const results = texts.map((text, index) => ({
                index,
                text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
                sentiment: this.analyzeSentiment(text),
            }));
            // Calculate aggregate metrics
            const scores = results.map((r) => r.sentiment.score);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            const scoreVariance = this.calculateVariance(scores);
            const categories = results.map((r) => r.sentiment.category);
            const categoryDistribution = {
                positive: categories.filter((c) => c === "positive").length,
                negative: categories.filter((c) => c === "negative").length,
                neutral: categories.filter((c) => c === "neutral").length,
            };
            return {
                results,
                aggregate: {
                    averageScore: avgScore,
                    scoreVariance,
                    categoryDistribution,
                    totalTexts: texts.length,
                    overallSentiment: avgScore > 0.1
                        ? "positive"
                        : avgScore < -0.1
                            ? "negative"
                            : "neutral",
                },
            };
        }
        catch (error) {
            this.logger.error("Error analyzing batch sentiment:", error);
            throw error;
        }
    }
    /**
     * Extract emotional indicators from text
     */
    extractEmotionalIndicators(text) {
        try {
            const tokens = this.tokenizer.tokenize(text.toLowerCase());
            // Emotion categories
            const emotions = {
                anger: [
                    "angry",
                    "rage",
                    "furious",
                    "mad",
                    "irritated",
                    "hostile",
                    "aggravated",
                ],
                fear: [
                    "afraid",
                    "scared",
                    "terrified",
                    "anxious",
                    "worried",
                    "nervous",
                    "panic",
                ],
                joy: [
                    "happy",
                    "joyful",
                    "excited",
                    "cheerful",
                    "delighted",
                    "pleased",
                    "glad",
                ],
                sadness: [
                    "sad",
                    "depressed",
                    "upset",
                    "disappointed",
                    "miserable",
                    "grief",
                ],
                surprise: ["surprised", "shocked", "amazed", "astonished", "stunned"],
                disgust: ["disgusted", "revolted", "repulsed", "sickened"],
                trust: ["trust", "confident", "secure", "reliable", "dependable"],
                anticipation: [
                    "excited",
                    "eager",
                    "hopeful",
                    "optimistic",
                    "expecting",
                ],
            };
            const detectedEmotions = {};
            const emotionalWords = [];
            Object.keys(emotions).forEach((emotion) => {
                const matches = tokens.filter((token) => emotions[emotion].some((emotionWord) => token.includes(emotionWord) || emotionWord.includes(token)));
                if (matches.length > 0) {
                    detectedEmotions[emotion] = matches.length;
                    emotionalWords.push(...matches);
                }
            });
            // Calculate dominant emotion
            const dominantEmotion = Object.keys(detectedEmotions).reduce((a, b) => (detectedEmotions[a] > detectedEmotions[b] ? a : b), Object.keys(detectedEmotions)[0]);
            return {
                emotions: detectedEmotions,
                dominantEmotion,
                emotionalWords: [...new Set(emotionalWords)], // Remove duplicates
                emotionalIntensity: emotionalWords.length / tokens.length,
            };
        }
        catch (error) {
            this.logger.error("Error extracting emotional indicators:", error);
            throw error;
        }
    }
    /**
     * Analyze sentiment trends over time
     */
    analyzeSentimentTrends(timeSeriesData) {
        try {
            const sentiments = timeSeriesData.map((item) => ({
                timestamp: item.timestamp,
                text: item.text,
                sentiment: this.analyzeSentiment(item.text),
            }));
            // Sort by timestamp
            sentiments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            // Calculate moving averages
            const windowSize = Math.min(5, sentiments.length);
            const movingAverages = [];
            for (let i = windowSize - 1; i < sentiments.length; i++) {
                const window = sentiments.slice(i - windowSize + 1, i + 1);
                const avgScore = window.reduce((sum, item) => sum + item.sentiment.score, 0) /
                    window.length;
                movingAverages.push({
                    timestamp: sentiments[i].timestamp,
                    movingAverage: avgScore,
                });
            }
            // Detect trend direction
            const recentAverage = movingAverages
                .slice(-3)
                .reduce((sum, item) => sum + item.movingAverage, 0) / 3;
            const earlierAverage = movingAverages
                .slice(0, 3)
                .reduce((sum, item) => sum + item.movingAverage, 0) / 3;
            let trend = "stable";
            if (recentAverage > earlierAverage + 0.1) {
                trend = "improving";
            }
            else if (recentAverage < earlierAverage - 0.1) {
                trend = "declining";
            }
            return {
                sentiments,
                movingAverages,
                trend,
                trendStrength: Math.abs(recentAverage - earlierAverage),
                overallChange: recentAverage - earlierAverage,
            };
        }
        catch (error) {
            this.logger.error("Error analyzing sentiment trends:", error);
            throw error;
        }
    }
    /**
     * Calculate variance helper method
     */
    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
            values.length;
        return variance;
    }
    /**
     * Get sentiment summary for reporting
     */
    getSentimentSummary(analysisResult) {
        try {
            const { score, category, confidence } = analysisResult;
            let interpretation = "";
            if (category === "positive") {
                interpretation =
                    confidence > 0.7
                        ? "Strongly positive sentiment detected"
                        : "Moderately positive sentiment detected";
            }
            else if (category === "negative") {
                interpretation =
                    confidence > 0.7
                        ? "Strongly negative sentiment detected"
                        : "Moderately negative sentiment detected";
            }
            else {
                interpretation = "Neutral sentiment detected";
            }
            return {
                interpretation,
                recommendation: this.getRecommendation(category, confidence),
                alertLevel: this.getAlertLevel(score, confidence),
            };
        }
        catch (error) {
            this.logger.error("Error generating sentiment summary:", error);
            throw error;
        }
    }
    /**
     * Get recommendation based on sentiment analysis
     */
    getRecommendation(category, confidence) {
        if (category === "negative" && confidence > 0.6) {
            return "Consider monitoring for potential issues or escalation";
        }
        else if (category === "positive" && confidence > 0.6) {
            return "Positive indicators present, continue monitoring";
        }
        else {
            return "Sentiment unclear, additional context may be needed";
        }
    }
    /**
     * Get alert level for operational use
     */
    getAlertLevel(score, confidence) {
        if (score < -0.5 && confidence > 0.7) {
            return "HIGH";
        }
        else if (score < -0.2 && confidence > 0.5) {
            return "MEDIUM";
        }
        else {
            return "LOW";
        }
    }
}
module.exports = SentimentService;
//# sourceMappingURL=SentimentService.js.map