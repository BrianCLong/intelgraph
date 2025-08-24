"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantEvent = exports.RELATIONSHIP_DELETED = exports.RELATIONSHIP_UPDATED = exports.RELATIONSHIP_CREATED = exports.ENTITY_DELETED = exports.ENTITY_UPDATED = exports.ENTITY_CREATED = exports.pubsub = void 0;
const ordered_pubsub_1 = __importDefault(require("./ordered-pubsub"));
const withTenant_js_1 = require("../middleware/withTenant.js");
const logger = logger.child({ name: 'subscriptions' });
exports.pubsub = new ordered_pubsub_1.default();
exports.ENTITY_CREATED = "ENTITY_CREATED";
exports.ENTITY_UPDATED = "ENTITY_UPDATED";
exports.ENTITY_DELETED = "ENTITY_DELETED";
exports.RELATIONSHIP_CREATED = "RELATIONSHIP_CREATED";
exports.RELATIONSHIP_UPDATED = "RELATIONSHIP_UPDATED";
exports.RELATIONSHIP_DELETED = "RELATIONSHIP_DELETED";
const tenantEvent = (base, tenantId) => `${base}_${tenantId}`;
exports.tenantEvent = tenantEvent;
const subscriptionResolvers = {
    Subscription: {
        entityCreated: {
            subscribe: (_, __, context) => {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                return exports.pubsub.asyncIterator([(0, exports.tenantEvent)(exports.ENTITY_CREATED, tenantId)]);
            },
            resolve: (event) => {
                const { payload } = event;
                logger.info({ payload }, "Resolving entityCreated subscription");
                return payload;
            },
        },
        entityUpdated: {
            subscribe: (_, __, context) => {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                return exports.pubsub.asyncIterator([(0, exports.tenantEvent)(exports.ENTITY_UPDATED, tenantId)]);
            },
            resolve: (event) => {
                const { payload } = event;
                logger.info({ payload }, "Resolving entityUpdated subscription");
                return payload;
            },
        },
        entityDeleted: {
            subscribe: (_, __, context) => {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                return exports.pubsub.asyncIterator([(0, exports.tenantEvent)(exports.ENTITY_DELETED, tenantId)]);
            },
            resolve: (event) => {
                const { payload } = event;
                logger.info({ payload }, "Resolving entityDeleted subscription");
                return payload;
            },
        },
        relationshipCreated: {
            subscribe: (_, __, context) => {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                return exports.pubsub.asyncIterator([
                    (0, exports.tenantEvent)(exports.RELATIONSHIP_CREATED, tenantId),
                ]);
            },
            resolve: (event) => {
                const { payload } = event;
                logger.info({ payload }, "Resolving relationshipCreated subscription");
                return payload;
            },
        },
        relationshipUpdated: {
            subscribe: (_, __, context) => {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                return exports.pubsub.asyncIterator([
                    (0, exports.tenantEvent)(exports.RELATIONSHIP_UPDATED, tenantId),
                ]);
            },
            resolve: (event) => {
                const { payload } = event;
                logger.info({ payload }, "Resolving relationshipUpdated subscription");
                return payload;
            },
        },
        relationshipDeleted: {
            subscribe: (_, __, context) => {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                return exports.pubsub.asyncIterator([
                    (0, exports.tenantEvent)(exports.RELATIONSHIP_DELETED, tenantId),
                ]);
            },
            resolve: (event) => {
                const { payload } = event;
                logger.info({ payload }, "Resolving relationshipDeleted subscription");
                return payload;
            },
        },
        // Placeholder for aiRecommendationUpdated
        aiRecommendationUpdated: {
            subscribe: () => exports.pubsub.asyncIterator(["AI_RECOMMENDATION_UPDATED"]),
            resolve: (event) => {
                const { payload } = event;
                logger.info({ payload }, "Resolving aiRecommendationUpdated subscription");
                return payload;
            },
        },
    },
};
exports.default = subscriptionResolvers;
//# sourceMappingURL=subscriptions.js.map