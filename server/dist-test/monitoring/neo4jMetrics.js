const neo4j = require("neo4j-driver");
const { metrics } = require("./metrics");
async function collectNeo4jMetrics() {
    let driver;
    let session;
    try {
        driver = neo4j.driver(process.env.NEO4J_URI || "bolt://localhost:7687", neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "password"), { connectionTimeout: 5000 });
        session = driver.session();
        const result = await session.run("CALL dbms.queryJmx('java.lang:type=Memory') YIELD attributes RETURN attributes");
        const attrs = result.records[0]?.get("attributes");
        if (Array.isArray(attrs)) {
            const heap = attrs.find((a) => a.key === "HeapMemoryUsage")?.value;
            if (heap) {
                const used = heap.used?.toNumber ? heap.used.toNumber() : heap.used;
                const committed = heap.committed?.toNumber
                    ? heap.committed.toNumber()
                    : heap.committed;
                metrics.neo4jMemoryUsage.labels("heap_used").set(used);
                metrics.neo4jMemoryUsage.labels("heap_committed").set(committed);
            }
        }
    }
    catch (err) {
        // swallow errors to avoid crashing the process
    }
    finally {
        if (session)
            await session.close();
        if (driver)
            await driver.close();
    }
}
// initial run and periodic collection
collectNeo4jMetrics();
setInterval(collectNeo4jMetrics, 60000);
module.exports = { collectNeo4jMetrics };
//# sourceMappingURL=neo4jMetrics.js.map