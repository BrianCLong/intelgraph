import fs from "fs";
import path from "path";

export function buildPersistedQueries() {
  const queries = { example: "query Example { ping }" };
  fs.writeFileSync(
    path.join("server", "src", "generated", "persisted-queries.json"),
    JSON.stringify(queries, null, 2),
  );
}

if (require.main === module) {
  buildPersistedQueries();
}
