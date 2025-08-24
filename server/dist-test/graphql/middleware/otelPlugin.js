"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelApolloPlugin = otelApolloPlugin;
const api_1 = require("@opentelemetry/api");
function otelApolloPlugin() {
    return {
        async requestDidStart() {
            const tracer = api_1.trace.getTracer('intelgraph-graphql');
            return {
                async executionDidStart() {
                    return {
                        willResolveField({ info }) {
                            const span = tracer.startSpan(`resolver ${info.parentType.name}.${info.fieldName}`);
                            const start = Date.now();
                            return (err) => {
                                if (err) {
                                    span.recordException(err);
                                    span.setStatus({ code: api_1.SpanStatusCode.ERROR });
                                }
                                span.setAttribute('graphql.type', info.returnType.toString());
                                span.setAttribute('graphql.path', info.path.key.toString());
                                span.end();
                            };
                        },
                    };
                },
            };
        },
    };
}
//# sourceMappingURL=otelPlugin.js.map