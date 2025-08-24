"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEntities = resolveEntities;
const path_1 = __importDefault(require("path"));
const python_shell_1 = require("python-shell");
const logger_1 = __importDefault(require("../config/logger"));
const uuid_1 = require("uuid");
const log = logger_1.default.child({ name: "HybridEntityResolutionService" });
async function resolveEntities(a, b) {
    const traceId = (0, uuid_1.v4)();
    const script = path_1.default.join(process.cwd(), "ml", "er", "api.py");
    const result = await python_shell_1.PythonShell.run(script, {
        args: [a, b],
        pythonOptions: ["-u"],
    });
    const parsed = JSON.parse(result[0]);
    log.info({ traceId, features: parsed.explanation }, "er_match");
    return { ...parsed, traceId };
}
//# sourceMappingURL=HybridEntityResolutionService.js.map