"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyResolvers = void 0;
const AuthService_js_1 = __importDefault(require("../../services/AuthService.js"));
const graphql_subscriptions_1 = require("graphql-subscriptions");
const uuid_1 = require("uuid");
const neo4j_js_1 = require("../../db/neo4j.js");
const postgres_js_1 = require("../../db/postgres.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const crypto_1 = __importDefault(require("crypto"));
const relationship_js_1 = __importDefault(require("./resolvers/relationship.js"));
const pubsub = new graphql_subscriptions_1.PubSub();
const authService = new AuthService_js_1.default();
const goals = []; // replace with DB later
let seq = 1;
exports.legacyResolvers = {
    Mutation: {
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
        },
        createInvestigation: async (_, { input }, { user }) => {
            if (!user)
                throw new Error('Not authenticated');
            const driver = (0, neo4j_js_1.getNeo4jDriver)();
            const session = driver.session();
            try {
                const id = (0, uuid_1.v4)();
                const now = new Date().toISOString();
                const result = await session.run(`CREATE (i:Investigation {
             id: $id,
             title: $title,
             description: $description,
             status: 'DRAFT',
             priority: $priority,
             tags: $tags,
             metadata: $metadata,
             entityCount: 0,
             relationshipCount: 0,
             createdBy: $createdBy,
             createdAt: datetime($now),
             updatedAt: datetime($now)
           })
           RETURN i`, {
                    id,
                    title: input.title,
                    description: input.description || null,
                    priority: input.priority || 'MEDIUM',
                    tags: JSON.stringify(input.tags || []),
                    metadata: JSON.stringify(input.metadata || {}),
                    createdBy: user.id,
                    now
                });
                const investigation = result.records[0].get('i').properties;
                logger_js_1.default.info(`Investigation created: ${id} by user ${user.id}`);
                return {
                    ...investigation,
                    createdBy: user,
                    assignedTo: []
                };
            }
            finally {
                await session.close();
            }
        },
        createEntity: async (_, { input }, { user }) => {
            if (!user)
                throw new Error('Not authenticated');
            const driver = (0, neo4j_js_1.getNeo4jDriver)();
            const session = driver.session();
            const pgPool = (0, postgres_js_1.getPostgresPool)();
            try {
                const id = (0, uuid_1.v4)();
                const now = new Date().toISOString();
                const result = await session.run(`CREATE (e:Entity {
             id: $id,
             type: $type,
             label: $label,
             description: $description,
             properties: $properties,
             confidence: $confidence,
             source: $source,
             investigationId: $investigationId,
             createdBy: $createdBy,
             createdAt: datetime($now),
             updatedAt: datetime($now)
           })
           RETURN e`, {
                    id,
                    type: input.type,
                    label: input.label,
                    description: input.description || null,
                    properties: JSON.stringify(input.properties || {}),
                    confidence: input.confidence || 1.0,
                    source: input.source || 'user_input',
                    investigationId: input.investigationId,
                    createdBy: user.id,
                    now
                });
                const entity = result.records[0].get('e').properties;
                // Audit log
                const payloadHash = crypto_1.default.createHash('sha256').update(JSON.stringify(input)).digest('hex');
                const auditLogQuery = 'INSERT INTO "AuditLog" (user_id, timestamp, entity_type, payload_hash) VALUES ($1, $2, $3, $4)';
                await pgPool.query(auditLogQuery, [user.id, now, 'Evidence', payloadHash]);
                // Publish subscription
                pubsub.publish('ENTITY_CREATED', {
                    entityCreated: entity,
                    investigationId: input.investigationId
                });
                logger_js_1.default.info(`Entity created: ${id} by user ${user.id}`);
                return entity;
            }
            finally {
                await session.close();
            }
        },
        importEntitiesFromText: async (_, { investigationId, text }, { user }) => {
            if (!user)
                throw new Error('Not authenticated');
            // Simple entity extraction
            const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const phonePattern = /\b(?:\+?1[-.\ s]?)\(?[2-9][0-8][0-9]\)?[-.\ s]?[2-9][0-9]{2}[-.\ s]?[0-9]{4}\b/g;
            const entities = [];
            const emails = text.match(emailPattern) || [];
            emails.forEach(email => {
                entities.push({
                    id: (0, uuid_1.v4)(),
                    uuid: (0, uuid_1.v4)(),
                    type: 'EMAIL',
                    label: email,
                    description: 'Extracted from text',
                    properties: { extractedFrom: 'text' },
                    confidence: 0.8,
                    source: 'text_extraction',
                    verified: false,
                    createdBy: user,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            });
            const phones = text.match(phonePattern) || [];
            phones.forEach(phone => {
                entities.push({
                    id: (0, uuid_1.v4)(),
                    uuid: (0, uuid_1.v4)(),
                    type: 'PHONE',
                    label: phone,
                    description: 'Extracted from text',
                    properties: { extractedFrom: 'text' },
                    confidence: 0.8,
                    source: 'text_extraction',
                    verified: false,
                    createdBy: user,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            });
            return entities;
        },
        generateEntitiesFromText: async (_, { investigationId, text }, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Not authenticated');
            const namePattern = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g;
            const names = Array.from(new Set(text.match(namePattern) || []));
            const entities = [];
            for (const label of names) {
                const entity = await exports.legacyResolvers.Mutation.createEntity(_, {
                    input: { type: 'PERSON', label, investigationId },
                }, context);
                entities.push(entity);
            }
            const relationships = [];
            for (let i = 0; i < entities.length; i++) {
                for (let j = i + 1; j < entities.length; j++) {
                    const rel = await relationship_js_1.default.Mutation.createRelationship(_, {
                        input: {
                            from: entities[i].id,
                            to: entities[j].id,
                            type: 'RELATED_TO',
                            props: {},
                        },
                    }, context);
                    relationships.push(rel);
                }
            }
            return { entities, relationships };
        },
    },
};
//# sourceMappingURL=legacy.js.map