const runs = new Map();
const events = new Map();
module.exports = {
    saveRun(run) { runs.set(run.id, run); },
    getRun(id) { return runs.get(id) || null; },
    pushEvent(runId, ev) {
        if (!events.has(runId))
            events.set(runId, []);
        events.get(runId).push(ev);
    },
    listEvents(runId) { return events.get(runId) || []; },
    updateRun(run) { runs.set(run.id, run); },
};
//# sourceMappingURL=store.memory.js.map