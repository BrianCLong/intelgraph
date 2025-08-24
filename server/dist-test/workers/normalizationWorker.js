const bus = require("./eventBus");
function normalize(raw) {
    const { source, data } = raw;
    const normalized = {
        source,
        payload: data,
        geo: data.location || null,
        receivedAt: new Date().toISOString(),
    };
    bus.emit("normalized-event", normalized);
}
bus.on("raw-event", normalize);
module.exports = { normalize };
//# sourceMappingURL=normalizationWorker.js.map