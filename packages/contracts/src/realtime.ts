// Socket.IO event names & payloads (authoritative)
export const RT_NS = {
  COLLAB: '/collab',
} as const;

export const EVT = {
  PRESENCE: 'presence',          // user presence & cursors
  NOTE_EDIT: 'note.edit',        // rich‑text notes
  GRAPH_MUT: 'graph.mutate',     // add/update/delete nodes/edges
  GRAPH_LOCK: 'graph.lock',      // optimistic lock hints
  TOAST: 'ui.toast',
} as const;

export type MediaType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

export interface PresencePayload { userId: string; investigationId: string; cursor?: {x:number;y:number}; ts: string; }
export interface GraphMutatePayload {
  investigationId: string;
  ops: Array<
    | { kind: 'addNode'; node: { id: string; type: string; value: string; } }
    | { kind: 'addEdge'; edge: { id: string; source: string; target: string; type: string; } }
    | { kind: 'updateNode'; id: string; patch: Record<string, unknown> }
    | { kind: 'deleteNode'; id: string }
    | { kind: 'deleteEdge'; id: string }
  >;
  clientId: string; // for echo‑suppress
  ts: string;
}