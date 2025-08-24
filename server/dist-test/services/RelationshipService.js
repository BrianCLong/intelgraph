const { getNeo4jDriver } = require("../config/database");
const logger = require("../utils/logger");
class RelationshipService {
    constructor() {
        this.logger = logger;
        // Define relationship type schemas
        this.relationshipTypes = {
            // Personal relationships
            FAMILY: {
                name: "FAMILY",
                category: "PERSONAL",
                description: "Family relationship",
                properties: ["relationship_type", "since", "degree"],
                constraints: ["Person->Person"],
                weight: 0.9,
            },
            FRIEND: {
                name: "FRIEND",
                category: "PERSONAL",
                description: "Friendship relationship",
                properties: ["since", "closeness", "frequency"],
                constraints: ["Person->Person"],
                weight: 0.7,
            },
            ROMANTIC: {
                name: "ROMANTIC",
                category: "PERSONAL",
                description: "Romantic relationship",
                properties: ["status", "since", "until"],
                constraints: ["Person->Person"],
                weight: 0.9,
            },
            // Professional relationships
            EMPLOYMENT: {
                name: "EMPLOYMENT",
                category: "PROFESSIONAL",
                description: "Employment relationship",
                properties: ["position", "department", "since", "until", "salary"],
                constraints: ["Person->Organization"],
                weight: 0.8,
            },
            PARTNERSHIP: {
                name: "PARTNERSHIP",
                category: "PROFESSIONAL",
                description: "Business partnership",
                properties: ["type", "since", "equity_share", "role"],
                constraints: ["Person->Organization", "Organization->Organization"],
                weight: 0.8,
            },
            LEADERSHIP: {
                name: "LEADERSHIP",
                category: "PROFESSIONAL",
                description: "Leadership or management relationship",
                properties: ["title", "since", "reports_count"],
                constraints: ["Person->Organization", "Person->Person"],
                weight: 0.9,
            },
            BOARD_MEMBER: {
                name: "BOARD_MEMBER",
                category: "PROFESSIONAL",
                description: "Board membership",
                properties: ["since", "committee", "compensation"],
                constraints: ["Person->Organization"],
                weight: 0.7,
            },
            // Financial relationships
            OWNERSHIP: {
                name: "OWNERSHIP",
                category: "FINANCIAL",
                description: "Ownership relationship",
                properties: ["percentage", "since", "type", "value"],
                constraints: [
                    "Person->Organization",
                    "Person->Asset",
                    "Organization->Asset",
                ],
                weight: 0.9,
            },
            INVESTMENT: {
                name: "INVESTMENT",
                category: "FINANCIAL",
                description: "Investment relationship",
                properties: ["amount", "date", "type", "return_rate"],
                constraints: ["Person->Organization", "Organization->Organization"],
                weight: 0.6,
            },
            LOAN: {
                name: "LOAN",
                category: "FINANCIAL",
                description: "Loan relationship",
                properties: ["amount", "interest_rate", "term", "status"],
                constraints: [
                    "Person->Person",
                    "Person->Organization",
                    "Organization->Organization",
                ],
                weight: 0.7,
            },
            TRANSACTION: {
                name: "TRANSACTION",
                category: "FINANCIAL",
                description: "Financial transaction",
                properties: ["amount", "date", "currency", "purpose"],
                constraints: [
                    "Person->Person",
                    "Person->Organization",
                    "Organization->Organization",
                ],
                weight: 0.5,
            },
            // Communication relationships
            COMMUNICATION: {
                name: "COMMUNICATION",
                category: "COMMUNICATION",
                description: "Communication relationship",
                properties: ["method", "frequency", "last_contact", "duration"],
                constraints: ["Person->Person", "Person->Organization"],
                weight: 0.4,
            },
            EMAIL: {
                name: "EMAIL",
                category: "COMMUNICATION",
                description: "Email communication",
                properties: ["subject", "date", "direction", "attachment_count"],
                constraints: ["Person->Person", "Person->Organization"],
                weight: 0.3,
            },
            PHONE_CALL: {
                name: "PHONE_CALL",
                category: "COMMUNICATION",
                description: "Phone communication",
                properties: ["duration", "date", "direction", "call_type"],
                constraints: ["Person->Person"],
                weight: 0.4,
            },
            MEETING: {
                name: "MEETING",
                category: "COMMUNICATION",
                description: "Meeting or encounter",
                properties: ["date", "location", "duration", "purpose"],
                constraints: ["Person->Person", "Person->Organization"],
                weight: 0.6,
            },
            // Location relationships
            LOCATED_AT: {
                name: "LOCATED_AT",
                category: "LOCATION",
                description: "Location relationship",
                properties: ["since", "until", "address", "type"],
                constraints: [
                    "Person->Location",
                    "Organization->Location",
                    "Asset->Location",
                ],
                weight: 0.5,
            },
            TRAVEL: {
                name: "TRAVEL",
                category: "LOCATION",
                description: "Travel relationship",
                properties: [
                    "departure_date",
                    "return_date",
                    "purpose",
                    "transportation",
                ],
                constraints: ["Person->Location"],
                weight: 0.4,
            },
            ORIGIN: {
                name: "ORIGIN",
                category: "LOCATION",
                description: "Place of origin",
                properties: ["birth_date", "citizenship", "duration"],
                constraints: ["Person->Location"],
                weight: 0.8,
            },
            // Legal relationships
            LEGAL_CASE: {
                name: "LEGAL_CASE",
                category: "LEGAL",
                description: "Legal case involvement",
                properties: ["case_number", "role", "status", "date"],
                constraints: ["Person->LegalCase", "Organization->LegalCase"],
                weight: 0.7,
            },
            CONTRACT: {
                name: "CONTRACT",
                category: "LEGAL",
                description: "Contractual relationship",
                properties: ["contract_type", "date", "value", "status"],
                constraints: [
                    "Person->Person",
                    "Person->Organization",
                    "Organization->Organization",
                ],
                weight: 0.8,
            },
            LICENSE: {
                name: "LICENSE",
                category: "LEGAL",
                description: "License or permit relationship",
                properties: ["license_type", "issue_date", "expiry_date", "status"],
                constraints: ["Person->Organization", "Organization->Organization"],
                weight: 0.6,
            },
            // Digital relationships
            ACCOUNT: {
                name: "ACCOUNT",
                category: "DIGITAL",
                description: "Digital account relationship",
                properties: ["platform", "username", "created_date", "status"],
                constraints: ["Person->Organization"],
                weight: 0.3,
            },
            DIGITAL_TRACE: {
                name: "DIGITAL_TRACE",
                category: "DIGITAL",
                description: "Digital footprint or trace",
                properties: ["ip_address", "timestamp", "device", "action"],
                constraints: ["Person->DigitalAsset", "Person->Location"],
                weight: 0.4,
            },
            // Intelligence specific
            SURVEILLANCE: {
                name: "SURVEILLANCE",
                category: "INTELLIGENCE",
                description: "Surveillance relationship",
                properties: ["method", "since", "until", "frequency", "classification"],
                constraints: [
                    "Person->Person",
                    "Person->Location",
                    "Person->Organization",
                ],
                weight: 0.8,
            },
            SUSPECT: {
                name: "SUSPECT",
                category: "INTELLIGENCE",
                description: "Suspicion relationship",
                properties: ["suspicion_level", "since", "reason", "status"],
                constraints: ["Person->Event", "Person->Organization"],
                weight: 0.9,
            },
            THREAT: {
                name: "THREAT",
                category: "INTELLIGENCE",
                description: "Threat relationship",
                properties: ["threat_level", "type", "since", "credibility"],
                constraints: [
                    "Person->Person",
                    "Person->Organization",
                    "Organization->Organization",
                ],
                weight: 1.0,
            },
        };
    }
    /**
     * Get all available relationship types
     */
    getRelationshipTypes() {
        return this.relationshipTypes;
    }
    /**
     * Get relationship types by category
     */
    getRelationshipTypesByCategory(category) {
        return Object.values(this.relationshipTypes).filter((type) => type.category === category);
    }
    /**
     * Validate relationship type and properties
     */
    validateRelationship(sourceType, relationshipType, targetType, properties = {}) {
        try {
            const relType = this.relationshipTypes[relationshipType];
            if (!relType) {
                throw new Error(`Invalid relationship type: ${relationshipType}`);
            }
            // Check if the relationship is valid between these entity types
            const constraint = `${sourceType}->${targetType}`;
            if (!relType.constraints.includes(constraint)) {
                // Check for bidirectional constraints
                const reverseConstraint = `${targetType}->${sourceType}`;
                if (!relType.constraints.includes(reverseConstraint)) {
                    throw new Error(`Invalid relationship ${relationshipType} between ${sourceType} and ${targetType}`);
                }
            }
            // Validate required properties
            const missingProperties = relType.properties.filter((prop) => prop.endsWith("*") && !(prop.slice(0, -1) in properties));
            if (missingProperties.length > 0) {
                throw new Error(`Missing required properties: ${missingProperties.join(", ")}`);
            }
            return {
                valid: true,
                relationshipType: relType,
                normalizedProperties: this.normalizeProperties(relType, properties),
            };
        }
        catch (error) {
            this.logger.error("Relationship validation error:", error);
            return { valid: false, error: error.message };
        }
    }
    /**
     * Normalize and validate properties
     */
    normalizeProperties(relationshipType, properties) {
        const normalized = { ...properties };
        // Add default weight if not provided
        if (!normalized.weight) {
            normalized.weight = relationshipType.weight;
        }
        // Add creation timestamp
        if (!normalized.created_at) {
            normalized.created_at = new Date().toISOString();
        }
        // Validate date properties
        relationshipType.properties.forEach((prop) => {
            if (prop.includes("date") && normalized[prop]) {
                try {
                    normalized[prop] = new Date(normalized[prop]).toISOString();
                }
                catch (error) {
                    this.logger.warn(`Invalid date format for property ${prop}:`, normalized[prop]);
                }
            }
        });
        return normalized;
    }
    /**
     * Create a relationship in Neo4j
     */
    async createRelationship(sourceId, targetId, relationshipType, properties = {}, options = {}) {
        const session = this.driver.session();
        try {
            // Validate relationship first
            const validation = this.validateRelationship(options.sourceType || "Entity", relationshipType, options.targetType || "Entity", properties);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            const normalizedProps = validation.normalizedProperties;
            const query = `
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        CREATE (source)-[r:${relationshipType} $properties]->(target)
        RETURN r, source, target
      `;
            const result = await session.run(query, {
                sourceId,
                targetId,
                properties: normalizedProps,
            });
            if (result.records.length === 0) {
                throw new Error("Failed to create relationship - nodes not found");
            }
            const record = result.records[0];
            const relationship = record.get("r");
            this.logger.info(`Created relationship: ${sourceId} -[${relationshipType}]-> ${targetId}`);
            return {
                id: relationship.identity.toString(),
                type: relationshipType,
                source: sourceId,
                target: targetId,
                properties: relationship.properties,
                created: true,
            };
        }
        catch (error) {
            this.logger.error("Error creating relationship:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Update relationship properties
     */
    async updateRelationship(relationshipId, properties) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH ()-[r]-()
        WHERE id(r) = $relationshipId
        SET r += $properties
        SET r.updated_at = datetime()
        RETURN r
      `;
            const result = await session.run(query, {
                relationshipId: parseInt(relationshipId),
                properties,
            });
            if (result.records.length === 0) {
                throw new Error("Relationship not found");
            }
            const relationship = result.records[0].get("r");
            this.logger.info(`Updated relationship: ${relationshipId}`);
            return {
                id: relationshipId,
                properties: relationship.properties,
                updated: true,
            };
        }
        catch (error) {
            this.logger.error("Error updating relationship:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Delete a relationship
     */
    async deleteRelationship(relationshipId) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH ()-[r]-()
        WHERE id(r) = $relationshipId
        DELETE r
        RETURN count(r) as deleted
      `;
            const result = await session.run(query, {
                relationshipId: parseInt(relationshipId),
            });
            const deleted = result.records[0].get("deleted").toNumber();
            if (deleted === 0) {
                throw new Error("Relationship not found");
            }
            this.logger.info(`Deleted relationship: ${relationshipId}`);
            return { deleted: true, count: deleted };
        }
        catch (error) {
            this.logger.error("Error deleting relationship:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find relationships by type
     */
    async findRelationshipsByType(relationshipType, limit = 100) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH (source)-[r:${relationshipType}]->(target)
        RETURN r, source, target
        LIMIT $limit
      `;
            const result = await session.run(query, { limit });
            return result.records.map((record) => ({
                id: record.get("r").identity.toString(),
                type: relationshipType,
                properties: record.get("r").properties,
                source: {
                    id: record.get("source").properties.id,
                    labels: record.get("source").labels,
                    properties: record.get("source").properties,
                },
                target: {
                    id: record.get("target").properties.id,
                    labels: record.get("target").labels,
                    properties: record.get("target").properties,
                },
            }));
        }
        catch (error) {
            this.logger.error("Error finding relationships by type:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find relationships between two entities
     */
    async findRelationshipsBetween(sourceId, targetId) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH (source {id: $sourceId})-[r]-(target {id: $targetId})
        RETURN r, type(r) as relType
      `;
            const result = await session.run(query, { sourceId, targetId });
            return result.records.map((record) => ({
                id: record.get("r").identity.toString(),
                type: record.get("relType"),
                properties: record.get("r").properties,
                source: sourceId,
                target: targetId,
            }));
        }
        catch (error) {
            this.logger.error("Error finding relationships between entities:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Analyze relationship patterns
     */
    async analyzeRelationshipPatterns(entityId, depth = 2) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH path = (start {id: $entityId})-[*1..${depth}]-()
        WITH path, relationships(path) as rels
        UNWIND rels as rel
        WITH type(rel) as relType, count(*) as frequency
        RETURN relType, frequency
        ORDER BY frequency DESC
      `;
            const result = await session.run(query, { entityId });
            const patterns = result.records.map((record) => ({
                relationshipType: record.get("relType"),
                frequency: record.get("frequency").toNumber(),
                category: this.relationshipTypes[record.get("relType")]?.category || "UNKNOWN",
            }));
            // Group by category
            const categoryAnalysis = {};
            patterns.forEach((pattern) => {
                if (!categoryAnalysis[pattern.category]) {
                    categoryAnalysis[pattern.category] = {
                        total: 0,
                        types: [],
                    };
                }
                categoryAnalysis[pattern.category].total += pattern.frequency;
                categoryAnalysis[pattern.category].types.push(pattern);
            });
            return {
                entityId,
                depth,
                patterns,
                categoryAnalysis,
                totalRelationships: patterns.reduce((sum, p) => sum + p.frequency, 0),
            };
        }
        catch (error) {
            this.logger.error("Error analyzing relationship patterns:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get relationship strength metrics
     */
    calculateRelationshipStrength(relationshipType, properties) {
        const baseWeight = this.relationshipTypes[relationshipType]?.weight || 0.5;
        let strengthModifiers = 1.0;
        // Temporal factors
        if (properties.since) {
            const duration = (Date.now() - new Date(properties.since)) / (1000 * 60 * 60 * 24 * 365); // years
            strengthModifiers *= Math.min(2.0, 1 + duration * 0.1); // Longer relationships are stronger
        }
        // Frequency factors
        if (properties.frequency) {
            const freqMap = {
                daily: 2.0,
                weekly: 1.5,
                monthly: 1.2,
                yearly: 0.8,
                rarely: 0.5,
            };
            strengthModifiers *= freqMap[properties.frequency] || 1.0;
        }
        // Value factors (for financial relationships)
        if (properties.amount || properties.value) {
            const value = parseFloat(properties.amount || properties.value);
            if (value > 1000000)
                strengthModifiers *= 1.5;
            else if (value > 100000)
                strengthModifiers *= 1.3;
            else if (value > 10000)
                strengthModifiers *= 1.1;
        }
        return Math.min(1.0, baseWeight * strengthModifiers);
    }
    /**
     * Initialize Neo4j driver
     */
    setDriver(driver) {
        this.driver = driver;
    }
    /**
     * Get relationship type schema
     */
    getRelationshipTypeSchema(relationshipType) {
        return this.relationshipTypes[relationshipType] || null;
    }
    /**
     * Suggest relationship types based on entity types
     */
    suggestRelationshipTypes(sourceType, targetType) {
        const suggestions = [];
        Object.values(this.relationshipTypes).forEach((relType) => {
            const constraint = `${sourceType}->${targetType}`;
            const reverseConstraint = `${targetType}->${sourceType}`;
            if (relType.constraints.includes(constraint) ||
                relType.constraints.includes(reverseConstraint)) {
                suggestions.push({
                    type: relType.name,
                    category: relType.category,
                    description: relType.description,
                    weight: relType.weight,
                });
            }
        });
        return suggestions.sort((a, b) => b.weight - a.weight);
    }
}
module.exports = RelationshipService;
//# sourceMappingURL=RelationshipService.js.map