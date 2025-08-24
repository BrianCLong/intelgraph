"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPORT_SENSITIVE = exports.EXPORT_COMPRESSION = void 0;
exports.exportToSplunk = exportToSplunk;
exports.EXPORT_COMPRESSION = process.env.EXPORT_COMPRESSION !== "false";
exports.EXPORT_SENSITIVE = process.env.ENABLE_SENSITIVE_EXPORTS === "true";
function exportToSplunk(payload) {
    if (exports.EXPORT_SENSITIVE) {
        // send full payload
    }
    // compression flag would be used here
}
//# sourceMappingURL=exporter.js.map