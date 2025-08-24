"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_js_1 = require("../../config/database.js");
const logger = logger.child({ name: 'investigationResolvers' });
const investigationResolvers = {
    Query: {
        investigation: async (_, { id }) => {
            logger.info(`Fetching investigation with ID: ${id} (placeholder)`);
            // Placeholder: In a real implementation, fetch investigation from PostgreSQL
            return {
                id: id,
                name: `Investigation ${id}`,
                description: `Description for investigation ${id}`,
                createdAt: new Date().toISOString(),
            };
        },
        investigations: async (_, { limit, offset }) => {
            logger.info(`Fetching investigations (placeholder) limit: ${limit}, offset: ${offset}`);
            // Placeholder: In a real implementation, fetch investigations from PostgreSQL with pagination
            return [
                { id: 'inv-1', name: 'Project Alpha', description: 'Initial investigation', createdAt: new Date().toISOString() },
                { id: 'inv-2', name: 'Project Beta', description: 'Follow-up investigation', createdAt: new Date().toISOString() },
            ];
        },
        auditTrace: async (_, { investigationId, filter }) => {
            logger.info(`Fetching audit trace for investigation ${investigationId}`);
            const pool = (0, database_js_1.getPostgresPool)();
            const params = [investigationId];
            const conditions = ["details->>'investigationId' = $1"];
            if (filter?.userId) {
                params.push(filter.userId);
                conditions.push(`user_id = $${params.length}`);
            }
            if (filter?.entityType) {
                params.push(filter.entityType);
                conditions.push(`resource_type = $${params.length}`);
            }
            if (filter?.from) {
                params.push(filter.from);
                conditions.push(`created_at >= $${params.length}`);
            }
            if (filter?.to) {
                params.push(filter.to);
                conditions.push(`created_at <= $${params.length}`);
            }
            const query = `
        SELECT id, user_id as "userId", action, resource_type as "resourceType",
               resource_id as "resourceId", details, details->>'investigationId' as "investigationId",
               created_at as "createdAt"
        FROM audit_logs
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at ASC`;
            const { rows } = await pool.query(query, params);
            return rows;
        },
    },
    Mutation: {
        createInvestigation: async (_, { input }) => {
            logger.info(`Creating investigation: ${input.name} (placeholder)`);
            // Placeholder: In a real implementation, create investigation in PostgreSQL
            return {
                id: 'new-inv-id',
                name: input.name,
                description: input.description,
                createdAt: new Date().toISOString(),
            };
        },
        updateInvestigation: async (_, { id, input }) => {
            logger.info(`Updating investigation ${id}: ${JSON.stringify(input)} (placeholder)`);
            // Placeholder: In a real implementation, update investigation in PostgreSQL
            return {
                id: id,
                name: input.name || `Investigation ${id}`,
                description: input.description || `Description for investigation ${id}`,
                updatedAt: new Date().toISOString(),
            };
        },
        deleteInvestigation: async (_, { id }) => {
            logger.info(`Deleting investigation: ${id} (placeholder)`);
            // Placeholder: In a real implementation, soft delete investigation in PostgreSQL
            return true;
        },
    },
};
exports.default = investigationResolvers;
//# sourceMappingURL=investigation.js.map