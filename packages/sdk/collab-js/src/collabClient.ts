import { EventEmitter } from 'events';
import type { Operation } from './crdt';

export interface Identity {
  userId: string;
  tenantId: string;
  sessionId: string;
}

export class CollabClient extends EventEmitter {
  private ws?: WebSocket;
  private id?: Identity;
  private hb?: ReturnType<typeof setInterval>;

  connect(url: string, identity: Identity): void {
    this.id = identity;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.send({ type: 'presence.join' });
      this.hb = setInterval(() => this.send({ type: 'heartbeat' }), 30000);
    };
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data.toString());
      this.emit(msg.type, msg);
    };
  }

  private send(msg: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const eventId = msg.eventId || crypto.randomUUID();
    this.ws.send(JSON.stringify({ ...msg, ...this.id, eventId }));
  }

  updateSelection(entityId: string, selection: unknown): void {
    this.send({ type: 'selection.update', entityId, selection });
  }

  addComment(entityId: string, text: string, commentId = crypto.randomUUID()): void {
    this.send({ type: 'comment.add', entityId, commentId, text });
  }

  editComment(entityId: string, commentId: string, op: Operation): void {
    this.send({ type: 'comment.edit', entityId, commentId, op });
  }

  typing(entityId: string): void {
    this.send({ type: 'typing', entityId });
  }
}

export { TextCRDT } from './crdt';
export { presenceReducer } from './reducers';
