"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flagsmith = void 0;
exports.isEnabled = isEnabled;
const flagsmith_nodejs_1 = __importDefault(require("flagsmith-nodejs"));
exports.flagsmith = new flagsmith_nodejs_1.default({
    environmentKey: process.env.FLAGSMITH_ENV_KEY,
    apiUrl: process.env.FLAGSMITH_API_URL || 'https://edge.api.flagsmith.com/api/v1/',
});
async function isEnabled(flag) {
    const state = await exports.flagsmith.getEnvironmentFlags();
    return state.isFeatureEnabled(flag);
}
//# sourceMappingURL=flagsmith.js.map