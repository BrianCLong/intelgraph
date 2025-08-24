"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(db) {
    await db.query("INSERT INTO schema_version (version) VALUES ('1.0.0') ON CONFLICT (version) DO NOTHING");
}
async function down(db) {
    await db.query("DELETE FROM schema_version WHERE version='1.0.0'");
}
//# sourceMappingURL=1.0.0_migration.js.map