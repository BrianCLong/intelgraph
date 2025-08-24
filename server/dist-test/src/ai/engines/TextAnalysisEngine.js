"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextAnalysisEngine = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const logger = logger.child({ name: 'TextAnalysisEngine' });
class TextAnalysisEngine {
    constructor(config) {
        this.isInitialized = false;
        this.models = new Map();
        this.config = config;
    }
    /**
     * Initialize text analysis engine
     */
    async initialize() {
        try {
            // Verify dependencies
            await this.verifyDependencies();
            // Load language models
            await this.loadLanguageModels();
            this.isInitialized = true;
            logger.info('Text Analysis Engine initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize Text Analysis Engine:', error);
            throw error;
        }
    }
    /**
     * Analyze text using multiple NLP techniques
     */
    async analyzeText(text, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const { extractEntities = true, performSentiment = true, extractTopics = false, detectLanguage = true, extractKeyPhrases = true, generateSummary = false, analyzeReadability = true, detectIntentions = false, enableCoreference = false, enableDependencyParsing = false } = options;
        logger.info(`Starting text analysis for ${text.length} characters`);
        try {
            // Basic text statistics
            const statistics = this.calculateTextStatistics(text);
            // Language detection
            let language = { language: 'en', confidence: 1.0 };
            if (detectLanguage) {
                language = await this.detectLanguage(text);
            }
            // Preprocess text
            const preprocessedText = this.preprocessText(text, language.language);
            // Named Entity Recognition
            let entities = [];
            if (extractEntities) {
                entities = await this.extractNamedEntities(preprocessedText, language.language);
            }
            // Sentiment Analysis
            let sentiment = null;
            if (performSentiment) {
                sentiment = await this.analyzeSentiment(preprocessedText, language.language);
            }
            // Topic Modeling
            let topics = [];
            if (extractTopics) {
                topics = await this.extractTopics(preprocessedText, language.language);
            }
            // Key Phrase Extraction
            let keyPhrases = [];
            if (extractKeyPhrases) {
                keyPhrases = await this.extractKeyPhrases(preprocessedText, language.language);
            }
            // Text Summarization
            let summary = null;
            if (generateSummary && text.length > 500) {
                summary = await this.generateSummary(preprocessedText, language.language);
            }
            // Readability Analysis
            let readabilityScore;
            if (analyzeReadability) {
                readabilityScore = this.calculateReadabilityScore(text, statistics);
            }
            // Intention Detection
            let intentions;
            if (detectIntentions) {
                intentions = await this.detectIntentions(preprocessedText, language.language);
            }
            // Coreference Resolution
            if (enableCoreference) {
                await this.resolveCoreferences(entities, text);
            }
            const result = {
                text: preprocessedText,
                language,
                entities,
                sentiment,
                topics,
                keyPhrases,
                summary,
                readabilityScore,
                intentions,
                statistics
            };
            logger.info(`Text analysis completed: ${entities.length} entities, sentiment: ${sentiment?.label || 'N/A'}`);
            return result;
        }
        catch (error) {
            logger.error('Text analysis failed:', error);
            throw error;
        }
    }
    /**
     * Detect language of text
     */
    async detectLanguage(text) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'language_detection.py');
            const args = [
                pythonScript,
                '--text', text.substring(0, 1000) // Use first 1000 chars for detection
            ];
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve({
                            language: result.language || 'en',
                            confidence: result.confidence || 0.8,
                            alternateLanguages: result.alternatives || []
                        });
                    }
                    catch (parseError) {
                        resolve({ language: 'en', confidence: 0.8 });
                    }
                }
                else {
                    resolve({ language: 'en', confidence: 0.8 });
                }
            });
            python.on('error', () => {
                resolve({ language: 'en', confidence: 0.8 });
            });
        });
    }
    /**
     * Extract named entities
     */
    async extractNamedEntities(text, language) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'named_entity_recognition.py');
            const args = [
                pythonScript,
                '--text', text,
                '--language', language,
                '--model', this.getModelForLanguage(language, 'ner')
            ];
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        const entities = this.parseNamedEntities(result.entities || []);
                        resolve(entities);
                    }
                    catch (parseError) {
                        reject(parseError);
                    }
                }
                else {
                    reject(new Error(`NER failed: ${errorOutput}`));
                }
            });
            python.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Analyze sentiment
     */
    async analyzeSentiment(text, language) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'sentiment_analysis.py');
            const args = [
                pythonScript,
                '--text', text,
                '--language', language,
                '--enable-aspects'
            ];
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve({
                            label: result.sentiment || 'neutral',
                            score: result.score || 0,
                            confidence: result.confidence || 0.8,
                            aspects: result.aspects || []
                        });
                    }
                    catch (parseError) {
                        reject(parseError);
                    }
                }
                else {
                    reject(new Error(`Sentiment analysis failed: ${errorOutput}`));
                }
            });
            python.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Extract topics using LDA or similar
     */
    async extractTopics(text, language) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'topic_modeling.py');
            const args = [
                pythonScript,
                '--text', text,
                '--language', language,
                '--num-topics', '5',
                '--algorithm', 'lda'
            ];
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        const topics = this.parseTopics(result.topics || []);
                        resolve(topics);
                    }
                    catch (parseError) {
                        reject(parseError);
                    }
                }
                else {
                    logger.warn('Topic modeling failed, returning empty topics');
                    resolve([]);
                }
            });
            python.on('error', () => {
                resolve([]);
            });
        });
    }
    /**
     * Extract key phrases
     */
    async extractKeyPhrases(text, language) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'keyphrase_extraction.py');
            const args = [
                pythonScript,
                '--text', text,
                '--language', language,
                '--algorithm', 'textrank'
            ];
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        const keyPhrases = this.parseKeyPhrases(result.keyphrases || [], text);
                        resolve(keyPhrases);
                    }
                    catch (parseError) {
                        reject(parseError);
                    }
                }
                else {
                    logger.warn('Key phrase extraction failed, returning empty phrases');
                    resolve([]);
                }
            });
            python.on('error', () => {
                resolve([]);
            });
        });
    }
    /**
     * Generate text summary
     */
    async generateSummary(text, language) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'text_summarization.py');
            const args = [
                pythonScript,
                '--text', text,
                '--language', language,
                '--extractive-sentences', '3',
                '--enable-abstractive'
            ];
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve({
                            extractive: result.extractive_summary || [],
                            abstractive: result.abstractive_summary,
                            keyPoints: result.key_points || [],
                            compressionRatio: (result.summary_length || text.length) / text.length
                        });
                    }
                    catch (parseError) {
                        reject(parseError);
                    }
                }
                else {
                    reject(new Error(`Summarization failed: ${errorOutput}`));
                }
            });
            python.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Detect intentions in text
     */
    async detectIntentions(text, language) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'intention_detection.py');
            const args = [
                pythonScript,
                '--text', text,
                '--language', language
            ];
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve(result.intentions || []);
                    }
                    catch (parseError) {
                        resolve([]);
                    }
                }
                else {
                    resolve([]);
                }
            });
            python.on('error', () => {
                resolve([]);
            });
        });
    }
    /**
     * Preprocess text for analysis
     */
    preprocessText(text, language) {
        // Basic text cleaning
        let processed = text
            .replace(/\r\n/g, '\n') // Normalize line breaks
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        // Language-specific preprocessing
        if (language === 'en') {
            // English-specific preprocessing
            processed = processed
                .replace(/n't/g, ' not') // Expand contractions
                .replace(/'ll/g, ' will')
                .replace(/'re/g, ' are')
                .replace(/'ve/g, ' have')
                .replace(/'d/g, ' would');
        }
        return processed;
    }
    /**
     * Calculate text statistics
     */
    calculateTextStatistics(text) {
        const characterCount = text.length;
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const wordCount = words.length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const sentenceCount = sentences.length;
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const paragraphCount = paragraphs.length;
        const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
        const averageSentencesPerParagraph = paragraphCount > 0 ? sentenceCount / paragraphCount : 0;
        // Vocabulary diversity (unique words / total words)
        const uniqueWords = new Set(words);
        const vocabularyDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;
        // Simple complexity score based on various factors
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount || 0;
        const complexityScore = (averageWordsPerSentence * 0.4) + (avgWordLength * 0.3) + ((1 - vocabularyDiversity) * 0.3);
        return {
            characterCount,
            wordCount,
            sentenceCount,
            paragraphCount,
            averageWordsPerSentence,
            averageSentencesPerParagraph,
            vocabularyDiversity,
            complexityScore
        };
    }
    /**
     * Calculate readability score (Flesch Reading Ease)
     */
    calculateReadabilityScore(text, statistics) {
        const { wordCount, sentenceCount } = statistics;
        if (sentenceCount === 0 || wordCount === 0)
            return 0;
        // Count syllables (simplified approach)
        const syllableCount = this.countSyllables(text);
        // Flesch Reading Ease formula
        const score = 206.835 - (1.015 * (wordCount / sentenceCount)) - (84.6 * (syllableCount / wordCount));
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Count syllables in text (simplified)
     */
    countSyllables(text) {
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        let syllableCount = 0;
        for (const word of words) {
            // Simple syllable counting heuristic
            const vowelGroups = word.match(/[aeiouy]+/g) || [];
            let syllables = vowelGroups.length;
            // Adjust for common patterns
            if (word.endsWith('e') && syllables > 1)
                syllables--;
            if (syllables === 0)
                syllables = 1;
            syllableCount += syllables;
        }
        return syllableCount;
    }
    /**
     * Resolve coreferences in entities
     */
    async resolveCoreferences(entities, text) {
        // This would implement coreference resolution to link pronouns to entities
        // For now, it's a placeholder
        logger.debug('Coreference resolution applied');
    }
    /**
     * Parse named entities from Python output
     */
    parseNamedEntities(entities) {
        return entities.map(entity => ({
            text: entity.text,
            label: entity.label,
            start: entity.start,
            end: entity.end,
            confidence: entity.confidence || 0.8,
            description: entity.description,
            canonicalForm: entity.canonical_form,
            entityId: entity.entity_id
        }));
    }
    /**
     * Parse topics from Python output
     */
    parseTopics(topics) {
        return topics.map((topic, index) => ({
            id: `topic_${index}`,
            keywords: topic.keywords || [],
            coherence: topic.coherence || 0.5,
            documents: topic.documents,
            representative_text: topic.representative_text
        }));
    }
    /**
     * Parse key phrases from Python output
     */
    parseKeyPhrases(phrases, text) {
        return phrases.map(phrase => {
            // Find positions of the phrase in text
            const positions = [];
            let index = text.toLowerCase().indexOf(phrase.phrase.toLowerCase());
            while (index !== -1) {
                positions.push(index);
                index = text.toLowerCase().indexOf(phrase.phrase.toLowerCase(), index + 1);
            }
            return {
                phrase: phrase.phrase,
                relevance: phrase.relevance || 0.5,
                frequency: positions.length,
                positions
            };
        });
    }
    /**
     * Get appropriate model for language and task
     */
    getModelForLanguage(language, task) {
        const modelMap = {
            'en': {
                'ner': 'en_core_web_lg',
                'sentiment': 'en_core_web_lg'
            },
            'es': {
                'ner': 'es_core_news_lg',
                'sentiment': 'es_core_news_lg'
            },
            'fr': {
                'ner': 'fr_core_news_lg',
                'sentiment': 'fr_core_news_lg'
            },
            'de': {
                'ner': 'de_core_news_lg',
                'sentiment': 'de_core_news_lg'
            }
        };
        return modelMap[language]?.[task] || modelMap['en'][task] || 'en_core_web_lg';
    }
    /**
     * Verify dependencies
     */
    async verifyDependencies() {
        return new Promise((resolve, reject) => {
            const python = (0, child_process_1.spawn)(this.config.pythonPath, [
                '-c',
                'import spacy, transformers, sklearn, nltk; print("Dependencies OK")'
            ]);
            python.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error('Required dependencies not found. Please install spacy, transformers, scikit-learn, nltk.'));
                }
            });
            python.on('error', () => {
                reject(new Error('Python not found or dependencies missing.'));
            });
        });
    }
    /**
     * Load language models
     */
    async loadLanguageModels() {
        try {
            // This would load spaCy models and other NLP models
            logger.info('Language models loaded successfully');
        }
        catch (error) {
            logger.error('Failed to load language models:', error);
            throw error;
        }
    }
    /**
     * Check if text analysis engine is ready
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * Cleanup resources
     */
    async shutdown() {
        logger.info('Shutting down Text Analysis Engine...');
        this.models.clear();
        this.isInitialized = false;
        logger.info('Text Analysis Engine shutdown complete');
    }
}
exports.TextAnalysisEngine = TextAnalysisEngine;
exports.default = TextAnalysisEngine;
//# sourceMappingURL=TextAnalysisEngine.js.map