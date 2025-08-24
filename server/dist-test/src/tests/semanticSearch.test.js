"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SemanticSearchService_1 = __importDefault(require("../services/SemanticSearchService"));
describe("SemanticSearchService", () => {
    class MockEmbeddingService {
        async generateEmbedding({ text }) {
            return [text.includes("threat") ? 1 : 0];
        }
    }
    class MockWeaviateClient {
        constructor() {
            this.docs = [];
            this.data = {
                creator: () => {
                    const ctx = this;
                    const record = {};
                    return {
                        withClassName(name) {
                            record.className = name;
                            return this;
                        },
                        withId(id) {
                            record.id = id;
                            return this;
                        },
                        withVector(vector) {
                            record.vector = vector;
                            return this;
                        },
                        withProperties(props) {
                            record.props = props;
                            return this;
                        },
                        async do() {
                            ctx.docs.push(record);
                        },
                    };
                },
            };
            this.graphql = {
                get: () => {
                    const ctx = this;
                    const query = { limit: 10 };
                    return {
                        withClassName(name) {
                            query.className = name;
                            return this;
                        },
                        withFields(_f) {
                            return this;
                        },
                        withNearVector(nv) {
                            query.nearVector = nv;
                            return this;
                        },
                        withWhere(where) {
                            query.where = where;
                            return this;
                        },
                        withLimit(limit) {
                            query.limit = limit;
                            return this;
                        },
                        async do() {
                            let items = ctx.docs;
                            if (query.where?.operands) {
                                for (const op of query.where.operands) {
                                    const field = op.path[0];
                                    const val = op.valueString ?? op.valueInt ?? op.valueDate;
                                    if (op.operator === "Equal") {
                                        items = items.filter((d) => d.props[field] === val);
                                    }
                                    else if (op.operator === "GreaterThanEqual") {
                                        items = items.filter((d) => d.props[field] >= val);
                                    }
                                    else if (op.operator === "LessThanEqual") {
                                        items = items.filter((d) => d.props[field] <= val);
                                    }
                                }
                            }
                            items = items
                                .map((d) => ({
                                ...d.props,
                                _additional: {
                                    distance: Math.abs(d.vector[0] - query.nearVector.vector[0]),
                                },
                            }))
                                .sort((a, b) => a._additional.distance - b._additional.distance)
                                .slice(0, query.limit);
                            const data = {};
                            data[query.className] = items;
                            return { data: { Get: data } };
                        },
                    };
                },
            };
        }
    }
    it("performs search with metadata filters", async () => {
        const client = new MockWeaviateClient();
        const service = new SemanticSearchService_1.default(client, new MockEmbeddingService());
        await service.indexDocument({
            id: "1",
            text: "threat report one",
            source: "OSINT",
            date: "2024-01-01",
            threatLevel: 3,
            graphId: "e1",
        });
        await service.indexDocument({
            id: "2",
            text: "benign report",
            source: "OSINT",
            date: "2024-01-02",
            threatLevel: 1,
            graphId: "e2",
        });
        const results = await service.search("threat", {
            source: "OSINT",
            threatLevel: 3,
        });
        expect(results).toHaveLength(1);
        expect(results[0].metadata.graphId).toBe("e1");
    });
});
//# sourceMappingURL=semanticSearch.test.js.map