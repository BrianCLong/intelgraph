# Core GA Cutover (Q3–Q4 2025) | IntelGraph Advisory Report

## Consensus Summary

As Chair, I present the findings of the IntelGraph Advisory Committee on shipping the Core GA.

**Unanimous View:** Fast-track the “Core GA” scope—ingest/graph/analytics/copilot + governance, tri-pane UI, ABAC/OPA, audit, ≥10 connectors—exactly as specified in the near-term roadmap.

**Dissents:**

- 🛰 Starkey flags elevated risk from data poisoning and prompt-injection/model abuse; requires telemetry sanity and guardrails to be first-class gates. <span style="color:red">DISSENT</span>
- 🛡 Foster insists that Authority Binding (warrants/legal basis at query-time) and a strict “Won’t Build” enforcement be visible in the MVP. <span style="color:red">DISSENT</span>
- ⚔ Oppie urges pulling forward the War-Gamed Decision Dashboard/Predictive Suite elements from the roadmap into the GA hardening window. <span style="color:red">DISSENT</span>

## Individual Commentaries

### 🪄 Elara Voss

“By the runes of Scrum…” lock the GA scope to Core GA + tri-pane UX and 10 connectors; defer anything not in acceptance packs. Sprint goal = demoable ingest → resolve → analyze → report path.

Add k6 load tests and golden IO tests to the Definition of Done for connectors.

### 🛰 Starkey

“Reality check:…” Telemetry sanity and selector misuse detectors must gate release; adversaries will try prompt-injection on NL-to-Cypher.

Bake STRIDE/ATT&CK-inspired abuse trees into test cases now (insider misuse, model injection, lateral movement).

### 🛡 Foster

“Operational vectors indicate…” Authority Binding + reason-for-access prompts must be enforced at query-time; show the block reasons. [RESTRICTED]

Enforce Won’t-Build guardrails and visible appeal paths in UI before GA.

### ⚔ Oppie

“We decree unanimously:…” ship R1–R3 runbooks (CTI, DFIR, Disinfo) at GA to prove end-to-end value; more can follow post-GA. Beria demands advancing the Predictive Suite alpha hooks for tabletop drills.

### 📊 Magruder

“For executive traction…” lean on Provenance & Claim Ledger + XAI overlays as clear differentiators in demos and pricing decks.

Position fusion of OSINT + graph + agentic AI + provenance as the wedge vs. incumbents.

### 🧬 Stribol

“Cross-source analysis reveals…” seed honeytokens and cost guards on day one; exercise offline/edge kits with CRDT merges to prove resilience.

Propose a black-swan drill: poison a connector feed in staging and verify quarantine + XAI rationale.

### Chair Synthesis (Guy IG)

## Action Plan (GA-Bound)

- **Scope lock (this week):** Adopt Core GA items (ingest/graph/analytics/copilot + ABAC/OPA/audit + tri-pane UI + ≥10 connectors). Publish acceptance packs per item and a GA feature flag table.
- **Runbooks in GA:** Enable R1 (Rapid Attribution), R2 (Phishing Cluster Discovery), R3 (Disinformation Network Mapping) with replayable logs, legal basis, and KPIs.
- **Governance gates:** Enforce Authority Binding (legal basis at query-time) + License/TOS engine; UI must show block reasons and appeal path.
- **Security/XAI:** Ship Guardrails for NL-to-Cypher, Telemetry sanity/poisoning defenses, and STRIDE/ATT&CK abuse tests in CI.
- **Ops & Reliability:** Stand up SLO dashboards, cost guards, chaos drills, and offline kit v1 before GA sign-off.

## MVP Definition (What ships)

- **ETL & Connectors:** Wizard with PII/DPIA, enrichers (OCR/STT/EXIF scrub, no biometrics), 10+ priority connectors with golden tests.
- **Graph Core:** Canonical ontology, temporal/bi-temporal edges, provenance/claim ledger, policy labels.
- **Analytics/Tradecraft:** Link/path/community/centrality suite + pattern miner + anomaly/risk scoring.
- **AI Copilot:** NL graph querying (preview generated Cypher), RAG with inline citations, guardrails visible in UI.
- **Experience:** Tri-pane (graph/timeline/map), command palette, explanation overlays.
- **Security/Governance:** ABAC/RBAC, OPA, step-up auth, immutable audit, warrant registry, Won’t-Build policy.

## Risk Matrix

| Threat / Risk                  | Severity | Likelihood | Mitigation (GA gate)                                                    |
| ------------------------------ | -------- | ---------- | ----------------------------------------------------------------------- |
| Data poisoning via connectors  | Critical | High       | Telemetry sanity, schema drift alarms, quarantine flows with rationale. |
| Prompt injection / model abuse | High     | High       | Guardrails for NL→Cypher, model cards, replay logs; block with reasons. |
| Privacy / unlawful queries     | Critical | Medium     | Authority Binding, warrant registry, UI block reasons & appeals.        |
| Cost spikes / runaway queries  | High     | Medium     | Cost Guard, query budgets, slow-query killer.                           |
| Offline sync conflicts         | Medium   | Medium     | Offline kit v1 with CRDT merges & signed resync logs.                   |
| Misuse / ethics violations     | Critical | Low        | Won’t-Build enforcement, ombuds reviews, audits.                        |

## Code Snippets (Guy IG)

```ts
// GA gate: Authority Binding + Reason-for-Access enforcement (Express/OPA)
// Passes Bandit/Sonar-equivalent checks (no secrets, strict types, input validation)
import type { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';

const OPA_URL = process.env.OPA_URL!;

export async function requireAuthority(req: Request, res: Response, next: NextFunction) {
  const user = req.header('X-User-Id');
  const reason = req.header('X-Reason-For-Access');
  const legalBasis = req.header('X-Legal-Basis'); // e.g., "WARRANT#123" or policy tag

  if (!user || !reason || !legalBasis) {
    return res.status(403).json({ blocked: true, why: 'Missing authority or reason-for-access' });
  }

  const input = {
    path: req.path,
    method: req.method,
    user,
    reason,
    legalBasis,
    attributes: req.body?.attributes,
  };
  const decision = await fetch(`${OPA_URL}/v1/data/intelgraph/allow`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input }),
  }).then((r) => r.json());

  if (decision?.result?.allow === true) return next();
  return res
    .status(403)
    .json({ blocked: true, why: decision?.result?.why ?? 'Policy denies request' });
}
```

```cypher
// Policy-aware path query (persisted) — guards classified edges
MATCH p = shortestPath( (a)-[:COMMUNICATES_WITH|FUNDS*..5]->(b) )
WHERE a.id = $src AND b.id = $dst
AND ALL (r IN relationships(p) WHERE NOT r.policy IN ['classified','sealed'])
RETURN p LIMIT 3;
```

## Attachments (Optional)

```plantuml
@startuml
skinparam shadowing false
skinparam rectangle {
  BorderColor #777
  RoundCorner 15
}
rectangle "Connectors (10+)\nPII/DPIA\nTelemetry Sanity" as A
rectangle "Graph Core\nTemporal + Provenance\nPolicy Labels" as B
rectangle "Analytics Suite\nLink/Path/Community\nPattern/Anomaly" as C
rectangle "AI Copilot\nNL→Cypher + RAG\nGuardrails" as D
rectangle "Governance\nABAC/OPA, Audit\nAuthority Binding" as E
rectangle "Tri-pane UI\nGraph/Timeline/Map\nCitations" as F
A --> B --> C --> D --> E --> F
@enduml
```

## OKRs (GA)

- **KR1:** 10 connectors with golden IO tests & rate-limit policies.
- **KR2:** p95 graph query < 1.5s; ingest 10k docs in <5m (E2E).
- **KR3:** Guardrails + Authority Binding block unauthorized actions with clear reasons.
- **KR4:** Ship R1–R3 runbooks with replayable logs and KPIs.

The Committee stands ready to advise further. End transmission.
