export async function up(db: any) {
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_version (version TEXT PRIMARY KEY)",
  );
}
export async function down(db: any) {
  await db.query("DROP TABLE IF EXISTS schema_version");
}
