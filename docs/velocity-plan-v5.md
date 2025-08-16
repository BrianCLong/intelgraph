### IntelGraph — Velocity Plan v5: Real-Time Collaboration & Presence

**Owner:** Guy — Theme: multi-user editing with deterministic consistency

**Priorities**

1. CRDT/LWW versioned mutations + idempotency
2. Presence rooms + avatars
3. Conflict telemetry & UX toasts
4. Golden Path 2-user collab E2E

**PR scaffolds**

- `realtime/versioned-ops` — feat(realtime): CRDT/LWW with idempotent ops
- `realtime/presence` — feat(realtime): presence rooms + avatars
- `ui/conflict-toasts` — feat(ui): conflict/resolution toasts
- `test/e2e-collab` — test(e2e): 2-user collab path

**Acceptance criteria**

- Duplicate op ID → no-op; LWW resolves races
- Presence visible; ghost sessions <0.5%
- Conflict toast appears on collisions; audit trail
- Collab E2E passes in CI

**Observability**

- Metrics: `realtime_conflicts_total`, `idempotent_hits_total`, `socket_rtt_ms`
- Alerts: conflict rate >2% (15m), RTT >150ms (5m)

**Next steps**

- Cut branches, open draft PRs, integrate E2E into required checks
