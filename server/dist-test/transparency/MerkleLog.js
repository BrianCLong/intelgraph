"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleLog = void 0;
const crypto_1 = __importDefault(require("crypto"));
class MerkleLog {
    constructor() {
        this.entries = [];
    }
    append(entry) {
        this.entries.push(entry);
    }
    size() {
        return this.entries.length;
    }
    root() {
        return crypto_1.default.createHash('sha256').update(this.entries.join('')).digest('hex');
    }
}
exports.MerkleLog = MerkleLog;
//# sourceMappingURL=MerkleLog.js.map