import { PubSub } from 'graphql-subscriptions';
import logger from '../../config/logger';

interface EventEnvelope<T> {
  seq: number;
  ts: number;
  payload: T;
}

const logger = logger.child({ name: 'ordered-pubsub' });

/**
 * OrderedPubSub wraps the standard PubSub implementation to provide
 * replayable, ordered events for subscribers. Events are buffered so that
 * reconnecting clients receive any missed events in the same order they were
 * originally published. Malformed payloads are logged and dropped.
 */
export default class OrderedPubSub {
  private readonly pubsub: PubSub;
  private readonly buffers: Map<string, EventEnvelope<any>[]>;
  private seq: number;
  private readonly bufferSize: number;

  constructor(bufferSize = 100) {
    this.pubsub = new PubSub();
    this.buffers = new Map();
    this.seq = 0;
    this.bufferSize = bufferSize;
  }

  /**
     * Publish an event to a channel. Payloads that are null/undefined or not
     * objects are logged and discarded. Oldest events are dropped once the
     * per-channel buffer exceeds the configured size.
     */
  publish<T>(trigger: string, payload: T): void {
    if (payload === null || payload === undefined || typeof payload !== 'object') {
      logger.warn({ trigger, payload }, 'Dropped malformed subscription event payload');
      return;
    }

    const envelope: EventEnvelope<T> = {
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
  asyncIterator<T>(triggers: string | string[]) {
    const triggerList = Array.isArray(triggers) ? triggers : [triggers];
    const baseIterator = this.pubsub.asyncIterator<EventEnvelope<T>>(triggerList);

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
      throw(error: any) {
        return baseIterator.throw ? baseIterator.throw(error) : Promise.reject(error);
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }
}

