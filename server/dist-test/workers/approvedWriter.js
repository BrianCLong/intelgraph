"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApprovedWriter = startApprovedWriter;
/**
 * Polls APPROVED insights and commits them into Neo4j.
 * Idempotent: records audit + marks an "applied" flag inside payload if needed.
 */
const uuid_1 = require("uuid");
async function startApprovedWriter(db, neo4j) {
    setInterval(async () => {
        try {
            const pending = await db.insights.findMany({ status: "APPROVED" });
            if (!pending?.length)
                return;
            console.log(`Processing ${pending.length} approved insights...`);
            const session = neo4j.session();
            try {
                for (const ins of pending) {
                    const kind = ins.kind;
                    if (kind === "link_prediction") {
                        for (const p of ins.payload) {
                            await session.run(`MATCH (a {id:$u}), (b {id:$v})
                 MERGE (a)-[r:RELATED {source:'ai'}]->(b)
                 ON CREATE SET r.score = $score, r.jobId = $jobId, r.createdAt = datetime()
                 ON MATCH SET  r.score = greatest(r.score, $score)`, { u: p.u, v: p.v, score: p.score, jobId: ins.jobId });
                        }
                    }
                    else if (kind === "entity_resolution") {
                        // create SAME_AS edges; do not auto-merge nodes at this stage
                        for (const [a, b, score] of ins.payload) {
                            await session.run(`MATCH (x {id:$a}),(y {id:$b})
                 MERGE (x)-[r:SAME_AS {source:'ai'}]->(y)
                 ON CREATE SET r.score=$score, r.jobId=$jobId, r.createdAt=datetime()`, { a, b, score, jobId: ins.jobId });
                        }
                    }
                    else if (kind === "community_detect") {
                        // tag nodes with communityId (property); analysts can later promote to labels
                        for (const c of ins.payload) {
                            await session.run(`UNWIND $members as m
                 MATCH (n {id:m}) SET n.community=$cid`, { members: c.members, cid: c.community_id || c.communityId || null });
                        }
                    }
                    else if (kind === "nlp_entities") {
                        // store as node properties or separate Evidence nodes (skipping heavy writes by default)
                        // Here: audit only for now, can be enhanced to create entity nodes
                        for (const result of ins.payload) {
                            console.log(`NLP entities found for doc ${result.doc_id}: ${result.entities.length} entities`);
                        }
                    }
                    await db.audit.insert({
                        id: (0, uuid_1.v4)(),
                        type: "INSIGHT_APPLIED",
                        actorId: "writer",
                        createdAt: new Date().toISOString(),
                        meta: { insightId: ins.id, kind, payloadSize: ins.payload.length }
                    });
                    await db.insights.markApplied(ins.id);
                    console.log(`Applied insight ${ins.id} of kind ${kind}`);
                }
            }
            finally {
                await session.close();
            }
        }
        catch (error) {
            console.error('Error in approved writer:', error);
        }
    }, 2500);
}
//# sourceMappingURL=approvedWriter.js.map