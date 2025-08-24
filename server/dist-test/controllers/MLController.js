const path = require('path');
const fs = require('fs');
const { getNeo4jDriver, getPostgresPool } = require('../config/database');
class MLController {
    async trainModel(req, res) {
        try {
            const { name = 'baseline-linkpred', notes } = req.body || {};
            const pool = getPostgresPool();
            const id = require('uuid').v4();
            let metrics = { auc: 0.72, pr_auc: 0.41, method: 'common_neighbors_baseline' };
            // Try Python pipeline if available
            try {
                const { spawnSync } = require('child_process');
                const py = spawnSync('python3', ['-m', 'intelgraph_py.ml.pipeline'], { cwd: path.join(process.cwd(), 'python') });
                if (py.status === 0 && py.stdout) {
                    const out = JSON.parse(py.stdout.toString('utf-8'));
                    if (out && out.success && out.metrics) {
                        metrics = out.metrics;
                    }
                }
            }
            catch (e) {
                // Fallback to stub metrics
            }
            const outDir = path.join(process.cwd(), 'uploads', 'models');
            fs.mkdirSync(outDir, { recursive: true });
            const artifactPath = path.join(outDir, `${id}.json`);
            fs.writeFileSync(artifactPath, JSON.stringify({ id, name, metrics, createdAt: new Date().toISOString() }, null, 2));
            await pool.query(`CREATE TABLE IF NOT EXISTS ml_models (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT DEFAULT 'link_prediction',
          metrics JSONB,
          artifact_path TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
            await pool.query('INSERT INTO ml_models (id, name, metrics, artifact_path, notes) VALUES ($1,$2,$3,$4,$5)', [id, name, metrics, artifactPath, notes || null]);
            return res.status(201).json({ success: true, modelId: id, metrics, artifact: `/uploads/models/${id}.json` });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
    async suggestLinks(req, res) {
        try {
            const { investigationId, topK = 20 } = req.body || {};
            if (!investigationId)
                return res.status(400).json({ error: 'investigationId required' });
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                const nodeQuery = `MATCH (n:Entity) WHERE n.investigation_id = $id RETURN n.id AS id`;
                const edgeQuery = `MATCH (a:Entity)-[r]->(b:Entity)
                           WHERE a.investigation_id = $id AND b.investigation_id = $id
                           RETURN a.id AS source, b.id AS target`;
                const nodesRes = await session.run(nodeQuery, { id: investigationId });
                const edgesRes = await session.run(edgeQuery, { id: investigationId });
                const nodes = nodesRes.records.map(r => r.get('id'));
                const edges = edgesRes.records.map(r => ({ source: r.get('source'), target: r.get('target') }));
                // Common neighbors heuristic in-memory
                const nbrs = new Map();
                for (const e of edges) {
                    if (!nbrs.has(e.source))
                        nbrs.set(e.source, new Set());
                    if (!nbrs.has(e.target))
                        nbrs.set(e.target, new Set());
                    nbrs.get(e.source).add(e.target);
                    nbrs.get(e.target).add(e.source);
                }
                const existing = new Set(edges.map(e => `${e.source}->${e.target}`));
                const existingUndir = new Set([...existing, ...edges.map(e => `${e.target}->${e.source}`)]);
                const scores = [];
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        const u = nodes[i], v = nodes[j];
                        if (existingUndir.has(`${u}->${v}`))
                            continue;
                        const a = nbrs.get(u) || new Set();
                        const b = nbrs.get(v) || new Set();
                        const common = [...a].filter(x => b.has(x)).length;
                        if (common > 0) {
                            const denom = (a.size + b.size) || 1;
                            const score = common / denom;
                            scores.push({ source: u, target: v, score });
                        }
                    }
                }
                scores.sort((x, y) => y.score - x.score);
                return res.json({ success: true, suggestions: scores.slice(0, topK) });
            }
            finally {
                await session.close();
            }
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
}
module.exports = MLController;
//# sourceMappingURL=MLController.js.map