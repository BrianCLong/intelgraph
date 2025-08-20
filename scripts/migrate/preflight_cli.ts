import { preflightCheck } from "../../server/src/migrations/preflight";

(async () => {
  const result = await preflightCheck({
    neo4jUri: process.env.NEO4J_URI || "neo4j://localhost",
  });
  if (!result.ok) {
    console.error("Preflight failed");
    process.exit(1);
  }
  console.log("Preflight checks:", result.checks.join(","));
})();
