const bus = require("../workers/eventBus");
class RedTeamSimulator {
    constructor({ scenarios } = {}) {
        this.bus = bus;
        this.scenarios = scenarios || {
            "phishing-campaign": () => ({
                type: "phishing",
                entity: "CorpX",
                severity: "medium",
                location: { lat: 0, lon: 0 },
            }),
        };
    }
    inject(name) {
        const generator = this.scenarios[name];
        if (!generator)
            throw new Error(`Unknown scenario: ${name}`);
        const payload = generator();
        this.bus.emit("raw-event", { source: "red-team", data: payload });
        return payload;
    }
}
module.exports = RedTeamSimulator;
//# sourceMappingURL=RedTeamSimulator.js.map