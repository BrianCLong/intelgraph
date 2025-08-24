"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
function rateLimiter({ windowMs = 60000, max = 60 }) {
    return (0, express_rate_limit_1.default)({ windowMs, max });
}
//# sourceMappingURL=rateLimiting.js.map