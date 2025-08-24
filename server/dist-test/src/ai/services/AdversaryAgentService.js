"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdversaryAgentService = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../config/logger"));
class AdversaryAgentService {
    constructor(pythonPath = process.env.PYTHON_PATH || "python", modelsPath = path_1.default.join(process.cwd(), "server", "src", "ai", "models")) {
        this.logger = logger_1.default.child({ name: "AdversaryAgentService" });
        this.pythonPath = pythonPath;
        this.modelsPath = modelsPath;
    }
    async generateChain(context, options = {}) {
        return new Promise((resolve, reject) => {
            const script = path_1.default.join(this.modelsPath, "adversary_agent.py");
            const args = [
                script,
                "--context",
                JSON.stringify(context),
                "--temperature",
                String(options.temperature ?? 0.7),
                "--persistence",
                String(options.persistence ?? 3),
            ];
            const proc = (0, child_process_1.spawn)(this.pythonPath, args);
            let output = "";
            let error = "";
            proc.stdout.on("data", (d) => {
                output += d.toString();
            });
            proc.stderr.on("data", (d) => {
                error += d.toString();
            });
            proc.on("close", (code) => {
                if (code === 0) {
                    try {
                        const data = JSON.parse(output);
                        resolve(data);
                    }
                    catch (err) {
                        reject(err);
                    }
                }
                else {
                    reject(new Error(error || "adversary agent failed"));
                }
            });
            proc.on("error", (err) => reject(err));
        });
    }
}
exports.AdversaryAgentService = AdversaryAgentService;
exports.default = AdversaryAgentService;
//# sourceMappingURL=AdversaryAgentService.js.map