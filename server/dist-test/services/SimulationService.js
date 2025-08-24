class SimulationService {
    buildGraph(nodes, edges) {
        const nbrs = new Map();
        nodes.forEach((id) => nbrs.set(id, new Set()));
        edges.forEach((e) => {
            if (!nbrs.has(e.source))
                nbrs.set(e.source, new Set());
            if (!nbrs.has(e.target))
                nbrs.set(e.target, new Set());
            nbrs.get(e.source).add(e.target);
            nbrs.get(e.target).add(e.source);
        });
        return nbrs;
    }
    simulateSpread({ nodes, edges, seeds, steps = 5, probability = 0.2 }) {
        const nbrs = this.buildGraph(nodes, edges);
        const infected = new Set(seeds || []);
        const timeline = [];
        for (let step = 1; step <= steps; step++) {
            const newly = new Set();
            infected.forEach((u) => {
                const neis = nbrs.get(u) || new Set();
                neis.forEach((v) => {
                    if (!infected.has(v)) {
                        if (Math.random() < probability)
                            newly.add(v);
                    }
                });
            });
            newly.forEach((n) => infected.add(n));
            timeline.push({
                step,
                infected: Array.from(infected),
                newlyInfected: Array.from(newly),
            });
        }
        return { totalSteps: steps, timeline };
    }
}
module.exports = SimulationService;
//# sourceMappingURL=SimulationService.js.map