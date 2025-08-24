const fetch = require("node-fetch");
const { getNeo4jDriver, getPostgresPool } = require("../config/database");
const logger = require("../utils/logger");
class OSINTService {
    constructor() {
        this.logger = logger;
        this.driver = getNeo4jDriver();
        this.pool = getPostgresPool();
    }
    async enrichFromWikipedia({ entityId, title }) {
        const t = title?.trim();
        if (!t && !entityId)
            throw new Error("Provide title or entityId");
        let page;
        try {
            const res = await fetch("https://en.wikipedia.org/w/api.php?" +
                new URLSearchParams({
                    action: "query",
                    prop: "extracts|info",
                    exintro: "1",
                    explaintext: "1",
                    inprop: "url",
                    format: "json",
                    titles: t,
                }));
            const data = await res.json();
            const pages = data?.query?.pages || {};
            page = Object.values(pages)[0];
        }
        catch (e) {
            this.logger.error("Wikipedia fetch failed", e);
            throw e;
        }
        if (!page)
            throw new Error("No page");
        // Persist to Neo4j
        const session = this.driver.session();
        let updated;
        try {
            const props = {
                label: page.title,
                wikipediaUrl: page.fullurl,
                summary: page.extract,
                updatedAt: Date.now(),
            };
            const q = `
        MERGE (n:Entity {id: $id})
        SET n += $props
        RETURN n as node
      `;
            const id = entityId || `wiki:${page.pageid}`;
            const result = await session.run(q, { id, props });
            updated = result.records[0]?.get("node").properties;
        }
        finally {
            await session.close();
        }
        // Provenance
        try {
            await this.pool.query(`INSERT INTO provenance (resource_type, resource_id, source, uri, extractor, metadata)
         VALUES ($1,$2,$3,$4,$5,$6)`, [
                "entity",
                updated.id,
                "wikipedia",
                page.fullurl,
                "osint.wikipedia",
                { pageid: page.pageid, title: page.title },
            ]);
        }
        catch (e) {
            this.logger.warn("Failed to record provenance", e);
        }
        return updated;
    }
}
module.exports = OSINTService;
//# sourceMappingURL=OsintService.js.map