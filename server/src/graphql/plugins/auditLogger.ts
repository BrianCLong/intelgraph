import type {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from "@apollo/server";
import fs from "fs";
import axios from "axios";
import { isEqual } from "lodash";

const ELASTIC_URL = process.env.ELASTICSEARCH_URL;
const LOG_FILE = process.env.AUDIT_LOG_FILE || "audit-log.jsonl";
const ANONYMIZE = process.env.AUDIT_LOG_ANONYMIZE === "true";

const anonymize = (value: unknown): any => {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map(() => "[redacted]");
    }
    return Object.keys(value as Record<string, unknown>).reduce(
      (acc, key) => ({ ...acc, [key]: anonymize((value as any)[key]) }),
      {},
    );
  }
  return "[redacted]";
};

const auditLoggerPlugin: ApolloServerPlugin = {
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    const start = new Date();
    return {
      async willSendResponse(ctx) {
        const operation = ctx.operation;
        const userId = ctx.contextValue?.user?.id ?? null;

        if (ctx.contextValue?.audit?.action === "explanation_requested") {
          const logEntry = {
            timestamp: start.toISOString(),
            userId: ANONYMIZE ? anonymize(userId) : userId,
            action: "explanation_requested",
            traceId: ctx.contextValue.audit.traceId,
            input: ctx.contextValue.audit.input,
            latency: ctx.contextValue.audit.latency,
          };
          try {
            if (ELASTIC_URL) {
              await axios.post(`${ELASTIC_URL}/audit/_doc`, logEntry, {
                timeout: 2000,
              });
            } else {
              throw new Error("No Elasticsearch URL");
            }
          } catch (_err) {
            fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
          }
          return;
        }

        if (!operation || operation.operation !== "mutation") {
          return;
        }

        const entity =
          (operation.selectionSet.selections[0] as any)?.name?.value ||
          "unknown";

        const before = ctx.contextValue?.audit?.before;
        const after =
          ctx.contextValue?.audit?.after ||
          (ctx.response.body.kind === "single"
            ? (ctx.response.body.singleResult?.data as any)?.[entity]
            : undefined);

        const diff: Record<string, { before: unknown; after: unknown }> = {};
        if (
          before &&
          after &&
          typeof before === "object" &&
          typeof after === "object"
        ) {
          const keys = new Set([
            ...Object.keys(before as Record<string, unknown>),
            ...Object.keys(after as Record<string, unknown>),
          ]);
          for (const key of keys) {
            const b = (before as any)[key];
            const a = (after as any)[key];
            if (!isEqual(b, a)) {
              diff[key] = {
                before: ANONYMIZE ? anonymize(b) : b,
                after: ANONYMIZE ? anonymize(a) : a,
              };
            }
          }
        }

        const logEntry = {
          timestamp: start.toISOString(),
          userId: ANONYMIZE ? anonymize(userId) : userId,
          operation: operation.operation,
          entity,
          diff,
        };

        try {
          if (ELASTIC_URL) {
            await axios.post(`${ELASTIC_URL}/audit/_doc`, logEntry, {
              timeout: 2000,
            });
          } else {
            throw new Error("No Elasticsearch URL");
          }
        } catch (_err) {
          fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
        }
      },
    };
  },
};

export default auditLoggerPlugin;
