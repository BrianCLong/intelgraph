"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubsub = void 0;
exports.pubsub = {
    io: null,
    init(io) { this.io = io; },
    publish(channel, payload) { if (this.io)
        this.io.to(channel).emit("event", payload); },
    asyncIterator(channel) {
        // Bridge to GraphQL subscription layer in your app
        return {
            async *[Symbol.asyncIterator]() { }
        };
    }
};
//# sourceMappingURL=pubsub.js.map