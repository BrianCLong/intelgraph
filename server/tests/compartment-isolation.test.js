"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const withAuthAndPolicy_1 = require("../src/middleware/withAuthAndPolicy");
describe("compartment-aware investigation isolation", () => {
    const baseUser = {
        id: "u1",
        email: "user@example.com",
        roles: ["analyst"],
        permissions: [],
        orgId: "org-1",
        teamId: "team-1",
    };
    it("allows access within same org and team", async () => {
        const resolver = (0, withAuthAndPolicy_1.withAuthAndPolicy)("read", () => ({
            type: "investigation",
            id: "inv-1",
            orgId: "org-1",
            teamId: "team-1",
        }))(async () => "ok");
        const result = await resolver({}, {}, { user: baseUser }, { fieldName: "test", path: "testPath" });
        expect(result).toBe("ok");
    });
    it("denies access when org differs", async () => {
        const resolver = (0, withAuthAndPolicy_1.withAuthAndPolicy)("read", () => ({
            type: "investigation",
            id: "inv-1",
            orgId: "org-2",
        }))(async () => "ok");
        await expect(resolver({}, {}, { user: baseUser }, { fieldName: "test", path: "testPath" })).rejects.toThrow(apollo_server_express_1.ForbiddenError);
    });
    it("denies access when team differs", async () => {
        const resolver = (0, withAuthAndPolicy_1.withAuthAndPolicy)("read", () => ({
            type: "investigation",
            id: "inv-1",
            orgId: "org-1",
            teamId: "team-2",
        }))(async () => "ok");
        await expect(resolver({}, {}, { user: baseUser }, { fieldName: "test", path: "testPath" })).rejects.toThrow(apollo_server_express_1.ForbiddenError);
    });
});
//# sourceMappingURL=compartment-isolation.test.js.map