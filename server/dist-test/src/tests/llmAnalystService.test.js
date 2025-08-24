"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LLMAnalystService_1 = __importDefault(require("../services/LLMAnalystService"));
class MockLLMService {
    async complete() {
        return "mock-response";
    }
}
describe("LLMAnalystService", () => {
    it("creates products pending approval and allows approval", async () => {
        const service = new LLMAnalystService_1.default(new MockLLMService());
        const result = await service.summarizeIntelligence({ nodes: [] }, { threat: "test" });
        expect(result.status).toBe("PENDING");
        expect(service.listPending()).toHaveLength(1);
        const approved = service.approveProduct(result.id);
        expect(approved.status).toBe("APPROVED");
    });
});
//# sourceMappingURL=llmAnalystService.test.js.map