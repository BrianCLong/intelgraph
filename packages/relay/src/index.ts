export interface SignalMessage {
  type: 'offer' | 'answer' | 'ice';
  payload: unknown;
}

export class RelayServer {
  private listeners: Record<string, ((msg: SignalMessage) => void)[]> = {};

  send(room: string, msg: SignalMessage): void {
    for (const fn of this.listeners[room] ?? []) {
      fn(msg);
    }
  }

  subscribe(room: string, handler: (msg: SignalMessage) => void): void {
    (this.listeners[room] ??= []).push(handler);
  }
}
