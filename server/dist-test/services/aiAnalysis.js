"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisService = exports.AIAnalysisService = void 0;
const logger = logger.child({ name: 'aiAnalysisService' });
/**
 * AI-powered text analysis for entity extraction and relationship detection
 * Uses pattern matching and NLP techniques for demonstration
 */
class AIAnalysisService {
    constructor() {
        this.entityPatterns = {
            PERSON: [
                /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, // John Doe pattern
                /\b(Mr\.?|Mrs\.?|Dr\.?|Prof\.?) ([A-Z][a-z]+)\b/g, // Title + Name
                /\b([A-Z][a-z]+), ([A-Z][a-z]+)\b/g // LastName, FirstName
            ],
            ORGANIZATION: [
                /\b([A-Z][a-z]+ Inc\.?|Corp\.?|LLC|Ltd\.?)\b/g,
                /\b([A-Z][A-Za-z\s]+ Company)\b/g,
                /\b([A-Z][A-Za-z\s]+ Corporation)\b/g,
                /\b(Microsoft|Apple|Google|Amazon|Meta|Tesla|OpenAI)\b/g
            ],
            LOCATION: [
                /\b([A-Z][a-z]+ City)\b/g,
                /\b(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Washington|Boston|El Paso|Nashville|Detroit|Oklahoma City|Portland|Las Vegas|Memphis|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Mesa|Kansas City|Atlanta|Long Beach|Colorado Springs|Raleigh|Miami|Virginia Beach|Omaha|Oakland|Minneapolis|Tulsa|Arlington|Tampa|New Orleans)\b/g,
                /\b([A-Z][a-z]+, [A-Z]{2})\b/g // City, State
            ],
            EVENT: [
                /\b(meeting|conference|summit|workshop|seminar|presentation|training|interview)\b/gi,
                /\b([A-Z][a-z]+ Meeting)\b/g,
                /\b([0-9]{4} [A-Z][a-z]+ Conference)\b/g
            ],
            DATE: [
                /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
                /\b(\d{4}-\d{2}-\d{2})\b/g,
                /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/g
            ],
            EMAIL: [
                /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g
            ],
            PHONE: [
                /\b(\(\d{3}\)\s?\d{3}-\d{4})\b/g,
                /\b(\d{3}-\d{3}-\d{4})\b/g,
                /\b(\+\d{1,3}\s?\d{3}\s?\d{3}\s?\d{4})\b/g
            ]
        };
        this.relationshipPatterns = [
            {
                pattern: /(\w+(?:\s+\w+)*)\s+(works\s+(?:at|for)|employed\s+(?:by|at))\s+(\w+(?:\s+\w+)*)/gi,
                type: 'EMPLOYED_BY'
            },
            {
                pattern: /(\w+(?:\s+\w+)*)\s+(is\s+(?:the\s+)?(?:CEO|CTO|CFO|President|Manager|Director))\s+(?:of\s+)?(\w+(?:\s+\w+)*)/gi,
                type: 'LEADS'
            },
            {
                pattern: /(\w+(?:\s+\w+)*)\s+(met\s+with|meeting\s+with|talked\s+to)\s+(\w+(?:\s+\w+)*)/gi,
                type: 'MET_WITH'
            },
            {
                pattern: /(\w+(?:\s+\w+)*)\s+(located\s+in|based\s+in|from)\s+(\w+(?:\s+\w+)*)/gi,
                type: 'LOCATED_IN'
            },
            {
                pattern: /(\w+(?:\s+\w+)*)\s+(owns|founded|created)\s+(\w+(?:\s+\w+)*)/gi,
                type: 'OWNS'
            },
            {
                pattern: /(\w+(?:\s+\w+)*)\s+and\s+(\w+(?:\s+\w+)*)\s+(are\s+)?(?:partners|collaborated|working\s+together)/gi,
                type: 'COLLABORATES_WITH'
            }
        ];
    }
    /**
     * Extract entities from text using pattern matching and NLP
     */
    async extractEntities(text, options = {}) {
        try {
            const entities = [];
            const relationships = [];
            // Extract entities using patterns
            for (const [entityType, patterns] of Object.entries(this.entityPatterns)) {
                for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                        const entityText = match[1] || match[0];
                        const confidence = this.calculateEntityConfidence(entityText, entityType);
                        if (confidence >= (options.confidenceThreshold || 0.7)) {
                            entities.push({
                                text: entityText.trim(),
                                label: entityType,
                                confidence,
                                start: match.index,
                                end: match.index + match[0].length
                            });
                        }
                    }
                }
            }
            // Extract relationships if requested
            if (options.extractRelationships) {
                for (const relationPattern of this.relationshipPatterns) {
                    let match;
                    while ((match = relationPattern.pattern.exec(text)) !== null) {
                        const source = match[1]?.trim();
                        const target = match[3]?.trim();
                        if (source && target) {
                            relationships.push({
                                source,
                                target,
                                type: relationPattern.type,
                                confidence: 0.8
                            });
                        }
                    }
                }
            }
            // Remove duplicates and sort by confidence
            const uniqueEntities = this.deduplicateEntities(entities);
            const uniqueRelationships = this.deduplicateRelationships(relationships);
            logger.info(`AI Analysis completed. Entities Found: ${uniqueEntities.length}, Relationships Found: ${uniqueRelationships.length}, Text Length: ${text.length}`);
            return {
                entities: uniqueEntities.sort((a, b) => b.confidence - a.confidence),
                relationships: uniqueRelationships.sort((a, b) => b.confidence - a.confidence)
            };
        }
        catch (error) {
            logger.error(`AI Analysis failed. Error: ${error.message}`);
            return { entities: [], relationships: [] };
        }
    }
    /**
     * Analyze entity relationships in a given text
     */
    async analyzeRelationships(entities, text) {
        const relationships = [];
        // Check for co-occurrence relationships
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];
                const cooccurrenceContext = this.findCooccurrenceContext(entity1, entity2, text);
                if (cooccurrenceContext) {
                    relationships.push({
                        source: entity1,
                        target: entity2,
                        type: 'RELATED_TO',
                        confidence: 0.6,
                        context: cooccurrenceContext
                    });
                }
            }
        }
        // Apply semantic relationship patterns
        for (const relationPattern of this.relationshipPatterns) {
            let match;
            const regex = new RegExp(relationPattern.pattern.source, 'gi');
            while ((match = regex.exec(text)) !== null) {
                const source = match[1]?.trim();
                const target = match[3]?.trim();
                if (source && target && entities.includes(source) && entities.includes(target)) {
                    relationships.push({
                        source,
                        target,
                        type: relationPattern.type,
                        confidence: 0.85,
                        context: match[0]
                    });
                }
            }
        }
        return relationships.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Generate entity insights and suggestions
     */
    async generateEntityInsights(entityId, entityType, properties) {
        const insights = [];
        const suggestedRelationships = [];
        const riskFactors = [];
        // Generate type-specific insights
        switch (entityType) {
            case 'PERSON':
                if (properties.email?.endsWith('.gov')) {
                    insights.push('Government employee - requires additional compliance checks');
                    riskFactors.push({
                        factor: 'Government Affiliation',
                        severity: 'medium',
                        description: 'Subject may be bound by government regulations'
                    });
                }
                if (properties.role?.toLowerCase().includes('ceo')) {
                    insights.push('Executive-level position - high influence potential');
                    suggestedRelationships.push({
                        type: 'LEADS',
                        reason: 'CEO role suggests organizational leadership',
                        confidence: 0.9
                    });
                }
                break;
            case 'ORGANIZATION':
                if (properties.industry === 'Finance') {
                    insights.push('Financial sector - subject to regulatory oversight');
                    riskFactors.push({
                        factor: 'Financial Regulations',
                        severity: 'high',
                        description: 'Subject to banking and financial compliance requirements'
                    });
                }
                break;
            case 'EVENT':
                if (properties.importance === 'HIGH') {
                    insights.push('High-priority event - likely involves key stakeholders');
                    suggestedRelationships.push({
                        type: 'ATTENDED_BY',
                        reason: 'High-importance events typically have executive attendance',
                        confidence: 0.8
                    });
                }
                break;
        }
        return { insights, suggestedRelationships, riskFactors };
    }
    /**
     * Sentiment analysis for text content
     */
    async analyzeSentiment(text) {
        // Simple sentiment analysis using keyword matching
        const positiveWords = ['good', 'great', 'excellent', 'success', 'win', 'achieve', 'positive', 'benefit'];
        const negativeWords = ['bad', 'terrible', 'fail', 'loss', 'negative', 'problem', 'issue', 'concern'];
        const words = text.toLowerCase().split(/\W+/);
        let positiveScore = 0;
        let negativeScore = 0;
        const foundKeywords = [];
        for (const word of words) {
            if (positiveWords.includes(word)) {
                positiveScore++;
                foundKeywords.push(word);
            }
            else if (negativeWords.includes(word)) {
                negativeScore++;
                foundKeywords.push(word);
            }
        }
        let sentiment = 'neutral';
        let confidence = 0.5;
        if (positiveScore > negativeScore) {
            sentiment = 'positive';
            confidence = Math.min(0.9, 0.5 + (positiveScore - negativeScore) / words.length * 2);
        }
        else if (negativeScore > positiveScore) {
            sentiment = 'negative';
            confidence = Math.min(0.9, 0.5 + (negativeScore - positiveScore) / words.length * 2);
        }
        return { sentiment, confidence, keywords: foundKeywords };
    }
    /**
     * Calculate confidence score for entity extraction
     */
    calculateEntityConfidence(entityText, entityType) {
        let confidence = 0.7; // Base confidence
        // Adjust based on length and complexity
        if (entityText.length > 20)
            confidence -= 0.1;
        if (entityText.includes('.'))
            confidence += 0.1; // Abbreviations
        if (entityText.match(/^[A-Z]/))
            confidence += 0.1; // Proper capitalization
        // Type-specific adjustments
        switch (entityType) {
            case 'EMAIL':
                confidence = entityText.includes('@') ? 0.95 : 0.3;
                break;
            case 'PHONE':
                confidence = entityText.match(/\d{3}.*\d{3}.*\d{4}/) ? 0.9 : 0.4;
                break;
            case 'DATE':
                confidence = 0.85;
                break;
        }
        return Math.max(0.1, Math.min(0.99, confidence));
    }
    /**
     * Remove duplicate entities
     */
    deduplicateEntities(entities) {
        const seen = new Set();
        return entities.filter(entity => {
            const key = `${entity.text.toLowerCase()}-${entity.label}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    /**
     * Remove duplicate relationships
     */
    deduplicateRelationships(relationships) {
        const seen = new Set();
        return relationships.filter(rel => {
            const key = `${rel.source.toLowerCase()}-${rel.type}-${rel.target.toLowerCase()}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    /**
     * Find context where two entities co-occur
     */
    findCooccurrenceContext(entity1, entity2, text) {
        const sentences = text.split(/[.!?]+/);
        for (const sentence of sentences) {
            if (sentence.toLowerCase().includes(entity1.toLowerCase()) &&
                sentence.toLowerCase().includes(entity2.toLowerCase())) {
                return sentence.trim();
            }
        }
        // Check within word distance
        const words = text.split(/\s+/);
        const entity1Indices = [];
        const entity2Indices = [];
        for (let i = 0; i < words.length; i++) {
            if (words[i].toLowerCase().includes(entity1.toLowerCase())) {
                entity1Indices.push(i);
            }
            if (words[i].toLowerCase().includes(entity2.toLowerCase())) {
                entity2Indices.push(i);
            }
        }
        // Find closest co-occurrence within 10 words
        for (const idx1 of entity1Indices) {
            for (const idx2 of entity2Indices) {
                if (Math.abs(idx1 - idx2) <= 10) {
                    const start = Math.max(0, Math.min(idx1, idx2) - 5);
                    const end = Math.min(words.length, Math.max(idx1, idx2) + 5);
                    return words.slice(start, end).join(' ');
                }
            }
        }
        return null;
    }
}
exports.AIAnalysisService = AIAnalysisService;
// Export singleton instance
exports.aiAnalysisService = new AIAnalysisService();
//# sourceMappingURL=aiAnalysis.js.map