const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const SimulationService = require('../services/SimulationService');
const { getNeo4jDriver } = require('../config/database');
const router = express.Router();
const sim = new SimulationService();
router.use(ensureAuthenticated);
router.post('/spread', async (req, res) => {
    try {
        const { investigationId, seeds = [], steps = 5, probability = 0.2 } = req.body || {};
        if (!investigationId)
            return res.status(400).json({ error: 'investigationId required' });
        const driver = getNeo4jDriver();
        const session = driver.session();
        try {
            const nodeQ = `MATCH (n:Entity) WHERE n.investigation_id = $id RETURN n.id AS id`;
            const edgeQ = `MATCH (a:Entity)-[r]->(b:Entity) WHERE a.investigation_id = $id AND b.investigation_id = $id RETURN a.id AS source, b.id AS target`;
            const nodesRes = await session.run(nodeQ, { id: investigationId });
            const edgesRes = await session.run(edgeQ, { id: investigationId });
            const nodes = nodesRes.records.map(r => r.get('id'));
            const edges = edgesRes.records.map(r => ({ source: r.get('source'), target: r.get('target') }));
            const out = sim.simulateSpread({ nodes, edges, seeds, steps, probability });
            res.json({ success: true, ...out });
        }
        finally {
            await session.close();
        }
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
module.exports = router;
//# sourceMappingURL=simulationRoutes.js.map