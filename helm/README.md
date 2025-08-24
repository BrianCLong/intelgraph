# Helm Canary Values

- File: `values-canary.yaml`
- Purpose: Enable 5% traffic canary, enforce persisted queries, disable introspection, and attach Prometheus SLO rules and OPA.
- Deploy: `helm upgrade --install intelgraph chart/ -f helm/values-canary.yaml`
- Acceptance: Canary annotations present; Prometheus rules loaded; OPA policies mounted.
