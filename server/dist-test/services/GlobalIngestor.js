const OSINTFeedService = require("./OSINTFeedService");
const bus = require("../workers/eventBus");
class GlobalIngestor {
    constructor({ feedService } = {}) {
        this.feedService = feedService || new OSINTFeedService();
        this.bus = bus;
    }
    async pollAndQueue(subject) {
        const results = await this.feedService.poll(subject);
        results.forEach((r) => {
            this.bus.emit("raw-event", { source: r.source, data: r.data });
        });
        return results.length;
    }
    startPolling(subject, intervalMs = 60000) {
        this.pollAndQueue(subject);
        return setInterval(() => this.pollAndQueue(subject), intervalMs);
    }
}
module.exports = GlobalIngestor;
//# sourceMappingURL=GlobalIngestor.js.map