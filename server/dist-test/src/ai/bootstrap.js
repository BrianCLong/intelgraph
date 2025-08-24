"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installAI = installAI;
/**
 * One-time bootstrap wiring for AI module:
 * - Express route (webhook)
 * - Start approved-insight writer
 * - Initialize Redis caching
 * - Setup audit logging
 */
const aiWebhook_1 = __importDefault(require("../routes/aiWebhook"));
const approvedWriter_1 = require("../workers/approvedWriter");
const caching_1 = require("./caching");
const auditLogging_1 = require("./auditLogging");
function installAI(app, container) {
    // Ensure raw-body capture middleware exists upstream (see note in README)
    app.use(aiWebhook_1.default);
    // Initialize AI caching layer
    if (container.redis) {
        (0, caching_1.setupAICaching)(container.redis);
    }
    // Setup comprehensive audit logging
    (0, auditLogging_1.setupAIAuditLogging)(container.db);
    // Start background writer for approved insights
    (0, approvedWriter_1.startApprovedWriter)(container.db, container.neo4j).catch((error) => {
        console.error('Failed to start approved writer:', error);
    });
    console.log('IntelGraph AI module installed successfully');
}
//# sourceMappingURL=bootstrap.js.map