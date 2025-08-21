#!/usr/bin/env bash
set -euo pipefail
REPO=${REPO:-BrianCLong/intelgraph}


# Milestone
MILESTONE_TITLE="Sprint 07 (Aug 25–Sep 5, 2025)"
MILESTONE_ID=$(gh api -X GET repos/$REPO/milestones | jq -r \
  ".[] | select(.title==\"$MILESTONE_TITLE\") | .number" || true)
if [[ -z "$MILESTONE_ID" ]]; then
  MILESTONE_ID=$(gh api -X POST repos/$REPO/milestones -f title="$MILESTONE_TITLE" -f state=open | jq -r .number)
fi


echo "Milestone #$MILESTONE_ID"


# Labels
if [[ -f .github/labels.json ]]; then
  while IFS= read -r row; do
    NAME=$(echo "$row" | jq -r .name); COLOR=$(echo "$row" | jq -r .color); DESC=$(echo "$row" | jq -r .description // "")
    gh label create "$NAME" --color "$COLOR" --description "$DESC" -R "$REPO" 2>/dev/null || gh label edit "$NAME" --color "$COLOR" --description "$DESC" -R "$REPO"
  done < <(jq -c '.[]' .github/labels.json)
fi


create_issue(){
  local TITLE="$1"; local BODY="$2"; local LABELS="$3";
  gh issue create -R "$REPO" \
    --title "$TITLE" \
    --body "$BODY" \
    --milestone "$MILESTONE_TITLE" \
    --label "$LABELS"
}


# Backlog items (subset from Sprint 07 Backlog)
create_issue "IG-721 — CSV Ingest Wizard" $'AC:\n- Navigate next/back, draft persists\n- Mapping validators block invalid\n- PII flags + license stored\nExit: nodes/edges contain PII+license attrs.' "type:feature,sprint-07,area:frontend,area:backend"


create_issue "IG-722 — NL→Cypher Preview" $'AC:\n- ≥95% syntactic validity\n- Returns cypher + cost/row estimate\n- No writes in preview' "type:feature,sprint-07,area:ai,area:graph,area:backend"


create_issue "IG-723 — Sandbox & Tri‑Pane UI" $'AC:\n- Read‑only sandbox w/ timeouts\n- Cytoscape + timeline + map sync ≤100ms' "type:feature,sprint-07,area:frontend,area:backend"


create_issue "IG-724 — Provenance & Claim Ledger" $'AC:\n- Claim/Evidence schema + indexes\n- Manifest export passes external verifier' "type:feature,sprint-07,area:backend,area:graph"


create_issue "IG-725 — Disclosure Bundle Export" $'AC:\n- GET /bundles/:id/export returns manifest + files\n- UI shows size/hash/license summary' "type:feature,sprint-07,area:frontend,area:backend"


create_issue "IG-726 — ABAC/OPA + Policy Labels" $'AC:\n- Deny/allow with human‑readable reason\n- Policy labels on nodes/edges; audit trail' "type:feature,sprint-07,area:backend,area:graph"


create_issue "IG-727 — Observability & Cost Guards" $'AC:\n- OTEL traces across gateway→copilot→graph\n- Grafana SLO p95 panel\n- Slow query killer + audit entries' "type:infra,sprint-07,area:devx,area:backend"


# Subtasks (illustrative — add more as needed)
create_issue "IG-721-1 — Wizard scaffold (FE)" $'AC:\n- Stepper nav, draft persistence' "sprint-07,area:frontend"
create_issue "IG-722-3 — Cost/row estimator (Graph)" $'AC:\n- Estimates within ±20% on 10 queries' "sprint-07,area:graph"
create_issue "IG-723-2 — Cytoscape wiring (FE)" $'AC:\n- Selections/brush sync across panes' "sprint-07,area:frontend"
create_issue "IG-724-3 — Manifest generator (BE)" $'AC:\n- Merkle over artifacts; verifier PASS' "sprint-07,area:backend"
create_issue "IG-726-1 — OPA integration (BE)" $'AC:\n- Deny/allow with reason logged' "sprint-07,area:backend"


printf "\nDone. Assign owners in the UI or extend script with --assignee flags.\n"
