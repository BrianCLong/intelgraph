/**
 * Extremely small CRDT for plain text notes. Each update carries a timestamp
 * and last-writer-wins is applied across replicas.
 */
export interface NoteChange {
  content: string;
  timestamp: number;
}

export function mergeNote(a: NoteChange, b: NoteChange): NoteChange {
  return a.timestamp >= b.timestamp ? a : b;
}
