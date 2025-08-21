import logger from '../config/logger';
import OrderedPubSub from "./ordered-pubsub";
import { requireTenant } from "../middleware/withTenant.js";

const logger = logger.child({ name: 'subscriptions' });
export const pubsub = new OrderedPubSub();

export const ENTITY_CREATED = "ENTITY_CREATED";
export const ENTITY_UPDATED = "ENTITY_UPDATED";
export const ENTITY_DELETED = "ENTITY_DELETED";
export const RELATIONSHIP_CREATED = "RELATIONSHIP_CREATED";
export const RELATIONSHIP_UPDATED = "RELATIONSHIP_UPDATED";
export const RELATIONSHIP_DELETED = "RELATIONSHIP_DELETED";

export const tenantEvent = (base: string, tenantId: string): string =>
  `${base}_${tenantId}`;

const subscriptionResolvers = {
  Subscription: {
    entityCreated: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(ENTITY_CREATED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, "Resolving entityCreated subscription");
        return payload;
      },
    },
    entityUpdated: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(ENTITY_UPDATED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, "Resolving entityUpdated subscription");
        return payload;
      },
    },
    entityDeleted: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([tenantEvent(ENTITY_DELETED, tenantId)]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, "Resolving entityDeleted subscription");
        return payload;
      },
    },
    relationshipCreated: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([
          tenantEvent(RELATIONSHIP_CREATED, tenantId),
        ]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, "Resolving relationshipCreated subscription");
        return payload;
      },
    },
    relationshipUpdated: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([
          tenantEvent(RELATIONSHIP_UPDATED, tenantId),
        ]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, "Resolving relationshipUpdated subscription");
        return payload;
      },
    },
    relationshipDeleted: {
      subscribe: (_: any, __: any, context: any) => {
        const tenantId = requireTenant(context);
        return pubsub.asyncIterator([
          tenantEvent(RELATIONSHIP_DELETED, tenantId),
        ]);
      },
      resolve: (event: any) => {
        const { payload } = event;
        logger.info({ payload }, "Resolving relationshipDeleted subscription");
        return payload;
      },
    },
    // Placeholder for aiRecommendationUpdated
    aiRecommendationUpdated: {
      subscribe: () => pubsub.asyncIterator(["AI_RECOMMENDATION_UPDATED"]),
      resolve: (event: any) => {
        const { payload } = event;
        logger.info(
          { payload },
          "Resolving aiRecommendationUpdated subscription",
        );
        return payload;
      },
    },
  },
};

export default subscriptionResolvers;
