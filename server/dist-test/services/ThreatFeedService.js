const axios = require("axios");
/**
 * Service to fetch and apply live threat intelligence feeds
 */
class ThreatFeedService {
    constructor(logger, feedUrl) {
        this.logger = logger;
        this.feedUrl =
            feedUrl ||
                process.env.THREAT_FEED_URL ||
                "https://jsonplaceholder.typicode.com/todos";
    }
    async fetchLatestFeeds() {
        try {
            const { data } = await axios.get(this.feedUrl);
            const items = Array.isArray(data) ? data.length : 1;
            this.logger.info(`Fetched threat feed items: ${items}`);
            return data;
        }
        catch (error) {
            this.logger.error(`Failed to fetch threat feed: ${error.message}`);
            return [];
        }
    }
    updateBehaviorModels(environment, feeds) {
        if (!environment || !Array.isArray(environment.nodes))
            return;
        environment.nodes.forEach((node) => {
            const match = feeds.find((f) => f.targetId === node.id);
            if (match) {
                node.simulationData = {
                    ...node.simulationData,
                    liveThreatScore: match.score || 0,
                };
            }
        });
    }
}
module.exports = ThreatFeedService;
//# sourceMappingURL=ThreatFeedService.js.map