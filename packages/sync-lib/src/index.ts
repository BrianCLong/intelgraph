export { mergeNote, NoteChange } from './crdt/notes.js';
export { MerkleTree } from './merkle/tree.js';

export interface Delta {
  id: string;
  data: string;
}

export class SyncClient {
  private deltas: Delta[] = [];

  queueDelta(delta: Delta): void {
    this.deltas.push(delta);
  }

  pending(): number {
    return this.deltas.length;
  }
}
