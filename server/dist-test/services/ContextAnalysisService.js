const { NlpManager } = require("node-nlp");
const natural = require("natural");
const logger = require("../utils/logger");
class ContextAnalysisService {
    constructor() {
        this.nlpManager = new NlpManager({ languages: ["en"], forceNER: true });
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.tfidf = new natural.TfIdf();
        this.logger = logger;
        // Initialize entity patterns for intelligence analysis
        this.initializeEntityPatterns();
    }
    /**
     * Initialize NLP with intelligence-specific entity patterns
     */
    async initializeEntityPatterns() {
        try {
            // Add entity patterns for common intelligence entities
            this.nlpManager.addNamedEntityText("person", "John Doe", ["en"], ["John Doe"]);
            this.nlpManager.addNamedEntityText("organization", "CIA", ["en"], ["CIA", "Central Intelligence Agency"]);
            this.nlpManager.addNamedEntityText("location", "Washington DC", ["en"], ["Washington DC", "DC"]);
            this.nlpManager.addNamedEntityText("phone", "phone", ["en"], ["+1-555-123-4567", "555-123-4567"]);
            this.nlpManager.addNamedEntityText("email", "email", ["en"], ["john@example.com"]);
            this.nlpManager.addNamedEntityText("date", "date", ["en"], ["2025-01-01", "January 1st"]);
            // Train the NLP manager
            await this.nlpManager.train();
            this.logger.info("NLP Manager initialized and trained");
        }
        catch (error) {
            this.logger.error("Error initializing NLP patterns:", error);
        }
    }
    /**
     * Extract entities from text using NLP
     */
    async extractEntities(text) {
        try {
            const result = await this.nlpManager.process("en", text);
            // Enhanced entity extraction with custom patterns
            const entities = result.entities || [];
            const customEntities = this.extractCustomEntities(text);
            // Merge and deduplicate entities
            const allEntities = [...entities, ...customEntities];
            const uniqueEntities = this.deduplicateEntities(allEntities);
            return {
                entities: uniqueEntities,
                intent: result.intent,
                score: result.score,
                rawResult: result,
            };
        }
        catch (error) {
            this.logger.error("Error extracting entities:", error);
            throw error;
        }
    }
    /**
     * Extract custom entities using regex patterns
     */
    extractCustomEntities(text) {
        const entities = [];
        const patterns = {
            ip_address: {
                regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
                type: "ip_address",
            },
            phone_number: {
                regex: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
                type: "phone_number",
            },
            email: {
                regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                type: "email",
            },
            url: {
                regex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+. ~#?&//=]*)/g,
                type: "url",
            },
            ssn: {
                regex: /\b\d{3}-\d{2}-\d{4}\b/g,
                type: "ssn",
            },
            credit_card: {
                regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
                type: "credit_card",
            },
            coordinates: {
                regex: /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/g,
                type: "coordinates",
            },
            date: {
                regex: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g,
                type: "date",
            },
            time: {
                regex: /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?\b/g,
                type: "time",
            },
        };
        Object.keys(patterns).forEach((patternName) => {
            const pattern = patterns[patternName];
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                entities.push({
                    entity: pattern.type,
                    start: match.index,
                    end: match.index + match[0].length,
                    accuracy: 0.9,
                    sourceText: match[0],
                    utteranceText: text,
                    len: match[0].length,
                });
            }
        });
        return entities;
    }
    /**
     * Deduplicate extracted entities
     */
    deduplicateEntities(entities) {
        const seen = new Set();
        return entities.filter((entity) => {
            const key = `${entity.entity}-${entity.sourceText}-${entity.start}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    /**
     * Analyze text topics using TF-IDF
     */
    analyzeTopics(documents) {
        try {
            // Clear previous documents
            this.tfidf = new natural.TfIdf();
            // Add documents to TF-IDF
            documents.forEach((doc) => {
                this.tfidf.addDocument(doc);
            });
            const topics = [];
            documents.forEach((doc, index) => {
                const terms = [];
                this.tfidf
                    .listTerms(index)
                    .slice(0, 10)
                    .forEach((item) => {
                    terms.push({
                        term: item.term,
                        tfidf: item.tfidf,
                    });
                });
                topics.push({
                    documentIndex: index,
                    topTerms: terms,
                    document: doc.substring(0, 100) + (doc.length > 100 ? "..." : ""),
                });
            });
            return {
                topics,
                documentCount: documents.length,
            };
        }
        catch (error) {
            this.logger.error("Error analyzing topics:", error);
            throw error;
        }
    }
    /**
     * Extract key phrases from text
     */
    extractKeyPhrases(text, maxPhrases = 10) {
        try {
            const tokens = this.tokenizer.tokenize(text.toLowerCase());
            const stopWords = new Set([
                "the",
                "a",
                "an",
                "and",
                "or",
                "but",
                "in",
                "on",
                "at",
                "to",
                "for",
                "of",
                "with",
                "by",
                "is",
                "are",
                "was",
                "were",
                "be",
                "been",
                "have",
                "has",
                "had",
                "do",
                "does",
                "did",
                "will",
                "would",
                "could",
                "should",
            ]);
            // Filter out stop words and short words
            const meaningfulTokens = tokens.filter((token) => !stopWords.has(token) && token.length > 2);
            // Create n-grams (phrases)
            const nGrams = [];
            // Unigrams
            meaningfulTokens.forEach((token) => {
                nGrams.push(token);
            });
            // Bigrams
            for (let i = 0; i < meaningfulTokens.length - 1; i++) {
                nGrams.push(`${meaningfulTokens[i]} ${meaningfulTokens[i + 1]}`);
            }
            // Trigrams
            for (let i = 0; i < meaningfulTokens.length - 2; i++) {
                nGrams.push(`${meaningfulTokens[i]} ${meaningfulTokens[i + 1]} ${meaningfulTokens[i + 2]}`);
            }
            // Count frequency
            const phraseFreq = {};
            nGrams.forEach((phrase) => {
                phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
            });
            // Sort by frequency and return top phrases
            const keyPhrases = Object.entries(phraseFreq)
                .sort(([, a], [, b]) => b - a)
                .slice(0, maxPhrases)
                .map(([phrase, frequency]) => ({
                phrase,
                frequency,
                score: frequency / meaningfulTokens.length,
            }));
            return {
                keyPhrases,
                totalTokens: tokens.length,
                meaningfulTokens: meaningfulTokens.length,
            };
        }
        catch (error) {
            this.logger.error("Error extracting key phrases:", error);
            throw error;
        }
    }
    /**
     * Analyze text similarity
     */
    analyzeSimilarity(text1, text2) {
        try {
            const tokens1 = this.tokenizer.tokenize(text1.toLowerCase());
            const tokens2 = this.tokenizer.tokenize(text2.toLowerCase());
            // Jaccard similarity
            const set1 = new Set(tokens1);
            const set2 = new Set(tokens2);
            const intersection = new Set([...set1].filter((x) => set2.has(x)));
            const union = new Set([...set1, ...set2]);
            const jaccardSimilarity = intersection.size / union.size;
            // Cosine similarity using TF-IDF
            const documents = [text1, text2];
            const tfidf = new natural.TfIdf();
            documents.forEach((doc) => tfidf.addDocument(doc));
            const vector1 = [];
            const vector2 = [];
            const terms = new Set();
            tfidf.listTerms(0).forEach((item) => terms.add(item.term));
            tfidf.listTerms(1).forEach((item) => terms.add(item.term));
            terms.forEach((term) => {
                vector1.push(tfidf.tfidf(term, 0));
                vector2.push(tfidf.tfidf(term, 1));
            });
            const cosineSimilarity = this.calculateCosineSimilarity(vector1, vector2);
            return {
                jaccardSimilarity,
                cosineSimilarity,
                averageSimilarity: (jaccardSimilarity + cosineSimilarity) / 2,
                sharedTerms: intersection.size,
                uniqueTerms1: set1.size - intersection.size,
                uniqueTerms2: set2.size - intersection.size,
            };
        }
        catch (error) {
            this.logger.error("Error analyzing similarity:", error);
            throw error;
        }
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    calculateCosineSimilarity(vector1, vector2) {
        const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
        const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));
        if (magnitude1 === 0 || magnitude2 === 0)
            return 0;
        return dotProduct / (magnitude1 * magnitude2);
    }
    /**
     * Perform comprehensive text analysis
     */
    async performComprehensiveAnalysis(text) {
        try {
            const [entities, keyPhrases] = await Promise.all([
                this.extractEntities(text),
                Promise.resolve(this.extractKeyPhrases(text)),
            ]);
            // Language detection
            const language = "en"; // Placeholder for language detection
            // Text statistics
            const stats = this.calculateTextStatistics(text);
            return {
                entities,
                keyPhrases,
                language,
                statistics: stats,
                analysis: {
                    complexity: this.calculateTextComplexity(text),
                    readability: this.calculateReadabilityScore(text),
                    topics: this.identifyTopics(text),
                },
            };
        }
        catch (error) {
            this.logger.error("Error performing comprehensive analysis:", error);
            throw error;
        }
    }
    /**
     * Calculate text statistics
     */
    calculateTextStatistics(text) {
        const tokens = this.tokenizer.tokenize(text);
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        const words = tokens.filter((token) => /^[a-zA-Z]+$/.test(token));
        return {
            characterCount: text.length,
            wordCount: words.length,
            sentenceCount: sentences.length,
            averageWordsPerSentence: words.length / sentences.length || 0,
            averageCharactersPerWord: text.replace(/\s/g, "").length / words.length || 0,
            uniqueWords: new Set(words.map((w) => w.toLowerCase())).size,
            lexicalDiversity: new Set(words.map((w) => w.toLowerCase())).size / words.length || 0,
        };
    }
    /**
     * Calculate text complexity score
     */
    calculateTextComplexity(text) {
        const tokens = this.tokenizer.tokenize(text);
        const words = tokens.filter((token) => /^[a-zA-Z]+$/.test(token));
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length || 0;
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        const avgSentenceLength = words.length / sentences.length || 0;
        // Simple complexity score based on word and sentence length
        const complexityScore = avgWordLength * 0.3 + avgSentenceLength * 0.7;
        return {
            score: Math.min(10, complexityScore / 2), // Normalize to 0-10 scale
            averageWordLength: avgWordLength,
            averageSentenceLength: avgSentenceLength,
            level: complexityScore < 8
                ? "Simple"
                : complexityScore < 15
                    ? "Moderate"
                    : "Complex",
        };
    }
    /**
     * Calculate readability score (simplified Flesch-Kincaid)
     */
    calculateReadabilityScore(text) {
        const tokens = this.tokenizer.tokenize(text);
        const words = tokens.filter((token) => /^[a-zA-Z]+$/.test(token));
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        if (sentences.length === 0 || words.length === 0)
            return 0;
        const avgSentenceLength = words.length / sentences.length;
        const avgSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0) /
            words.length;
        // Simplified Flesch Reading Ease
        const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllables;
        return {
            score: Math.max(0, Math.min(100, score)),
            level: score >= 90
                ? "Very Easy"
                : score >= 80
                    ? "Easy"
                    : score >= 70
                        ? "Fairly Easy"
                        : score >= 60
                            ? "Standard"
                            : score >= 50
                                ? "Fairly Difficult"
                                : score >= 30
                                    ? "Difficult"
                                    : "Very Difficult",
        };
    }
    /**
     * Count syllables in a word (approximation)
     */
    countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3)
            return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
        word = word.replace(/^y/, "");
        const matches = word.match(/[aeiouy]{1,2}/g);
        return matches ? matches.length : 1;
    }
    /**
     * Identify topics in text
     */
    identifyTopics(text) {
        const keyPhrases = this.extractKeyPhrases(text, 5);
        // Intelligence-specific topic categories
        const topicCategories = {
            security: [
                "security",
                "threat",
                "risk",
                "vulnerability",
                "attack",
                "breach",
                "defense",
            ],
            military: [
                "military",
                "army",
                "navy",
                "air force",
                "troops",
                "deployment",
                "operation",
            ],
            political: [
                "government",
                "policy",
                "election",
                "political",
                "parliament",
                "congress",
            ],
            economic: [
                "economy",
                "trade",
                "market",
                "financial",
                "investment",
                "economic",
            ],
            social: [
                "social",
                "community",
                "people",
                "society",
                "cultural",
                "demographic",
            ],
            technology: [
                "technology",
                "cyber",
                "digital",
                "computer",
                "internet",
                "software",
            ],
        };
        const detectedTopics = {};
        const textLower = text.toLowerCase();
        Object.keys(topicCategories).forEach((category) => {
            const keywords = topicCategories[category];
            const matches = keywords.filter((keyword) => textLower.includes(keyword));
            if (matches.length > 0) {
                detectedTopics[category] = matches.length;
            }
        });
        return {
            categories: detectedTopics,
            dominantTopic: Object.keys(detectedTopics).reduce((a, b) => (detectedTopics[a] > detectedTopics[b] ? a : b), Object.keys(detectedTopics)[0]),
            topKeyPhrases: keyPhrases.keyPhrases.slice(0, 3),
        };
    }
}
module.exports = ContextAnalysisService;
//# sourceMappingURL=ContextAnalysisService.js.map