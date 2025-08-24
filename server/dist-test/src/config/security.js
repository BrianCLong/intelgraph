"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pbacRoles = exports.jwtIssuer = void 0;
exports.jwtIssuer = process.env.JWT_ISSUER || "intelgraph";
exports.pbacRoles = {
    analyst: ["read:investigations", "read:graph"],
    admin: ["*"],
};
//# sourceMappingURL=security.js.map