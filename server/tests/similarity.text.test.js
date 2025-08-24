"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
test('similarEntities by text', async () => {
    const q = `{ similarEntities(text:"banking fraud", topK:5){ id score } }`;
    const r = await (0, supertest_1.default)(process.env.API_URL).post('/graphql')
        .set('Authorization', 'Bearer test')
        .send({ query: q });
    expect(r.status).toBe(200);
    expect(r.body.data.similarEntities.length).toBeLessThanOrEqual(5);
});
//# sourceMappingURL=similarity.text.test.js.map