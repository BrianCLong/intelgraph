package intelgraph.policy.export

default allow = false

deny[reason] {
  input.action == "export"
  some i
  s := input.dataset.sources[i]
  s.license in {"DISALLOW_EXPORT", "VIEW_ONLY", "SEAL_ONLY"}
  reason := sprintf(
    "Export blocked by license %s (owner: %s). See appeal workflow.",
    [s.license, s.owner],
  )
}

allow {
  input.action == "export"
  not deny[_]
}
