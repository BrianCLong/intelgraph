# Sync Protocol

The sync engine exchanges delta logs and blobs using a pull/push model.

## Delta Logs
Each delta log entry contains:
- Sequential id and parent hash.
- Operations for CRDT docs or graph mutations.
- Vector clock and signature.

Clients maintain a Merkle tree of applied deltas to detect divergence.

## Transport
Deltas are requested via GraphQL queries. Blobs are addressed by content id and retrieved through presigned URLs. When the gateway is unavailable, peers exchange deltas over WebRTC data channels using the same message format.
