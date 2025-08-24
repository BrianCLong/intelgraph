"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_subscriptions_1 = require("graphql-subscriptions");
const logger = logger.child({ name: 'ordered-pubsub' });
/**
 * OrderedPubSub wraps the standard PubSub implementation to provide
 * replayable, ordered events for subscribers. Events are buffered so that
 * reconnecting clients receive any missed events in the same order they were
 * originally published. Malformed payloads are logged and dropped.
 */
class OrderedPubSub {
    constructor(bufferSize = 100) {
        this.pubsub = new graphql_subscriptions_1.PubSub();
        this.buffers = new Map();
        this.seq = 0;
        this.bufferSize = bufferSize;
    }
    /**
       * Publish an event to a channel. Payloads that are null/undefined or not
       * objects are logged and discarded. Oldest events are dropped once the
       * per-channel buffer exceeds the configured size.
       */
    publish(trigger, payload) {
        if (payload === null || payload === undefined || typeof payload !== 'object') {
            logger.warn({ trigger, payload }, 'Dropped malformed subscription event payload');
            return;
        }
        const envelope = {
            seq: ++this.seq,
            ts: Date.now(),
            payload,
        };
        const buf = this.buffers.get(trigger) ?? [];
        if (buf.length >= this.bufferSize) {
            const dropped = buf.shift();
            logger.warn({ trigger, dropped }, 'Dropping oldest subscription event due to buffer overflow');
        }
        buf.push(envelope);
        this.buffers.set(trigger, buf);
        this.pubsub.publish(trigger, envelope);
    }
    /**
       * Return an async iterator that replays buffered events before emitting
       * new events from the underlying PubSub instance.
       */
    asyncIterator(triggers) {
        const triggerList = Array.isArray(triggers) ? triggers : [triggers];
        const baseIterator = this.pubsub.asyncIterator(triggerList);
        const buffered = triggerList
            .flatMap((t) => this.buffers.get(t) ?? [])
            .sort((a, b) => a.seq - b.seq);
        let index = 0;
        return {
            async next() {
                if (index < buffered.length) {
                    return { value: buffered[index++], done: false };
                }
                return baseIterator.next();
            },
            return() {
                return baseIterator.return ? baseIterator.return() : Promise.resolve({ value: undefined, done: true });
            },
            throw(error) {
                return baseIterator.throw ? baseIterator.throw(error) : Promise.reject(error);
            },
            [Symbol.asyncIterator]() {
                return this;
            },
        };
    }
}
exports.default = OrderedPubSub;
//# sourceMappingURL=ordered-pubsub.js.map